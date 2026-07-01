import Link from "next/link";
import { notFound } from "next/navigation";
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
import { Role, ReviewStatus, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  archiveEstateSaleAction,
  archiveSoldItemAction,
  deleteEstateSaleAction,
  restoreSoldItemAction,
  updateEstateSaleAction
} from "@/lib/actions";
import { canManageItem } from "@/lib/permissions";
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
          include: {
            submittedTeam: true,
            reportCategory: true,
            archivedByUser: true
          },
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
  const activeItems = sale.soldItems.filter((item) => !item.isArchived);
  const archivedItems = sale.soldItems.filter((item) => item.isArchived);
  const needsReview = activeItems.filter(
    (item) => item.reviewStatus === ReviewStatus.NEEDS_REVIEW
  );

  return (
    <AppShell user={user}>
      <Link
        href="/sales"
        className="focus-ring -ml-1 mb-2 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        Sales
      </Link>

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
          Teams can edit or archive only entries submitted by their own team.
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

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div
            className={`grid gap-2 ${isManager ? "grid-cols-3" : "grid-cols-2"}`}
          >
            <Stat label="Active" value={activeItems.length} />
            {isManager ? <Stat label="To review" value={needsReview.length} /> : null}
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
                  const canEdit =
                    canManageItem(user, item) || (isManager && item.isArchived);
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
                            {item.teamLabel ?? "No label"} · {item.submittedTeam.name}{" "}
                            · {shortDate(item.createdAt)}
                          </div>
                        </div>
                        <div className="price shrink-0 text-lg font-bold">
                          {centsToDollars(item.finalSoldPriceCents)}
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.reportCategory ? (
                            <Badge variant="secondary">{item.reportCategory.name}</Badge>
                          ) : (
                            <Badge variant="warning">Uncategorized</Badge>
                          )}
                          {isManager ? (
                            <Badge
                              variant={
                                item.reviewStatus === ReviewStatus.APPROVED
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {item.reviewStatus === ReviewStatus.APPROVED
                                ? "Approved"
                                : "Needs review"}
                            </Badge>
                          ) : null}
                          {item.isArchived ? <Badge variant="muted">Archived</Badge> : null}
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
                                <input type="hidden" name="itemId" value={item.id} />
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
                                <input type="hidden" name="itemId" value={item.id} />
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

          {isManager ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit sale details</CardTitle>
                <CardDescription>
                  Optional details can be filled in after logging starts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateEstateSaleAction} className="space-y-3">
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="startDate">Start</Label>
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        defaultValue={
                          sale.startDate
                            ? sale.startDate.toISOString().slice(0, 10)
                            : ""
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
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" defaultValue={sale.notes ?? ""} />
                  </div>
                  <Button type="submit" className="w-full">
                    Save sale details
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

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
                <p className="text-xs text-muted-foreground">
                  Deleting removes the sale and all {sale.soldItems.length}{" "}
                  logged item{sale.soldItems.length === 1 ? "" : "s"}. Use
                  archive if you might need it back.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
