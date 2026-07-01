import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, SlidersHorizontal, History } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createSoldItemAction } from "@/lib/actions";
import { centsToDollars } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { SaleContextHeader } from "@/components/sale-context-header";
import { StatusMessage } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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

  const [sale, categories, teams, aliases, recentItems] = await Promise.all([
    prisma.estateSale.findUnique({
      where: { id: saleId },
      include: { assignedTeam: true }
    }),
    prisma.reportCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.team.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.categoryAlias.findMany({
      where: {
        isApproved: true,
        OR: [
          { scope: "GLOBAL", teamId: null },
          ...(user.teamId ? [{ scope: "TEAM" as const, teamId: user.teamId }] : [])
        ]
      },
      include: { reportCategory: true },
      orderBy: [{ usageCount: "desc" }, { aliasText: "asc" }],
      take: 8
    }),
    prisma.soldItem.findMany({
      where: {
        estateSaleId: saleId,
        ...(user.role === Role.TEAM && user.teamId
          ? { submittedTeamId: user.teamId }
          : {})
      },
      include: { submittedTeam: true },
      orderBy: { createdAt: "desc" },
      take: 6
    })
  ]);

  if (!sale) {
    notFound();
  }

  const paramsValue = (await searchParams) ?? {};
  const isManager = user.role === Role.MANAGEMENT;
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

          <div className="space-y-1.5">
            <Label htmlFor="teamLabel">Team label or hint (optional)</Label>
            <Input
              id="teamLabel"
              name="teamLabel"
              list="category-suggestions"
              placeholder="patio lot, garage stuff, wall art…"
              autoComplete="off"
            />
            <datalist id="category-suggestions">
              {aliases.map((alias) => (
                <option
                  key={alias.id}
                  value={alias.aliasText}
                  label={alias.reportCategory.name}
                />
              ))}
            </datalist>
          </div>

          {isManager ? (
            <details className="rounded-md border border-border bg-muted/30">
              <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-bold">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Manager options — team &amp; category
              </summary>
              <div className="grid gap-4 border-t border-border p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="submittedTeamId">Submitting team</Label>
                  <Select
                    id="submittedTeamId"
                    name="submittedTeamId"
                    defaultValue={
                      sale.assignedTeamId ? String(sale.assignedTeamId) : undefined
                    }
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reportCategoryId">Report category</Label>
                  <Select id="reportCategoryId" name="reportCategoryId">
                    <option value="">Leave uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </details>
          ) : null}
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
          {isManager ? "Recently logged" : "Your recent entries"}
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
                  <div className="text-xs text-muted-foreground">
                    {item.submittedTeam.name}
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
