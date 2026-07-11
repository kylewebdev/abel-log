import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSale } from "@/lib/permissions";
import { centsToDollars, saleTitle, shortDate } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { SaleContextHeader } from "@/components/sale-context-header";
import { PrintButton } from "@/components/print-button";
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
        orderBy: {
          finalSoldPriceCents: "desc"
        }
      }
    }
  });

  if (!sale) {
    notFound();
  }

  if (!canAccessSale(user, sale)) {
    redirect("/sales?error=permission");
  }

  const paramsValue = (await searchParams) ?? {};
  const includeUnderThreshold = paramsValue.include_under_threshold === "true";
  const includeArchived = paramsValue.include_archived === "true";

  const filteredItems = sale.soldItems
    .filter((item) => includeArchived || !item.isArchived)
    .filter(
      (item) =>
        includeUnderThreshold ||
        item.finalSoldPriceCents >= sale.reportThresholdCents
    )
    .sort((a, b) => b.finalSoldPriceCents - a.finalSoldPriceCents);

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
    const suffix = query.toString();
    return `/sales/${sale.id}/report${suffix ? `?${suffix}` : ""}`;
  };

  const generatedOn = shortDate(new Date());

  return (
    <AppShell user={user} focus>
      <SaleContextHeader sale={sale} active="report" />

      {/* Client-facing letterhead — shown only in print / PDF exports. */}
      <div className="mb-4 hidden print:block">
        <p className="stamp text-[0.7rem] text-muted-foreground">
          items sold for 25 or greater
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {saleTitle(sale)}
        </h1>
        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
          <div>{sale.addressRaw}</div>
          {sale.clientName ? <div>Client: {sale.clientName}</div> : null}
          {sale.startDate || sale.endDate ? (
            <div>
              Sale dates: {shortDate(sale.startDate)} – {shortDate(sale.endDate)}
            </div>
          ) : null}
          <div>Generated {generatedOn}</div>
        </div>
        <div className="perforated mt-3" />
      </div>

      {/* Total readout — the headline number for the client summary. */}
      <Card className="mb-4 overflow-hidden break-inside-avoid print:shadow-none">
        <CardContent className="flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Report total
            </p>
            <p className="price text-4xl font-bold leading-none tracking-tight sm:text-5xl">
              {centsToDollars(totalCents)}
            </p>
          </div>
          <div className="text-sm">
            <div>
              <div className="price text-xl font-bold">{filteredItems.length}</div>
              <div className="text-xs text-muted-foreground">items</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <PrintButton />
      </div>

      {filteredItems.length === 0 ? (
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
        <Card className="overflow-hidden print:overflow-visible print:shadow-none">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5 print:break-after-avoid-page">
            <h2 className="font-display text-base font-bold">Itemized list</h2>
            <span className="text-xs text-muted-foreground">
              Sorted highest to lowest
            </span>
          </div>
          <ul className="divide-y divide-border">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 break-inside-avoid px-4 py-2.5 ${
                  item.isArchived ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {item.itemDescription}
                    </span>
                    {item.isArchived ? <Badge variant="muted">Archived</Badge> : null}
                  </div>
                </div>
                <span className="price shrink-0 font-bold">
                  {centsToDollars(item.finalSoldPriceCents)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
