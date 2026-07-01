import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
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

  const [sale, teams] = await Promise.all([
    prisma.estateSale.findUnique({
      where: { id: saleId },
      include: { assignedTeam: true }
    }),
    prisma.team.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  if (!sale) {
    notFound();
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

      <BatchEntryForm
        saleId={sale.id}
        teams={teams}
        showTeamPicker={user.role === Role.MANAGEMENT}
        defaultTeamId={sale.assignedTeamId}
      />
    </AppShell>
  );
}
