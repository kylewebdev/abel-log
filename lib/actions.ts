"use server";

import {
  AliasScope,
  EntrySource,
  ReviewStatus,
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
  normalizeAlias,
  optionalString,
  parseDateInput,
  slugify
} from "@/lib/format";
import { requireManagement, requireUser } from "@/lib/auth";
import { canManageItem } from "@/lib/permissions";
import { signIn, signOut } from "@/auth";

const DEFAULT_REDIRECT = "/sales";

function formId(value: FormDataEntryValue | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function aliasKey(scope: AliasScope, normalizedAliasText: string, teamId: number | null) {
  return `${scope}:${teamId ?? "global"}:${normalizedAliasText}`;
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
  const status = optionalString(formData.get("status")) as SaleStatus | null;

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
      status: status && status in SaleStatus ? status : before.status,
      archivedAt: status === SaleStatus.ARCHIVED ? new Date() : null
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

async function resolveSubmittedTeamId({
  user,
  saleId,
  formData
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
  saleId: number;
  formData: FormData;
}) {
  if (user.role === Role.TEAM && user.teamId) {
    return user.teamId;
  }

  const requestedTeamId = formId(formData.get("submittedTeamId"));
  if (requestedTeamId) {
    return requestedTeamId;
  }

  const sale = await prisma.estateSale.findUniqueOrThrow({
    where: { id: saleId },
    select: { assignedTeamId: true }
  });

  if (sale.assignedTeamId) {
    return sale.assignedTeamId;
  }

  const firstTeam = await prisma.team.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  if (!firstTeam) {
    throw new Error("At least one active team is required before adding items.");
  }

  return firstTeam.id;
}

async function categoryFromApprovedAlias(teamLabel: string | null, teamId: number) {
  if (!teamLabel) {
    return null;
  }

  const normalized = normalizeAlias(teamLabel);
  const aliases = await prisma.categoryAlias.findMany({
    where: {
      normalizedAliasText: normalized,
      isApproved: true,
      OR: [
        {
          scope: AliasScope.GLOBAL,
          teamId: null
        },
        {
          scope: AliasScope.TEAM,
          teamId
        }
      ]
    },
    orderBy: [{ scope: "desc" }, { usageCount: "desc" }]
  });

  const alias = aliases.find((item) => item.teamId === teamId) ?? aliases[0];

  if (!alias) {
    return null;
  }

  await prisma.categoryAlias.update({
    where: { id: alias.id },
    data: { usageCount: { increment: 1 } }
  });

  return alias.reportCategoryId;
}

export async function createSoldItemAction(formData: FormData) {
  const user = await requireUser();
  const saleId = formId(formData.get("saleId"));
  const description = optionalString(formData.get("description"));
  const priceCents = dollarsToCents(formData.get("price"));

  if (!saleId || !description || priceCents === null) {
    redirect(saleId ? `/sales/${saleId}/quick-entry?error=missing` : "/sales");
  }

  const submittedTeamId = await resolveSubmittedTeamId({ user, saleId, formData });
  const teamLabel = optionalString(formData.get("teamLabel"));
  const requestedCategoryId = formId(formData.get("reportCategoryId"));
  const suggestedCategoryId =
    requestedCategoryId ?? (await categoryFromApprovedAlias(teamLabel, submittedTeamId));
  const source =
    optionalString(formData.get("entrySource")) === "PAPER"
      ? EntrySource.PAPER
      : user.role === Role.MANAGEMENT
        ? EntrySource.MANAGEMENT
        : EntrySource.LIVE_APP;

  const item = await prisma.soldItem.create({
    data: {
      estateSaleId: saleId,
      submittedTeamId,
      createdByUserId: user.id,
      itemDescription: description,
      finalSoldPriceCents: priceCents,
      teamLabel,
      reportCategoryId: suggestedCategoryId,
      entrySource: source,
      reviewStatus: ReviewStatus.NEEDS_REVIEW,
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
  revalidatePath("/management/review");

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

  const submittedTeamId = await resolveSubmittedTeamId({ user, saleId, formData });
  const descriptions = formData.getAll("description[]");
  const prices = formData.getAll("price[]");
  const labels = formData.getAll("teamLabel[]");
  const notes = formData.getAll("notes[]");

  const rows = await Promise.all(
    descriptions.map(async (rawDescription, index) => {
      const description = optionalString(rawDescription);
      const priceCents = dollarsToCents(prices[index] ?? null);
      const teamLabel = optionalString(labels[index] ?? null);
      const rowNotes = optionalString(notes[index] ?? null);

      if (!description && priceCents === null && !teamLabel && !rowNotes) {
        return null;
      }

      if (!description || priceCents === null) {
        return null;
      }

      const aliasCategoryId = await categoryFromApprovedAlias(
        teamLabel,
        submittedTeamId
      );

      return {
        estateSaleId: saleId,
        submittedTeamId,
        createdByUserId: user.id,
        itemDescription: rowNotes ? `${description} (${rowNotes})` : description,
        finalSoldPriceCents: priceCents,
        teamLabel,
        reportCategoryId: aliasCategoryId,
        entrySource: EntrySource.PAPER,
        reviewStatus: ReviewStatus.NEEDS_REVIEW,
        soldDate: new Date()
      };
    })
  );

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
  revalidatePath("/management/review");
  redirect(`/sales/${saleId}?batchSaved=${validRows.length}`);
}

export async function updateSoldItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = formId(formData.get("itemId"));

  if (!itemId) {
    redirect(DEFAULT_REDIRECT);
  }

  const before = await prisma.soldItem.findUniqueOrThrow({
    where: { id: itemId }
  });

  if (!canManageItem(user, before) || (user.role === Role.TEAM && before.isArchived)) {
    redirect(`/sales/${before.estateSaleId}?error=permission`);
  }

  const description = optionalString(formData.get("description"));
  const priceCents = dollarsToCents(formData.get("price"));

  if (!description || priceCents === null) {
    redirect(`/items/${itemId}/edit?error=missing`);
  }

  const requestedCategoryId =
    user.role === Role.MANAGEMENT ? formId(formData.get("reportCategoryId")) : before.reportCategoryId;

  const reviewStatus =
    user.role === Role.MANAGEMENT &&
    optionalString(formData.get("reviewStatus")) === ReviewStatus.APPROVED
      ? ReviewStatus.APPROVED
      : before.reviewStatus;

  const after = await prisma.soldItem.update({
    where: { id: itemId },
    data: {
      itemDescription: description,
      finalSoldPriceCents: priceCents,
      teamLabel: optionalString(formData.get("teamLabel")),
      reportCategoryId: requestedCategoryId,
      reviewStatus
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
  revalidatePath("/management/review");

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
    where: { id: itemId }
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
  revalidatePath("/management/review");
  redirect(next);
}

export async function restoreSoldItemAction(formData: FormData) {
  const user = await requireManagement();
  const itemId = formId(formData.get("itemId"));
  const next = optionalString(formData.get("next")) ?? "/management/review?filter=archived";

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
  revalidatePath("/management/review");
  redirect(next);
}

export async function approveSoldItemAction(formData: FormData) {
  const user = await requireManagement();
  const itemId = formId(formData.get("itemId"));
  const categoryId = formId(formData.get("reportCategoryId"));
  const next = optionalString(formData.get("next")) ?? "/management/review";

  if (!itemId) {
    redirect(next);
  }

  const before = await prisma.soldItem.findUniqueOrThrow({
    where: { id: itemId }
  });

  const after = await prisma.soldItem.update({
    where: { id: itemId },
    data: {
      reportCategoryId: categoryId ?? before.reportCategoryId,
      reviewStatus: ReviewStatus.APPROVED
    }
  });

  await recordActivity({
    actorUserId: user.id,
    actorTeamId: user.teamId,
    entityType: "sold_item",
    entityId: itemId,
    action: "approve",
    before,
    after
  });

  revalidatePath(`/sales/${before.estateSaleId}`);
  revalidatePath(`/sales/${before.estateSaleId}/report`);
  revalidatePath("/management/review");
  redirect(next);
}

export async function createCategoryAction(formData: FormData) {
  await requireManagement();
  const name = optionalString(formData.get("name"));

  if (!name) {
    redirect("/management/categories?error=category");
  }

  await prisma.reportCategory.upsert({
    where: { slug: slugify(name) },
    update: {
      name,
      isActive: true
    },
    create: {
      name,
      slug: slugify(name),
      isActive: true
    }
  });

  revalidatePath("/management/categories");
  redirect("/management/categories?created=1");
}

export async function createAliasAction(formData: FormData) {
  const user = await requireManagement();
  const aliasText = optionalString(formData.get("aliasText"));
  const categoryId = formId(formData.get("reportCategoryId"));
  const teamId = formId(formData.get("teamId"));
  const scope = teamId ? AliasScope.TEAM : AliasScope.GLOBAL;
  const next = optionalString(formData.get("next")) ?? "/management/categories";

  if (!aliasText || !categoryId) {
    redirect(`${next}${next.includes("?") ? "&" : "?"}error=alias`);
  }

  const normalized = normalizeAlias(aliasText);

  await prisma.categoryAlias.upsert({
    where: { aliasKey: aliasKey(scope, normalized, teamId) },
    update: {
      aliasText,
      reportCategoryId: categoryId,
      isApproved: true,
      approvedByUserId: user.id,
      approvedAt: new Date()
    },
    create: {
      aliasKey: aliasKey(scope, normalized, teamId),
      aliasText,
      normalizedAliasText: normalized,
      reportCategoryId: categoryId,
      teamId,
      scope,
      isApproved: true,
      approvedByUserId: user.id,
      approvedAt: new Date()
    }
  });

  revalidatePath("/management/categories");
  revalidatePath("/management/review");
  redirect(`${next}${next.includes("?") ? "&" : "?"}aliasSaved=1`);
}

export async function quickArchiveOwnItemAction(formData: FormData) {
  await archiveSoldItemAction(formData);
}
