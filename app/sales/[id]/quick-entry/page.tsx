import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, History } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSale } from "@/lib/permissions";
import { createSoldItemAction } from "@/lib/actions";
import { centsToDollars } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { SaleContextHeader } from "@/components/sale-context-header";
import { StatusMessage } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function QuickEntryPage({
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

  const [sale, recentItems] = await Promise.all([
    prisma.estateSale.findUnique({
      where: { id: saleId },
      include: { assignedTeam: true }
    }),
    prisma.soldItem.findMany({
      where: {
        estateSaleId: saleId
      },
      orderBy: { createdAt: "desc" },
      take: 6
    })
  ]);

  if (!sale) {
    notFound();
  }

  if (!canAccessSale(user, sale)) {
    redirect(`/sales/${sale.id}?error=permission`);
  }

  const paramsValue = (await searchParams) ?? {};
  const justSaved = Boolean(paramsValue.saved);

  return (
    <AppShell user={user} focus>
      <SaleContextHeader sale={sale} active="quick" />
      <StatusMessage params={paramsValue} />

      {paramsValue.error === "missing" ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
          Add a description and a final sold price.
        </div>
      ) : null}

      <form action={createSoldItemAction}>
        <input type="hidden" name="saleId" value={sale.id} />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Item or bundle sold</Label>
            <Input
              id="description"
              name="description"
              placeholder="Bundle of garden tools"
              className="h-14 text-lg font-semibold"
              required
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Final sold price</Label>
            <div className="relative">
              <span
                className="price pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground"
                aria-hidden="true"
              >
                $
              </span>
              <Input
                id="price"
                name="price"
                inputMode="decimal"
                placeholder="0.00"
                className="price h-16 pl-10 text-3xl font-bold"
                required
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Any amount is fine — report defaults to{" "}
              <span className="price">{centsToDollars(sale.reportThresholdCents)}</span>{" "}
              and up.
            </p>
          </div>

        </div>

        {/* Sticky thumb-zone action bar — the repeated checkout action lives here. */}
        <div className="pb-safe sticky bottom-0 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
          <div className="mx-auto max-w-6xl space-y-2">
            <Button
              type="submit"
              name="intent"
              value="add-another"
              variant="accent"
              size="xl"
              className="w-full"
            >
              <Plus aria-hidden="true" />
              Save + add another
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit" name="intent" value="save" variant="outline" size="lg">
                Save &amp; close
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href={`/sales/${sale.id}`}>Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>

      <section className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <History className="size-4" aria-hidden="true" />
          Recently logged
        </div>
        {recentItems.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nothing logged yet. Your saved items will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {recentItems.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {item.itemDescription}
                    </span>
                    {justSaved && index === 0 ? (
                      <span className="stamp shrink-0 animate-stamp-in rounded border border-success/40 px-1.5 py-0.5 text-[0.6rem] text-success">
                        Just added
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="price shrink-0 text-lg font-bold">
                  {centsToDollars(item.finalSoldPriceCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
