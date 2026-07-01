import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { centsToDollars } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { SaleContextHeader } from "@/components/sale-context-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function SaleReportPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId)) {
    notFound();
  }

  const sale = await prisma.estateSale.findUnique({
    where: { id: saleId },
    include: {
      assignedTeam: true,
      soldItems: {
        include: {
          reportCategory: true,
          submittedTeam: true
        },
        orderBy: {
          finalSoldPriceCents: "desc"
        }
      }
    }
  });

  if (!sale) {
    notFound();
  }

  const paramsValue = (await searchParams) ?? {};
  const includeUnderThreshold = paramsValue.include_under_threshold === "true";
  const includeArchived = paramsValue.include_archived === "true";
  const hideUncategorized = paramsValue.hide_uncategorized === "true";

  const filteredItems = sale.soldItems
    .filter((item) => includeArchived || !item.isArchived)
    .filter(
      (item) =>
        includeUnderThreshold ||
        item.finalSoldPriceCents >= sale.reportThresholdCents
    )
    .filter((item) => !hideUncategorized || item.reportCategoryId !== null);

  const groups = new Map<
    string,
    {
      name: string;
      sortOrder: number;
      totalCents: number;
      items: typeof filteredItems;
    }
  >();

  for (const item of filteredItems) {
    const name = item.reportCategory?.name ?? "Uncategorized";
    const sortOrder = item.reportCategory?.sortOrder ?? 9999;
    const group =
      groups.get(name) ??
      groups
        .set(name, {
          name,
          sortOrder,
          totalCents: 0,
          items: []
        })
        .get(name)!;

    group.totalCents += item.finalSoldPriceCents;
    group.items.push(item);
  }

  const sortedGroups = [...groups.values()].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.name.localeCompare(b.name);
  });

  const totalCents = filteredItems.reduce(
    (sum, item) => sum + item.finalSoldPriceCents,
    0
  );

  const toggleHref = (key: string, value: boolean) => {
    const query = new URLSearchParams();
    if (key === "include_under_threshold" ? value : includeUnderThreshold) {
      query.set("include_under_threshold", "true");
    }
    if (key === "include_archived" ? value : includeArchived) {
      query.set("include_archived", "true");
    }
    if (key === "hide_uncategorized" ? value : hideUncategorized) {
      query.set("hide_uncategorized", "true");
    }
    const suffix = query.toString();
    return `/sales/${sale.id}/report${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <AppShell user={user} focus>
      <SaleContextHeader sale={sale} active="report" />

      {/* Total readout — the headline number for the client summary. */}
      <Card className="mb-4 overflow-hidden">
        <CardContent className="flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Grouped total
            </p>
            <p className="price text-4xl font-bold leading-none tracking-tight sm:text-5xl">
              {centsToDollars(totalCents)}
            </p>
          </div>
          <div className="flex gap-5 text-sm">
            <div>
              <div className="price text-xl font-bold">{filteredItems.length}</div>
              <div className="text-xs text-muted-foreground">items</div>
            </div>
            <div>
              <div className="price text-xl font-bold">{sortedGroups.length}</div>
              <div className="text-xs text-muted-foreground">categories</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          variant={includeUnderThreshold ? "secondary" : "outline"}
        >
          <Link href={toggleHref("include_under_threshold", !includeUnderThreshold)}>
            {includeUnderThreshold ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
            Under threshold
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={includeArchived ? "secondary" : "outline"}
        >
          <Link href={toggleHref("include_archived", !includeArchived)}>
            {includeArchived ? "Hide archived" : "Show archived"}
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={hideUncategorized ? "secondary" : "outline"}
        >
          <Link href={toggleHref("hide_uncategorized", !hideUncategorized)}>
            {hideUncategorized ? "Show uncategorized" : "Hide uncategorized"}
          </Link>
        </Button>
      </div>

      {sortedGroups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-display text-lg font-bold">No report rows</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add sold items or adjust the filters above.
            </p>
            <Button asChild variant="accent" className="mt-3">
              <Link href={`/sales/${sale.id}/quick-entry`}>Add items</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <Card key={group.name} className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold">{group.name}</h2>
                  {group.name === "Uncategorized" ? (
                    <Badge variant="warning">Needs cleanup</Badge>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="price font-bold">
                    {centsToDollars(group.totalCents)}
                  </span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {group.items.length} item{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {group.items
                  .slice()
                  .sort((a, b) => b.finalSoldPriceCents - a.finalSoldPriceCents)
                  .map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                        item.isArchived ? "opacity-60" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {item.itemDescription}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.submittedTeam.name}
                          {item.isArchived ? " · archived" : ""}
                        </div>
                      </div>
                      <span className="price shrink-0 font-bold">
                        {centsToDollars(item.finalSoldPriceCents)}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
