"use server";

import {
  EntrySource,
  Role,
  SaleStatus
} from "@prisma/client";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  dollarsToCents,
  normalizeAddress,
  optionalString,
  parseDateInput
} from "@/lib/format";
import { requireManagement, requireUser } from "@/lib/auth";
import {
  canAccessSale,
  canDeleteItem,
  canManageItem
} from "@/lib/permissions";
import {
  isReportGroupColor,
  reportGroupColor
} from "@/lib/report-groups";
import { signIn, signOut } from "@/auth";

const DEFAULT_REDIRECT = "/sales";

function formId(value: FormDataEntryValue | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function recordActivity({
  actorUserId,
  actorTeamId,
  entityType,
  entityId,
  action,
  before,
  after
}: {
  actorUserId: number;
  actorTeamId: number | null;
  entityType: string;
  entityId: number;
  action: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.activityLog.create({
    data: {
      actorUserId,
      actorTeamId,
      entityType,
      entityId,
      action,
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: after ? JSON.stringify(after) : null
    }
  });
}

export async function loginAction(formData: FormData) {
  const username = optionalString(formData.get("username"))?.toLowerCase();
  const password = optionalString(formData.get("password"));

  if (!username || !password) {
    redirect("/login?error=missing");
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: DEFAULT_REDIRECT
    });
  } catch (error) {
    // A failed credential check throws AuthError; a successful sign-in throws
    // the NEXT_REDIRECT control-flow error, which must be allowed to bubble.
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createEstateSaleAction(formData: FormData) {
  const user = await requireUser();
  const address = optionalString(formData.get("address"));

  if (!address) {
    redirect("/sales/new?error=address");
  }

  if (user.role === Role.TEAM && !user.teamId) {
    redirect("/sales/new?error=team");
  }

  const normalizedAddress = normalizeAddress(address);
  const googlePlaceId = optionalString(formData.get("googlePlaceId"));

  const duplicate = await prisma.estateSale.findFirst({
    where: {
      status: SaleStatus.ACTIVE,
      OR: [
        { normalizedAddress },
        ...(googlePlaceId ? [{ googlePlaceId }] : [])
      ]
    },
    select: {
      id: true
    }
  });

  if (duplicate) {
    redirect(`/sales/${duplicate.id}?duplicate=1`);
  }

  const reportThresholdCents =
    dollarsToCents(formData.get("reportThreshold")) ?? 2500;
  const assignedTeamId =
    user.role === Role.TEAM
      ? user.teamId
      : formId(formData.get("assignedTeamId"));

  const sale = await prisma.estateSale.create({
    data: {
      addressRaw: address,
      formattedAddress: address,
      normalizedAddress,
      saleName: optionalString(formData.get("saleName")),
      clientName: optionalString(formData.get("clientName")),
      notes: optionalString(formData.get("notes")),
      status: SaleStatus.ACTIVE,
      reportThresholdCents,
      startDate: parseDateInput(formData.get("startDate")),
      endDate: parseDateInput(formData.get("endDate")),
      assignedTeamId,
      createdByUserId: user.id,
      createdByTeamId: user.teamId
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "estate_sale",
    entityId: sale.id,
    action: "create",
    after: sale
  });

  revalidatePath("/sales");
  redirect(`/sales/${sale.id}/quick-entry?created=1`);
}

export async function updateEstateSaleAction(formData: FormData) {
  const user = await requireManagement();
  const saleId = formId(formData.get("saleId"));

  if (!saleId) {
    redirect("/sales");
  }

  const before = await prisma.estateSale.findUniqueOrThrow({
    where: { id: saleId }
  });

  const reportThresholdCents =
    dollarsToCents(formData.get("reportThreshold")) ?? before.reportThresholdCents;
  const requestedStatus = optionalString(formData.get("status"));
  const status =
    requestedStatus &&
    Object.values(SaleStatus).includes(requestedStatus as SaleStatus)
      ? (requestedStatus as SaleStatus)
      : before.status;

  const after = await prisma.estateSale.update({
    where: { id: saleId },
    data: {
      saleName: optionalString(formData.get("saleName")),
      clientName: optionalString(formData.get("clientName")),
      notes: optionalString(formData.get("notes")),
      reportThresholdCents,
      startDate: parseDateInput(formData.get("startDate")),
      endDate: parseDateInput(formData.get("endDate")),
      assignedTeamId: formId(formData.get("assignedTeamId")),
      status,
      archivedAt:
        status === SaleStatus.ARCHIVED ? before.archivedAt ?? new Date() : null
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "estate_sale",
    entityId: saleId,
    action: "update",
    before,
    after
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${saleId}`);
  redirect(`/sales/${saleId}?updated=1`);
}

function revalidateSaleGroupPaths(saleId: number) {
  revalidatePath(`/sales/${saleId}`);
  revalidatePath(`/sales/${saleId}/quick-entry`);
  revalidatePath(`/sales/${saleId}/batch`);
  revalidatePath(`/sales/${saleId}/report`);
}

export async function createReportGroupAction(formData: FormData) {
  const user = await requireManagement();
  const saleId = formId(formData.get("saleId"));
  const color = optionalString(formData.get("color"));
  const requestedName = optionalString(formData.get("name"));

  if (!saleId || !color || !isReportGroupColor(color)) {
    redirect(saleId ? `/sales/${saleId}?view=details&error=group` : "/sales");
  }

  const sale = await prisma.estateSale.findUnique({
    where: { id: saleId },
    select: { id: true }
  });

  if (!sale) {
    redirect("/sales");
  }

  const name = requestedName ?? reportGroupColor(color).label;
  if (name.length > 40) {
    redirect(`/sales/${saleId}?view=details&error=groupName`);
  }

  const before = await prisma.reportGroup.findUnique({
    where: {
      estateSaleId_color: {
        estateSaleId: saleId,
        color
      }
    }
  });

  const after = await prisma.reportGroup.upsert({
    where: {
      estateSaleId_color: {
        estateSaleId: saleId,
        color
      }
    },
    update: {
      name,
      isActive: true
    },
    create: {
      estateSaleId: saleId,
      name,
      color
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "report_group",
    entityId: after.id,
    action: before ? "reactivate" : "create",
    before: before ?? undefined,
    after
  });

  revalidateSaleGroupPaths(saleId);
  redirect(`/sales/${saleId}?view=details&groupSaved=1`);
}

export async function updateReportGroupAction(formData: FormData) {
  const user = await requireManagement();
  const groupId = formId(formData.get("reportGroupId"));
  const name = optionalString(formData.get("name"));

  if (!groupId || !name || name.length > 40) {
    redirect("/sales");
  }

  const before = await prisma.reportGroup.findUnique({
    where: { id: groupId }
  });

  if (!before) {
    redirect("/sales");
  }

  const after = await prisma.reportGroup.update({
    where: { id: groupId },
    data: { name }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "report_group",
    entityId: groupId,
    action: "update",
    before,
    after
  });

  revalidateSaleGroupPaths(before.estateSaleId);
  redirect(`/sales/${before.estateSaleId}?view=details&groupUpdated=1`);
}

export async function toggleReportGroupAction(formData: FormData) {
  const user = await requireManagement();
  const groupId = formId(formData.get("reportGroupId"));

  if (!groupId) {
    redirect("/sales");
  }

  const before = await prisma.reportGroup.findUnique({
    where: { id: groupId }
  });

  if (!before) {
    redirect("/sales");
  }

  const after = await prisma.reportGroup.update({
    where: { id: groupId },
    data: { isActive: !before.isActive }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "report_group",
    entityId: groupId,
    action: after.isActive ? "reactivate" : "deactivate",
    before,
    after
  });

  revalidateSaleGroupPaths(before.estateSaleId);
  redirect(
    `/sales/${before.estateSaleId}?view=details&${
      after.isActive ? "groupActivated" : "groupDeactivated"
    }=1`
  );
}

export async function archiveEstateSaleAction(formData: FormData) {
  const user = await requireManagement();
  const saleId = formId(formData.get("saleId"));

  if (!saleId) {
    redirect("/sales");
  }

  const before = await prisma.estateSale.findUnique({ where: { id: saleId } });

  if (!before) {
    redirect("/sales");
  }

  const archiving = before.status !== SaleStatus.ARCHIVED;

  const after = await prisma.estateSale.update({
    where: { id: saleId },
    data: {
      status: archiving ? SaleStatus.ARCHIVED : SaleStatus.ACTIVE,
      archivedAt: archiving ? new Date() : null
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "estate_sale",
    entityId: saleId,
    action: archiving ? "archive" : "restore",
    before,
    after
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${saleId}`);
  redirect(`/sales/${saleId}?${archiving ? "archived" : "restored"}=1`);
}

export async function deleteEstateSaleAction(formData: FormData) {
  const user = await requireManagement();
  const saleId = formId(formData.get("saleId"));

  if (!saleId) {
    redirect("/sales");
  }

  const before = await prisma.estateSale.findUnique({ where: { id: saleId } });

  if (!before) {
    redirect("/sales");
  }

  // No FK cascade is defined, so clear child sold items before the sale.
  await prisma.$transaction([
    prisma.soldItem.deleteMany({ where: { estateSaleId: saleId } }),
    prisma.estateSale.delete({ where: { id: saleId } })
  ]);

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "estate_sale",
    entityId: saleId,
    action: "delete",
    before
  });

  revalidatePath("/sales");
  redirect("/sales?deleted=1");
}

async function requireSaleItemAccess({
  user,
  saleId
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
  saleId: number;
}) {
  const sale = await prisma.estateSale.findUniqueOrThrow({
    where: { id: saleId },
    select: { assignedTeamId: true }
  });

  if (!canAccessSale(user, sale)) {
    redirect(`/sales/${saleId}?error=permission`);
  }

  return sale;
}

async function reportGroupForNewItems({
  saleId,
  value,
  entryPath
}: {
  saleId: number;
  value: FormDataEntryValue | null;
  entryPath: "quick-entry" | "batch";
}) {
  const reportGroupId = formId(value);

  if (reportGroupId) {
    const group = await prisma.reportGroup.findFirst({
      where: {
        id: reportGroupId,
        estateSaleId: saleId,
        isActive: true
      },
      select: { id: true }
    });

    if (group) {
      return group.id;
    }
  }

  const activeGroupCount = await prisma.reportGroup.count({
    where: {
      estateSaleId: saleId,
      isActive: true
    }
  });

  if (activeGroupCount > 0) {
    redirect(`/sales/${saleId}/${entryPath}?error=group`);
  }

  return null;
}

export async function createSoldItemAction(formData: FormData) {
  const user = await requireUser();
  const saleId = formId(formData.get("saleId"));
  const description = optionalString(formData.get("description"));
  const priceCents = dollarsToCents(formData.get("price"));

  if (!saleId || !description || priceCents === null) {
    redirect(saleId ? `/sales/${saleId}/quick-entry?error=missing` : "/sales");
  }

  await requireSaleItemAccess({ user, saleId });
  const reportGroupId = await reportGroupForNewItems({
    saleId,
    value: formData.get("reportGroupId"),
    entryPath: "quick-entry"
  });

  const source =
    optionalString(formData.get("entrySource")) === "PAPER"
      ? EntrySource.PAPER
      : user.role === Role.MANAGEMENT
        ? EntrySource.MANAGEMENT
        : EntrySource.LIVE_APP;

  const item = await prisma.soldItem.create({
    data: {
      estateSaleId: saleId,
      submittedTeamId: user.role === Role.TEAM ? user.teamId : null,
      createdByUserId: user.id,
      reportGroupId,
      itemDescription: description,
      finalSoldPriceCents: priceCents,
      entrySource: source,
      soldDate: new Date()
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "sold_item",
    entityId: item.id,
    action: "create",
    after: item
  });

  revalidatePath(`/sales/${saleId}`);
  revalidatePath(`/sales/${saleId}/report`);
  revalidatePath("/team/recent");

  const intent = optionalString(formData.get("intent"));
  if (intent === "save") {
    redirect(`/sales/${saleId}?saved=1`);
  }

  redirect(`/sales/${saleId}/quick-entry?saved=1`);
}

export async function createBatchItemsAction(formData: FormData) {
  const user = await requireUser();
  const saleId = formId(formData.get("saleId"));

  if (!saleId) {
    redirect("/sales");
  }

  await requireSaleItemAccess({ user, saleId });
  const reportGroupId = await reportGroupForNewItems({
    saleId,
    value: formData.get("reportGroupId"),
    entryPath: "batch"
  });

  const descriptions = formData.getAll("description[]");
  const prices = formData.getAll("price[]");

  const rows = descriptions.map((rawDescription, index) => {
    const description = optionalString(rawDescription);
    const priceCents = dollarsToCents(prices[index] ?? null);

    if (!description && priceCents === null) {
      return null;
    }

    if (!description || priceCents === null) {
      return null;
    }

    return {
      estateSaleId: saleId,
      submittedTeamId: user.role === Role.TEAM ? user.teamId : null,
      createdByUserId: user.id,
      reportGroupId,
      itemDescription: description,
      finalSoldPriceCents: priceCents,
      entrySource: EntrySource.PAPER,
      soldDate: new Date()
    };
  });

  const validRows = rows.filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (validRows.length > 0) {
    await prisma.soldItem.createMany({
      data: validRows
    });

    await recordActivity({
      actorUserId: user.id,
      actorTeamId: user.teamId,
      entityType: "estate_sale",
      entityId: saleId,
      action: "batch_create_items",
      after: { count: validRows.length }
    });
  }

  revalidatePath(`/sales/${saleId}`);
  revalidatePath(`/sales/${saleId}/report`);
  revalidatePath("/team/recent");
  redirect(`/sales/${saleId}?batchSaved=${validRows.length}`);
}

export async function updateSoldItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = formId(formData.get("itemId"));

  if (!itemId) {
    redirect(DEFAULT_REDIRECT);
  }

  const before = await prisma.soldItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      estateSale: {
        select: { assignedTeamId: true }
      }
    }
  });

  if (!canManageItem(user, before) || (user.role === Role.TEAM && before.isArchived)) {
    redirect(`/sales/${before.estateSaleId}?error=permission`);
  }

  const description = optionalString(formData.get("description"));
  const priceCents = dollarsToCents(formData.get("price"));
  const requestedReportGroupId = formId(formData.get("reportGroupId"));

  if (!description || priceCents === null) {
    redirect(`/items/${itemId}/edit?error=missing`);
  }

  const reportGroupId = requestedReportGroupId
    ? (
        await prisma.reportGroup.findFirst({
          where: {
            id: requestedReportGroupId,
            estateSaleId: before.estateSaleId
          },
          select: { id: true }
        })
      )?.id ?? null
    : null;

  if (requestedReportGroupId && !reportGroupId) {
    redirect(`/items/${itemId}/edit?error=group`);
  }

  const after = await prisma.soldItem.update({
    where: { id: itemId },
    data: {
      itemDescription: description,
      finalSoldPriceCents: priceCents,
      reportGroupId
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "sold_item",
    entityId: itemId,
    action: "update",
    before,
    after
  });

  revalidatePath(`/sales/${before.estateSaleId}`);
  revalidatePath(`/sales/${before.estateSaleId}/report`);
  revalidatePath("/team/recent");

  const next = optionalString(formData.get("next")) ?? `/sales/${before.estateSaleId}`;
  redirect(next);
}

export async function archiveSoldItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = formId(formData.get("itemId"));
  const next = optionalString(formData.get("next")) ?? DEFAULT_REDIRECT;

  if (!itemId) {
    redirect(next);
  }

  const before = await prisma.soldItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      estateSale: {
        select: { assignedTeamId: true }
      }
    }
  });

  if (!canManageItem(user, before)) {
    redirect(`/sales/${before.estateSaleId}?error=permission`);
  }

  const after = await prisma.soldItem.update({
    where: { id: itemId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedByUserId: user.id,
      archiveReason: optionalString(formData.get("archiveReason"))
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "sold_item",
    entityId: itemId,
    action: "archive",
    before,
    after
  });

  revalidatePath(`/sales/${before.estateSaleId}`);
  revalidatePath(`/sales/${before.estateSaleId}/report`);
  revalidatePath("/team/recent");
  redirect(next);
}

export async function restoreSoldItemAction(formData: FormData) {
  const user = await requireManagement();
  const itemId = formId(formData.get("itemId"));
  const next = optionalString(formData.get("next")) ?? "/team/recent";

  if (!itemId) {
    redirect(next);
  }

  const before = await prisma.soldItem.findUniqueOrThrow({
    where: { id: itemId }
  });
  const after = await prisma.soldItem.update({
    where: { id: itemId },
    data: {
      isArchived: false,
      archivedAt: null,
      archivedByUserId: null,
      archiveReason: null
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "sold_item",
    entityId: itemId,
    action: "restore",
    before,
    after
  });

  revalidatePath(`/sales/${before.estateSaleId}`);
  revalidatePath(`/sales/${before.estateSaleId}/report`);
  revalidatePath("/team/recent");
  redirect(next);
}

export async function deleteSoldItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = formId(formData.get("itemId"));
  const next = optionalString(formData.get("next")) ?? DEFAULT_REDIRECT;

  if (!itemId) {
    redirect(next);
  }

  const before = await prisma.soldItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      estateSale: {
        select: { assignedTeamId: true }
      }
    }
  });

  if (!canDeleteItem(user, before)) {
    redirect(`/sales/${before.estateSaleId}?error=permission`);
  }

  await prisma.soldItem.delete({ where: { id: itemId } });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "sold_item",
    entityId: itemId,
    action: "delete",
    before
  });

  revalidatePath(`/sales/${before.estateSaleId}`);
  revalidatePath(`/sales/${before.estateSaleId}/report`);
  revalidatePath("/team/recent");
  redirect(next);
}

export async function quickArchiveOwnItemAction(formData: FormData) {
  await archiveSoldItemAction(formData);
}
