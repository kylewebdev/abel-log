import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Archive, ArrowLeft, RotateCcw, Save } from "lucide-react";
import { Role, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  archiveSoldItemAction,
  restoreSoldItemAction,
  updateSoldItemAction
} from "@/lib/actions";
import { canManageItem } from "@/lib/permissions";
import { centsToInput, saleTitle } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default async function EditItemPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId)) {
    notFound();
  }

  const [item, categories] = await Promise.all([
    prisma.soldItem.findUnique({
      where: { id: itemId },
      include: {
        estateSale: true,
        submittedTeam: true,
        reportCategory: true
      }
    }),
    prisma.reportCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  if (!item) {
    notFound();
  }

  const isManager = user.role === Role.MANAGEMENT;

  if (!canManageItem(user, item) || (!isManager && item.isArchived)) {
    redirect(`/sales/${item.estateSaleId}?error=permission`);
  }

  const paramsValue = (await searchParams) ?? {};
  const next =
    typeof paramsValue.next === "string"
      ? paramsValue.next
      : `/sales/${item.estateSaleId}`;

  return (
    <AppShell user={user} focus>
      <div className="mx-auto max-w-2xl">
        <Link
          href={next}
          className="focus-ring -ml-1 mb-3 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>

        <div className="mb-4 flex items-center gap-2">
          <Badge variant={item.isArchived ? "muted" : "secondary"}>
            {item.isArchived ? "Archived item" : "Edit item"}
          </Badge>
        </div>
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight">
          {item.itemDescription}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {saleTitle(item.estateSale)} · {item.submittedTeam.name}
        </p>

        {paramsValue.error === "missing" ? (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
            Description and final sold price are required.
          </div>
        ) : null}

        <form id="edit-item-form" action={updateSoldItemAction} className="mt-5 space-y-4">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1.5">
            <Label htmlFor="description">Item description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={item.itemDescription}
              className="h-14 text-lg font-semibold"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="price">Final sold price</Label>
              <div className="relative">
                <span
                  className="price pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground"
                  aria-hidden="true"
                >
                  $
                </span>
                <Input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  defaultValue={centsToInput(item.finalSoldPriceCents)}
                  className="price h-14 pl-8 text-xl font-bold"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamLabel">Team label</Label>
              <Input
                id="teamLabel"
                name="teamLabel"
                defaultValue={item.teamLabel ?? ""}
              />
            </div>
          </div>

          {isManager ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reportCategoryId">Report category</Label>
                <Select
                  id="reportCategoryId"
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
              <div className="space-y-1.5">
                <Label htmlFor="reviewStatus">Review status</Label>
                <Select
                  id="reviewStatus"
                  name="reviewStatus"
                  defaultValue={item.reviewStatus}
                >
                  <option value={ReviewStatus.NEEDS_REVIEW}>Needs review</option>
                  <option value={ReviewStatus.APPROVED}>Approved</option>
                </Select>
              </div>
            </div>
          ) : null}
        </form>

        <div className="mt-6 border-t border-border pt-4">
          {!item.isArchived ? (
            <form action={archiveSoldItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="outline" className="text-destructive">
                <Archive aria-hidden="true" />
                Archive item
              </Button>
            </form>
          ) : isManager ? (
            <form action={restoreSoldItemAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="secondary">
                <RotateCcw aria-hidden="true" />
                Restore item
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="pb-safe sticky bottom-0 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Button
            type="submit"
            form="edit-item-form"
            size="xl"
            variant="accent"
            className="flex-1"
          >
            <Save aria-hidden="true" />
            Save item
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link href={next}>Cancel</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
