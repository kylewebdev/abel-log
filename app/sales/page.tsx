import Link from "next/link";
import {
  Archive,
  CalendarDays,
  Eye,
  EyeOff,
  FileBarChart2,
  MapPin,
  NotebookPen,
  Plus,
  RotateCcw,
  Rows3
} from "lucide-react";
import { Role, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { StatusMessage } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { centsToDollars, saleDateRange, saleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { archiveEstateSaleAction } from "@/lib/actions";
import {
  INCLUDE_ARCHIVED_SALES_PARAM,
  shouldIncludeArchivedSales
} from "@/lib/sale-list";

async function getListedSales(
  user: { role: Role; teamId: number | null },
  includeArchived: boolean
) {
  return prisma.estateSale.findMany({
    where: {
      ...(!includeArchived
        ? { status: { not: SaleStatus.ARCHIVED } }
        : {}),
      ...(user.role === Role.TEAM ? { assignedTeamId: user.teamId ?? -1 } : {})
    },
    include: {
      assignedTeam: true,
      soldItems: {
        select: {
          id: true,
          isArchived: true
        }
      }
    }
  });
}

type ListedSale = Awaited<ReturnType<typeof getListedSales>>[number];
type SaleTiming =
  | "Active"
  | "Upcoming"
  | "Dates needed"
  | "Ended"
  | "Completed"
  | "Archived";

const UNDATED_SORT_VALUE = Number.MAX_SAFE_INTEGER;
const MISSING_PAST_SORT_VALUE = Number.MIN_SAFE_INTEGER;

function startOfLocalDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function compareNumbers(a: number, b: number) {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

function dateSortValue(
  value: Date | null | undefined,
  fallback = UNDATED_SORT_VALUE
) {
  return value ? startOfLocalDay(value).getTime() : fallback;
}

function hasEndDatePassed(sale: ListedSale, today: Date) {
  return dateSortValue(sale.endDate) < today.getTime();
}

function isCurrentOrUpcomingSale(sale: ListedSale, today: Date) {
  return sale.status === SaleStatus.ACTIVE && !hasEndDatePassed(sale, today);
}

function currentSaleSortValue(sale: ListedSale) {
  return dateSortValue(sale.startDate ?? sale.endDate);
}

function endedSaleSortValue(sale: ListedSale) {
  return dateSortValue(
    sale.endDate ?? sale.startDate,
    MISSING_PAST_SORT_VALUE
  );
}

function sortCurrentSales(a: ListedSale, b: ListedSale) {
  return (
    compareNumbers(currentSaleSortValue(a), currentSaleSortValue(b)) ||
    compareNumbers(dateSortValue(a.endDate), dateSortValue(b.endDate)) ||
    compareNumbers(b.createdAt.getTime(), a.createdAt.getTime())
  );
}

function sortEndedSales(a: ListedSale, b: ListedSale) {
  return (
    compareNumbers(endedSaleSortValue(b), endedSaleSortValue(a)) ||
    compareNumbers(dateSortValue(a.startDate), dateSortValue(b.startDate)) ||
    compareNumbers(b.createdAt.getTime(), a.createdAt.getTime())
  );
}

function sortArchivedSales(a: ListedSale, b: ListedSale) {
  return (
    compareNumbers(
      b.archivedAt?.getTime() ?? b.updatedAt.getTime(),
      a.archivedAt?.getTime() ?? a.updatedAt.getTime()
    ) || compareNumbers(b.createdAt.getTime(), a.createdAt.getTime())
  );
}

function saleTiming(sale: ListedSale, today: Date): SaleTiming {
  if (sale.status === SaleStatus.ARCHIVED) {
    return "Archived";
  }

  if (sale.status === SaleStatus.COMPLETED) {
    return "Completed";
  }

  if (hasEndDatePassed(sale, today)) {
    return "Ended";
  }

  if (!sale.startDate && !sale.endDate) {
    return "Dates needed";
  }

  if (sale.startDate && dateSortValue(sale.startDate) > today.getTime()) {
    return "Upcoming";
  }

  return "Active";
}

function SaleCard({
  sale,
  timing,
  canManageSales,
  includeArchived
}: {
  sale: ListedSale;
  timing: SaleTiming;
  canManageSales: boolean;
  includeArchived: boolean;
}) {
  const activeEntries = sale.soldItems.filter((item) => !item.isArchived);
  const isArchived = timing === "Archived";
  const isEnded = timing === "Ended" || timing === "Completed" || isArchived;
  const timingBadgeVariant =
    timing === "Ended" || timing === "Completed" || isArchived
      ? "muted"
      : timing === "Upcoming"
        ? "accent"
        : timing === "Dates needed"
          ? "warning"
          : "success";

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden p-0 transition-colors hover:border-foreground/30",
        isEnded && "bg-card/70"
      )}
    >
      <Link
        href={`/sales/${sale.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${saleTitle(sale)}`}
      />

      <div className="p-4 pb-3">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={timingBadgeVariant}>{timing}</Badge>
            <Badge variant="outline">{sale.assignedTeam?.name ?? "Unassigned"}</Badge>
          </div>
          {canManageSales ? (
            <form action={archiveEstateSaleAction} className="relative z-10 shrink-0">
              <input type="hidden" name="saleId" value={sale.id} />
              <input type="hidden" name="returnTo" value="sales" />
              <input
                type="hidden"
                name="includeArchived"
                value={includeArchived ? "true" : "false"}
              />
              <Button type="submit" size="sm" variant="ghost">
                {isArchived ? (
                  <>
                    <RotateCcw aria-hidden="true" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive aria-hidden="true" />
                    Archive
                  </>
                )}
              </Button>
            </form>
          ) : null}
        </div>

        <h2 className="font-display text-lg font-bold leading-tight">
          {saleTitle(sale)}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{saleDateRange(sale)}</span>
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="price text-3xl font-bold text-foreground">
            {activeEntries.length}
          </span>
          <span className="text-sm text-muted-foreground">
            item{activeEntries.length === 1 ? "" : "s"} logged
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            <span className="price">
              {centsToDollars(sale.reportThresholdCents)}
            </span>{" "}
            min
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 grid grid-cols-2 gap-2 border-t border-border bg-muted/30 p-3",
          isEnded && "bg-muted/15"
        )}
      >
        {isEnded ? (
          <Button asChild size="lg" variant="accent" className="col-span-2">
            <Link href={`/sales/${sale.id}/report`}>
              <FileBarChart2 aria-hidden="true" />
              Report
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="accent" className="col-span-2">
            <Link href={`/sales/${sale.id}/quick-entry`}>
              <NotebookPen aria-hidden="true" />
              Add items
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/sales/${sale.id}/batch`}>
            <Rows3 aria-hidden="true" />
            Batch
          </Link>
        </Button>
        {isEnded ? (
          <Button asChild variant="outline">
            <Link href={`/sales/${sale.id}/quick-entry`}>
              <NotebookPen aria-hidden="true" />
              Add items
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/sales/${sale.id}/report`}>
              <FileBarChart2 aria-hidden="true" />
              Report
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

function SaleGrid({
  sales,
  today,
  canManageSales,
  includeArchived
}: {
  sales: ListedSale[];
  today: Date;
  canManageSales: boolean;
  includeArchived: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sales.map((sale) => (
        <SaleCard
          key={sale.id}
          sale={sale}
          timing={saleTiming(sale, today)}
          canManageSales={canManageSales}
          includeArchived={includeArchived}
        />
      ))}
    </div>
  );
}

export default async function SalesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const includeArchived = shouldIncludeArchivedSales(
    params[INCLUDE_ARCHIVED_SALES_PARAM]
  );
  const sales = await getListedSales(user, includeArchived);
  const today = startOfLocalDay();
  const currentSales = sales
    .filter(
      (sale) =>
        sale.status !== SaleStatus.ARCHIVED &&
        isCurrentOrUpcomingSale(sale, today)
    )
    .sort(sortCurrentSales);
  const endedSales = sales
    .filter(
      (sale) =>
        sale.status !== SaleStatus.ARCHIVED &&
        !isCurrentOrUpcomingSale(sale, today)
    )
    .sort(sortEndedSales);
  const archivedSales = sales
    .filter((sale) => sale.status === SaleStatus.ARCHIVED)
    .sort(sortArchivedSales);
  const canManageSales = user.role === Role.MANAGEMENT;

  return (
    <AppShell user={user}>
      <StatusMessage params={params} />

      {params.error === "permission" ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
          That sale is assigned to another team.
        </div>
      ) : null}

      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Estate sales
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Open a sale
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link
              href={
                includeArchived
                  ? "/sales"
                  : `/sales?${INCLUDE_ARCHIVED_SALES_PARAM}=true`
              }
            >
              {includeArchived ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
              {includeArchived ? "Hide archived" : "Show archived"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="accent" className="hidden sm:inline-flex">
            <Link href="/sales/new">
              <Plus aria-hidden="true" />
              New sale
            </Link>
          </Button>
        </div>
      </div>

      {/* Always-visible new-sale path for the on-site team-created flow. */}
      <Button asChild size="lg" variant="accent" className="mb-5 w-full sm:hidden">
        <Link href="/sales/new">
          <Plus aria-hidden="true" />
          New estate sale
        </Link>
      </Button>

      {sales.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MapPin className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-lg font-bold">No active sales yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a sale with just an address, then start logging sold items.
              </p>
            </div>
            <Button asChild size="lg" variant="accent">
              <Link href="/sales/new">
                <Plus aria-hidden="true" />
                Create first sale
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-7">
          <section aria-labelledby="current-sales-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="current-sales-heading"
                className="font-display text-lg font-bold tracking-tight"
              >
                Current & upcoming
              </h2>
              <Badge variant="outline">{currentSales.length}</Badge>
            </div>

            {currentSales.length === 0 ? (
              <Card className="border-dashed">
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <MapPin className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold">
                      No current or upcoming sales
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create a sale with just an address, then start logging sold
                      items.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <SaleGrid
                sales={currentSales}
                today={today}
                canManageSales={canManageSales}
                includeArchived={includeArchived}
              />
            )}
          </section>

          {endedSales.length > 0 ? (
            <section aria-labelledby="ended-sales-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                  id="ended-sales-heading"
                  className="font-display text-lg font-bold tracking-tight text-muted-foreground"
                >
                  Ended sales
                </h2>
                <Badge variant="muted">{endedSales.length}</Badge>
              </div>

              <SaleGrid
                sales={endedSales}
                today={today}
                canManageSales={canManageSales}
                includeArchived={includeArchived}
              />
            </section>
          ) : null}

          {includeArchived ? (
            <section aria-labelledby="archived-sales-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                  id="archived-sales-heading"
                  className="font-display text-lg font-bold tracking-tight text-muted-foreground"
                >
                  Archived sales
                </h2>
                <Badge variant="muted">{archivedSales.length}</Badge>
              </div>

              {archivedSales.length === 0 ? (
                <Card className="border-dashed">
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No archived sales.
                  </div>
                </Card>
              ) : (
                <SaleGrid
                  sales={archivedSales}
                  today={today}
                  canManageSales={canManageSales}
                  includeArchived={includeArchived}
                />
              )}
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
