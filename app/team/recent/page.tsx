import Link from "next/link";
import { Archive, Edit3, RotateCcw, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  archiveSoldItemAction,
  deleteSoldItemAction,
  restoreSoldItemAction
} from "@/lib/actions";
import { canDeleteItem, canManageItem } from "@/lib/permissions";
import { centsToDollars, saleTitle, shortDate } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/confirm-button";

export default async function TeamRecentPage() {
  const user = await requireUser();
  const isManager = user.role === Role.MANAGEMENT;
  const mayDeleteItems = canDeleteItem(user);
  const items = await prisma.soldItem.findMany({
    where: isManager
      ? {}
      : {
          submittedTeamId: user.teamId ?? -1
        },
    include: {
      estateSale: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 60
  });

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Recent entries
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {isManager ? "All recent entries" : `${user.team?.name ?? "Your team"} entries`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isManager
            ? "Edit, archive, restore, or delete recently submitted rows across sales."
            : "Edit or archive your team's entries while the sale remains assigned to your team. Archived rows stay for context."}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No entries yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const canManage = canManageItem(user, item);
            const canEdit = canManage && (isManager || !item.isArchived);

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
                    <Link
                      href={`/sales/${item.estateSaleId}`}
                      className="mt-0.5 block truncate text-xs font-semibold text-accent hover:underline"
                    >
                      {saleTitle(item.estateSale)}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Added {shortDate(item.createdAt)}
                    </div>
                  </div>
                  <div className="price shrink-0 text-lg font-bold">
                    {centsToDollars(item.finalSoldPriceCents)}
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.isArchived ? <Badge variant="muted">Archived</Badge> : null}
                  </div>

                  {canManage ? (
                    <div className="ml-auto flex items-center gap-1.5">
                      {canEdit ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/items/${item.id}/edit?next=/team/recent`}>
                            <Edit3 aria-hidden="true" />
                            Edit
                          </Link>
                        </Button>
                      ) : null}
                      {!item.isArchived ? (
                        <form action={archiveSoldItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="next" value="/team/recent" />
                          <Button type="submit" variant="ghost" size="sm">
                            <Archive aria-hidden="true" />
                            Archive
                          </Button>
                        </form>
                      ) : isManager ? (
                        <form action={restoreSoldItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="next" value="/team/recent" />
                          <Button type="submit" variant="ghost" size="sm">
                            <RotateCcw aria-hidden="true" />
                            Restore
                          </Button>
                        </form>
                      ) : null}
                      {mayDeleteItems ? (
                        <form action={deleteSoldItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="next" value="/team/recent" />
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
    </AppShell>
  );
}
