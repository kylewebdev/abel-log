import Link from "next/link";
import { Archive, Check, Edit3, RotateCcw, Search } from "lucide-react";
import { ReviewStatus } from "@prisma/client";
import { requireManagement } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  approveSoldItemAction,
  archiveSoldItemAction,
  createAliasAction,
  restoreSoldItemAction
} from "@/lib/actions";
import { centsToDollars, saleTitle, shortDate } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/status-message";
import { cn } from "@/lib/utils";

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(
  base: string,
  params: Record<string, string | number | null | undefined>
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return `${base}${suffix ? `?${suffix}` : ""}`;
}

export default async function ManagementReviewPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireManagement();
  const params = (await searchParams) ?? {};
  const filter = readParam(params, "filter") ?? "needs-review";
  const saleId = Number(readParam(params, "saleId"));
  const teamId = Number(readParam(params, "teamId"));
  const selectedSaleId = Number.isInteger(saleId) && saleId > 0 ? saleId : null;
  const selectedTeamId = Number.isInteger(teamId) && teamId > 0 ? teamId : null;

  const baseWhere = {
    ...(selectedSaleId ? { estateSaleId: selectedSaleId } : {}),
    ...(selectedTeamId ? { submittedTeamId: selectedTeamId } : {})
  };

  const where =
    filter === "missing-category"
      ? { ...baseWhere, isArchived: false, reportCategoryId: null }
      : filter === "archived"
        ? { ...baseWhere, isArchived: true }
        : filter === "recent"
          ? baseWhere
          : filter === "under-threshold"
            ? { ...baseWhere, isArchived: false }
            : {
                ...baseWhere,
                isArchived: false,
                reviewStatus: ReviewStatus.NEEDS_REVIEW
              };

  const [itemsRaw, categories, teams, sales] = await Promise.all([
    prisma.soldItem.findMany({
      where,
      include: {
        estateSale: true,
        submittedTeam: true,
        reportCategory: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    }),
    prisma.reportCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.team.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.estateSale.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  const items =
    filter === "under-threshold"
      ? itemsRaw.filter(
          (item) =>
            item.finalSoldPriceCents < item.estateSale.reportThresholdCents
        )
      : itemsRaw;

  const currentHref = buildHref("/management/review", {
    filter,
    saleId: selectedSaleId,
    teamId: selectedTeamId
  });

  const filters = [
    ["needs-review", "Needs review"],
    ["missing-category", "Missing category"],
    ["archived", "Archived"],
    ["under-threshold", "Under threshold"],
    ["recent", "Recently added"]
  ] as const;

  const splitView = filter === "needs-review";
  const autoAssigned = items.filter((item) => item.reportCategoryId !== null);
  const unassigned = items.filter((item) => item.reportCategoryId === null);

  const renderItem = (item: (typeof items)[number]) => (
    <li
      key={item.id}
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        item.isArchived && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold leading-snug">
            {item.itemDescription}
          </div>
          <Link
            href={`/sales/${item.estateSaleId}`}
            className="mt-0.5 block truncate text-xs font-semibold text-accent hover:underline"
          >
            {saleTitle(item.estateSale)}
          </Link>
          <div className="text-xs text-muted-foreground">
            {item.submittedTeam.name} · {shortDate(item.createdAt)} ·{" "}
            {item.teamLabel ? `“${item.teamLabel}”` : "no label"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="price text-lg font-bold">
            {centsToDollars(item.finalSoldPriceCents)}
          </div>
          {item.finalSoldPriceCents <
          item.estateSale.reportThresholdCents ? (
            <Badge variant="muted" className="mt-1">
              Under min
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <form
          action={approveSoldItemAction}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="next" value={currentHref} />
          <div className="flex-1 space-y-1.5">
            <Label htmlFor={`cat-${item.id}`}>Report category</Label>
            <Select
              id={`cat-${item.id}`}
              name="reportCategoryId"
              defaultValue={
                item.reportCategoryId ? String(item.reportCategoryId) : ""
              }
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="accent" className="sm:w-auto">
            <Check aria-hidden="true" />
            Approve
          </Button>
        </form>

        {item.teamLabel ? (
          <form
            action={createAliasAction}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="aliasText" value={item.teamLabel} />
            <input
              type="hidden"
              name="teamId"
              value={item.submittedTeamId}
            />
            <input type="hidden" name="next" value={currentHref} />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`alias-${item.id}`}>
                Map “{item.teamLabel}” →
              </Label>
              <Select id={`alias-${item.id}`} name="reportCategoryId">
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline" className="sm:w-auto">
              Save alias
            </Button>
          </form>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/items/${item.id}/edit?next=${encodeURIComponent(currentHref)}`}
            >
              <Edit3 aria-hidden="true" />
              Edit
            </Link>
          </Button>
          {!item.isArchived ? (
            <form action={archiveSoldItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="next" value={currentHref} />
              <Button type="submit" variant="ghost" size="sm">
                <Archive aria-hidden="true" />
                Archive
              </Button>
            </form>
          ) : (
            <form action={restoreSoldItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="next" value={currentHref} />
              <Button type="submit" variant="ghost" size="sm">
                <RotateCcw aria-hidden="true" />
                Restore
              </Button>
            </form>
          )}
        </div>
      </div>
    </li>
  );

  return (
    <AppShell user={user}>
      <StatusMessage params={params} />

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Management
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Review queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clean categories, approve entries, and archive mistakes before reporting.
        </p>
      </div>

      <Card className="mb-5">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {filters.map(([key, label]) => (
              <Link
                key={key}
                href={buildHref("/management/review", {
                  filter: key,
                  saleId: selectedSaleId,
                  teamId: selectedTeamId
                })}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-md border px-3 text-sm font-bold transition-colors",
                  filter === key
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            action="/management/review"
          >
            <input type="hidden" name="filter" value={filter} />
            <div className="space-y-1.5">
              <Label htmlFor="saleId">Sale</Label>
              <Select id="saleId" name="saleId" defaultValue={selectedSaleId ?? ""}>
                <option value="">All sales</option>
                {sales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {saleTitle(sale)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamId">Team</Label>
              <Select id="teamId" name="teamId" defaultValue={selectedTeamId ?? ""}>
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full sm:w-auto">
                <Search aria-hidden="true" />
                Apply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {splitView ? (
        <div className="space-y-7">
          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">Auto-assigned</h2>
              <Badge variant="success">{autoAssigned.length}</Badge>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              An alias set the category. Approve if it looks right.
            </p>
            {autoAssigned.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nothing waiting with a category.
              </p>
            ) : (
              <ul className="space-y-3">{autoAssigned.map(renderItem)}</ul>
            )}
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">Needs a category</h2>
              <Badge variant="warning">{unassigned.length}</Badge>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              No alias matched. Pick a category, then “Save alias” to auto-assign
              it next time.
            </p>
            {unassigned.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Everything has a category.
              </p>
            ) : (
              <ul className="space-y-3">{unassigned.map(renderItem)}</ul>
            )}
          </section>
        </div>
      ) : (
        <>
          <h2 className="mb-2 font-display text-lg font-bold">
            {items.length} {items.length === 1 ? "entry" : "entries"}
          </h2>
          {items.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No items match this queue.
            </p>
          ) : (
            <ul className="space-y-3">{items.map(renderItem)}</ul>
          )}
        </>
      )}
    </AppShell>
  );
}
