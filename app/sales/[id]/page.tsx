import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Archive,
  Edit3,
  FileBarChart2,
  MapPin,
  NotebookPen,
  RotateCcw,
  Rows3,
  Trash2
} from "lucide-react";
import { Role, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  archiveEstateSaleAction,
  archiveSoldItemAction,
  deleteSoldItemAction,
  deleteEstateSaleAction,
  restoreSoldItemAction,
  updateEstateSaleAction
} from "@/lib/actions";
import {
  canAccessSale,
  canDeleteItem,
  canEditSale,
  canManageItem
} from "@/lib/permissions";
import { centsToDollars, centsToInput, saleTitle, shortDate } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { StatusMessage } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/confirm-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { cn } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 text-center shadow-sm">
      <div className="price text-2xl font-bold leading-none">{value}</div>
      <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default async function SaleDetailPage({
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

  const [sale, teams] = await Promise.all([
    prisma.estateSale.findUnique({
      where: { id: saleId },
      include: {
        assignedTeam: true,
        createdByUser: true,
        createdByTeam: true,
        soldItems: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    }),
    prisma.team.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    })
  ]);

  if (!sale) {
    notFound();
  }

  const paramsValue = (await searchParams) ?? {};
  const isManager = user.role === Role.MANAGEMENT;

  if (!canAccessSale(user, sale)) {
    redirect("/sales?error=permission");
  }

  const mayEditSale = canEditSale(user);
  const activeItems = sale.soldItems.filter((item) => !item.isArchived);
  const archivedItems = sale.soldItems.filter((item) => item.isArchived);
  const activeView =
    mayEditSale && paramsValue.view === "details" ? "details" : "entries";
  const entriesHref = `/sales/${sale.id}`;
  const detailsHref = `/sales/${sale.id}?view=details`;

  return (
    <AppShell user={user}>
      <Breadcrumbs
        items={[
          { label: "All sales", href: "/sales" },
          { label: saleTitle(sale) }
        ]}
        className="-ml-1 mb-2"
      />

      <div className="mb-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {sale.status === SaleStatus.ACTIVE ? (
            <Badge variant="success">Active</Badge>
          ) : sale.status === SaleStatus.COMPLETED ? (
            <Badge variant="secondary">Completed</Badge>
          ) : (
            <Badge variant="muted">Archived</Badge>
          )}
          <Badge variant="outline">{sale.assignedTeam?.name ?? "Unassigned"}</Badge>
        </div>
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {saleTitle(sale)}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{sale.addressRaw}</span>
        </p>
      </div>

      <StatusMessage params={paramsValue} />

      {paramsValue.error === "permission" ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
          Teams can edit, archive, or delete only their own entries on sales currently assigned to their team.
        </div>
      ) : null}

      {/* Primary actions — the reason a team opens this screen. */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button asChild size="lg" variant="accent" className="col-span-2 sm:col-span-1">
          <Link href={`/sales/${sale.id}/quick-entry`}>
            <NotebookPen aria-hidden="true" />
            Add item
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/sales/${sale.id}/batch`}>
            <Rows3 aria-hidden="true" />
            Batch
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/sales/${sale.id}/report`}>
            <FileBarChart2 aria-hidden="true" />
            Report
          </Link>
        </Button>
      </div>

      <nav
        className={cn(
          "mb-5 grid overflow-hidden rounded-lg border border-border bg-card p-1 shadow-sm",
          mayEditSale ? "grid-cols-2" : "grid-cols-1"
        )}
        aria-label="Sale view"
      >
        <Link
          href={entriesHref}
          aria-current={activeView === "entries" ? "page" : undefined}
          className={cn(
            "focus-ring rounded-md px-3 py-2 text-center text-sm font-bold transition-colors",
            activeView === "entries"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          Entries
        </Link>
        {mayEditSale ? (
          <Link
            href={detailsHref}
            aria-current={activeView === "details" ? "page" : undefined}
            className={cn(
              "focus-ring rounded-md px-3 py-2 text-center text-sm font-bold transition-colors",
              activeView === "details"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            Edit details
          </Link>
        ) : null}
      </nav>

      {activeView === "details" ? (
        <section className="space-y-5" aria-labelledby="sale-details-heading">
          <Card>
            <CardHeader>
              <CardTitle id="sale-details-heading">Edit sale details</CardTitle>
              <CardDescription>
                Update sale details, assignment, and status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={updateEstateSaleAction}
                className="grid gap-4 sm:grid-cols-2"
              >
                <input type="hidden" name="saleId" value={sale.id} />
                <div className="space-y-1.5">
                  <Label htmlFor="saleName">Sale name</Label>
                  <Input
                    id="saleName"
                    name="saleName"
                    defaultValue={sale.saleName ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientName">Client name</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    defaultValue={sale.clientName ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={
                      sale.startDate ? sale.startDate.toISOString().slice(0, 10) : ""
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={
                      sale.endDate ? sale.endDate.toISOString().slice(0, 10) : ""
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reportThreshold">Report threshold</Label>
                  <Input
                    id="reportThreshold"
                    name="reportThreshold"
                    inputMode="decimal"
                    className="price"
                    defaultValue={centsToInput(sale.reportThresholdCents)}
                  />
                </div>
                {isManager ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="assignedTeamId">Assigned team</Label>
                      <Select
                        id="assignedTeamId"
                        name="assignedTeamId"
                        defaultValue={
                          sale.assignedTeamId ? String(sale.assignedTeamId) : ""
                        }
                      >
                        <option value="">No assigned team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="status">Status</Label>
                      <Select id="status" name="status" defaultValue={sale.status}>
                        <option value={SaleStatus.ACTIVE}>Active</option>
                        <option value={SaleStatus.COMPLETED}>Completed</option>
                        <option value={SaleStatus.ARCHIVED}>Archived</option>
                      </Select>
                    </div>
                  </>
                ) : null}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={sale.notes ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full sm:w-auto">
                    Save sale details
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {isManager ? (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>
                  Archive to hide this sale from the active list, or delete a
                  test or mistaken sale for good.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <form action={archiveEstateSaleAction}>
                    <input type="hidden" name="saleId" value={sale.id} />
                    <Button type="submit" variant="outline" className="w-full">
                      {sale.status === SaleStatus.ARCHIVED ? (
                        <>
                          <RotateCcw aria-hidden="true" />
                          Restore to active
                        </>
                      ) : (
                        <>
                          <Archive aria-hidden="true" />
                          Archive sale
                        </>
                      )}
                    </Button>
                  </form>
                  <form action={deleteEstateSaleAction}>
                    <input type="hidden" name="saleId" value={sale.id} />
                    <ConfirmButton
                      type="submit"
                      variant="destructive"
                      className="w-full"
                      confirmMessage={`Permanently delete this sale and its ${
                        sale.soldItems.length
                      } logged item${
                        sale.soldItems.length === 1 ? "" : "s"
                      }? This cannot be undone.`}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete sale permanently
                    </ConfirmButton>
                  </form>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deleting removes the sale and all {sale.soldItems.length}{" "}
                  logged item{sale.soldItems.length === 1 ? "" : "s"}. Use
                  archive if you might need it back.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Active" value={activeItems.length} />
              <Stat label="Archived" value={archivedItems.length} />
            </div>

            <div>
              <h2 className="mb-2 font-display text-lg font-bold">Sale entries</h2>
              {sale.soldItems.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center">
                  <p className="font-semibold">No sold items yet.</p>
                  <Button asChild variant="accent" className="mt-3">
                    <Link href={`/sales/${sale.id}/quick-entry`}>Add first item</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {sale.soldItems.map((item) => {
                    const ownedItem = {
                      submittedTeamId: item.submittedTeamId,
                      estateSale: sale
                    };
                    const canEdit = canManageItem(user, ownedItem);
                    const canDelete = canDeleteItem(user, ownedItem);
                    const canEditActive = canEdit && (isManager || !item.isArchived);
                    return (
                      <li
                        key={item.id}
                        className={`rounded-md border border-border bg-card p-3 shadow-sm ${
                          item.isArchived ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold leading-snug">
                              {item.itemDescription}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Added {shortDate(item.createdAt)}
                            </div>
                          </div>
                          <div className="price shrink-0 text-lg font-bold">
                            {centsToDollars(item.finalSoldPriceCents)}
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.isArchived ? (
                              <Badge variant="muted">Archived</Badge>
                            ) : null}
                          </div>

                          {canEdit ? (
                            <div className="ml-auto flex items-center gap-1.5">
                              {canEditActive ? (
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/items/${item.id}/edit`}>
                                    <Edit3 aria-hidden="true" />
                                    Edit
                                  </Link>
                                </Button>
                              ) : null}
                              {canEdit && !item.isArchived ? (
                                <form action={archiveSoldItemAction}>
                                  <input
                                    type="hidden"
                                    name="itemId"
                                    value={item.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="next"
                                    value={`/sales/${sale.id}`}
                                  />
                                  <Button type="submit" variant="ghost" size="sm">
                                    <Archive aria-hidden="true" />
                                    Archive
                                  </Button>
                                </form>
                              ) : null}
                              {isManager && item.isArchived ? (
                                <form action={restoreSoldItemAction}>
                                  <input
                                    type="hidden"
                                    name="itemId"
                                    value={item.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="next"
                                    value={`/sales/${sale.id}`}
                                  />
                                  <Button type="submit" variant="ghost" size="sm">
                                    <RotateCcw aria-hidden="true" />
                                    Restore
                                  </Button>
                                </form>
                              ) : null}
                              {canDelete ? (
                                <form action={deleteSoldItemAction}>
                                  <input
                                    type="hidden"
                                    name="itemId"
                                    value={item.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="next"
                                    value={`/sales/${sale.id}`}
                                  />
                                  <ConfirmButton
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    confirmMessage={`Permanently delete "${item.itemDescription}"? This cannot be undone.`}
                                  >
                                    <Trash2 aria-hidden="true" />
                                    Delete
                                  </ConfirmButton>
                                </form>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sale context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Address
                  </div>
                  <div>{sale.addressRaw}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Client
                  </div>
                  <div>{sale.clientName ?? "Not set"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Dates
                  </div>
                  <div>
                    {shortDate(sale.startDate)} – {shortDate(sale.endDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Created by
                  </div>
                  <div>
                    {sale.createdByUser.name}
                    {sale.createdByTeam ? `, ${sale.createdByTeam.name}` : ""}
                  </div>
                </div>
                {sale.notes ? (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </div>
                    <div>{sale.notes}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
