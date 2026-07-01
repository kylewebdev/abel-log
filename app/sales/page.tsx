import Link from "next/link";
import { Plus, Rows3, NotebookPen, FileBarChart2, MapPin } from "lucide-react";
import { Role, ReviewStatus, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { StatusMessage } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { centsToDollars, saleTitle, shortDate } from "@/lib/format";

export default async function SalesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const isManager = user.role === Role.MANAGEMENT;
  const sales = await prisma.estateSale.findMany({
    where: {
      status: SaleStatus.ACTIVE
    },
    include: {
      assignedTeam: true,
      createdByUser: true,
      soldItems: {
        select: {
          id: true,
          isArchived: true,
          reviewStatus: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <AppShell user={user}>
      <StatusMessage params={params} />

      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Active sales
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Open a sale
          </h1>
        </div>
        <Button asChild size="lg" variant="accent" className="hidden sm:inline-flex">
          <Link href="/sales/new">
            <Plus aria-hidden="true" />
            New sale
          </Link>
        </Button>
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sales.map((sale) => {
            const activeEntries = sale.soldItems.filter((item) => !item.isArchived);
            const needsReview = activeEntries.filter(
              (item) => item.reviewStatus === ReviewStatus.NEEDS_REVIEW
            );

            return (
              <Card
                key={sale.id}
                className="group relative flex flex-col overflow-hidden p-0 transition-colors hover:border-foreground/30"
              >
                <Link
                  href={`/sales/${sale.id}`}
                  className="absolute inset-0 z-0"
                  aria-label={`View ${saleTitle(sale)}`}
                />

                <div className="p-4 pb-3">
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="success">Active</Badge>
                    <Badge variant="outline">
                      {sale.assignedTeam?.name ?? "Unassigned"}
                    </Badge>
                    {isManager && needsReview.length > 0 ? (
                      <Badge variant="warning" className="ml-auto">
                        {needsReview.length} to review
                      </Badge>
                    ) : null}
                  </div>

                  <h2 className="font-display text-lg font-bold leading-tight">
                    {saleTitle(sale)}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {shortDate(sale.createdAt)} · {sale.createdByUser.name}
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

                <div className="relative z-10 grid grid-cols-2 gap-2 border-t border-border bg-muted/30 p-3">
                  <Button asChild size="lg" variant="accent" className="col-span-2">
                    <Link href={`/sales/${sale.id}/quick-entry`}>
                      <NotebookPen aria-hidden="true" />
                      Add items
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/sales/${sale.id}/batch`}>
                      <Rows3 aria-hidden="true" />
                      Batch
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/sales/${sale.id}/report`}>
                      <FileBarChart2 aria-hidden="true" />
                      Report
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
