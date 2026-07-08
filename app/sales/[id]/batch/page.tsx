import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageSaleItems } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { SaleContextHeader } from "@/components/sale-context-header";
import { BatchEntryForm } from "@/components/batch-entry-form";

export default async function BatchEntryPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId)) {
    notFound();
  }

  const sale = await prisma.estateSale.findUnique({
    where: { id: saleId },
    include: { assignedTeam: true }
  });

  if (!sale) {
    notFound();
  }

  if (!canManageSaleItems(user, sale)) {
    redirect(`/sales/${sale.id}?error=permission`);
  }

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
          One row per item or bundle. Blank and incomplete rows are skipped.
        </p>
      </div>

      <BatchEntryForm saleId={sale.id} />
    </AppShell>
  );
}
