import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSale } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { SaleContextHeader } from "@/components/sale-context-header";
import { BatchEntryForm } from "@/components/batch-entry-form";

export default async function BatchEntryPage({
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
      reportGroups: {
        where: { isActive: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      }
    }
  });

  if (!sale) {
    notFound();
  }

  if (!canAccessSale(user, sale)) {
    redirect(`/sales/${sale.id}?error=permission`);
  }

  const paramsValue = (await searchParams) ?? {};

  return (
    <AppShell user={user} focus>
      <SaleContextHeader sale={sale} active="batch" />

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Paper-note batch entry
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Enter the handwritten sheet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add several sold items at once. Only complete items will be saved.
        </p>
      </div>

      {paramsValue.error === "group" ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
          Choose an active report group before saving these items.
        </div>
      ) : null}

      <BatchEntryForm saleId={sale.id} reportGroups={sale.reportGroups} />
    </AppShell>
  );
}
