import { BasecampJobStatus, Prisma, Role, SaleStatus } from "@prisma/client";
import { BasecampClient } from "@/lib/basecamp-client";
import {
  appBaseUrl,
  basecampActorUserId,
  BASECAMP_TEMPLATE_ID
} from "@/lib/basecamp/config";
import { prisma } from "@/lib/db";
import { normalizeAddress } from "@/lib/format";
import {
  cardSaleFields,
  linkSaleSheetContent,
  SignedCardSnapshot
} from "@/lib/basecamp-webhook";

type JsonObject = Record<string, unknown>;
type BasecampLink = Prisma.BasecampCardLinkGetPayload<object>;

function objectValue(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object"
    ? (value as JsonObject)
    : null;
}

function idValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : "Unknown error";
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function appendFollowUp(current: string | null, message: string) {
  if (current?.includes(message)) {
    return current;
  }
  return [current, message].filter(Boolean).join("\n");
}

export async function enqueueBasecampCard(snapshot: SignedCardSnapshot) {
  return prisma.basecampCardLink.upsert({
    where: { basecampCardId: snapshot.cardId },
    update: {},
    create: {
      basecampCardId: snapshot.cardId,
      cardTitle: snapshot.title,
      cardContent: snapshot.content,
      cardAppUrl: snapshot.appUrl,
      teamLeadPersonId: snapshot.teamLeadPersonId,
      manualFollowUp: snapshot.teamLeadPersonId
        ? null
        : "No team lead was assigned when the card entered Signed. Add the lead to the project manually."
    },
    select: { id: true, status: true }
  });
}

async function createSaleForLink(linkId: number) {
  return prisma.$transaction(async (tx) => {
    const link = await tx.basecampCardLink.findUniqueOrThrow({
      where: { id: linkId }
    });
    if (link.estateSaleId) {
      return link.estateSaleId;
    }

    const actor = await tx.user.findFirst({
      where: {
        id: basecampActorUserId(),
        isActive: true,
        role: Role.MANAGEMENT
      }
    });
    if (!actor) {
      throw new Error("BASECAMP_ACTOR_USER_ID is not an active management user");
    }

    const fields = cardSaleFields({
      cardId: link.basecampCardId,
      title: link.cardTitle,
      content: link.cardContent,
      appUrl: link.cardAppUrl,
      teamLeadPersonId: link.teamLeadPersonId
    });
    const sale = await tx.estateSale.create({
      data: {
        addressRaw: fields.address,
        formattedAddress: fields.address,
        normalizedAddress: normalizeAddress(fields.address),
        city: fields.city,
        saleName: link.cardTitle,
        clientName: fields.clientName,
        notes: fields.notes,
        status: SaleStatus.ACTIVE,
        reportThresholdCents: 2500,
        createdByUserId: actor.id,
        createdByTeamId: actor.teamId
      }
    });

    await tx.activityLog.create({
      data: {
        actorUserId: actor.id,
        actorTeamId: actor.teamId,
        entityType: "estate_sale",
        entityId: sale.id,
        action: "create_from_basecamp",
        afterJson: JSON.stringify({
          sale,
          basecampCardId: link.basecampCardId,
          cardAppUrl: link.cardAppUrl
        })
      }
    });

    await tx.basecampCardLink.update({
      where: { id: linkId },
      data: {
        estateSaleId: sale.id,
        manualFollowUp: fields.missingAddress
          ? appendFollowUp(
              link.manualFollowUp,
              "The card did not contain a labeled property address. Verify the sale address manually."
            )
          : link.manualFollowUp
      }
    });
    return sale.id;
  });
}

function constructionId(result: unknown) {
  const root = objectValue(result);
  return (
    idValue(root?.id) ??
    idValue(objectValue(root?.project_construction)?.id)
  );
}

function constructionProject(result: unknown) {
  const root = objectValue(result);
  const project = objectValue(root?.project);
  const id = idValue(project?.id) ?? idValue(root?.project_id);
  return id
    ? {
        id,
        appUrl: stringValue(project?.app_url) ?? stringValue(root?.project_app_url)
      }
    : null;
}

async function ensureProject(
  client: BasecampClient,
  link: BasecampLink
) {
  if (link.basecampProjectId) {
    return {
      id: link.basecampProjectId,
      appUrl: link.basecampProjectAppUrl
    };
  }

  let construction = link.basecampConstructionId;
  if (!construction) {
    const created = await client.post<unknown>(
      `/templates/${BASECAMP_TEMPLATE_ID}/project_constructions.json`,
      { project: { name: link.cardTitle, description: "" } }
    );
    construction = constructionId(created);
    if (!construction) {
      throw new Error("Basecamp did not return a project construction ID");
    }
    await prisma.basecampCardLink.update({
      where: { id: link.id },
      data: { basecampConstructionId: construction }
    });
  }

  for (let poll = 0; poll < 20; poll += 1) {
    const result = await client.get<unknown>(
      `/templates/${BASECAMP_TEMPLATE_ID}/project_constructions/${construction}.json`
    );
    const root = objectValue(result);
    const status = stringValue(root?.status)?.toLowerCase();
    const project = constructionProject(result);

    if (status === "completed" && project) {
      await prisma.basecampCardLink.update({
        where: { id: link.id },
        data: {
          basecampProjectId: project.id,
          basecampProjectAppUrl: project.appUrl
        }
      });
      return project;
    }
    if (status === "failed" || status === "cancelled") {
      throw new Error(`Basecamp project construction ended with status ${status}`);
    }
    await sleep(2000);
  }

  throw new Error("Basecamp project construction did not finish within 40 seconds");
}

function dockEntry(project: unknown, name: string, preferredTitle?: string) {
  const dock = arrayValue(objectValue(project)?.dock).map(objectValue).filter(Boolean);
  const candidates = dock.filter(
    (entry) => entry?.name === name && entry?.enabled !== false
  );
  const preferred = preferredTitle
    ? candidates.find((entry) =>
        stringValue(entry?.title)?.toLowerCase().includes(preferredTitle)
      )
    : null;
  const entry = preferred ?? candidates[0];
  return idValue(entry?.id);
}

async function linkSaleSheet(
  client: BasecampClient,
  projectId: string,
  vaultId: string,
  saleUrl: string
) {
  const documents = (
    await client.getAll<unknown>(
      `/buckets/${projectId}/vaults/${vaultId}/documents.json`
    )
  )
    .map(objectValue)
    .filter(Boolean);
  const document = documents.find((item) =>
    stringValue(item?.title)?.startsWith("Sale Sheet")
  );
  const documentId = idValue(document?.id);
  const title = stringValue(document?.title);
  const content = typeof document?.content === "string" ? document.content : null;
  if (!documentId || !title || content === null) {
    throw new Error("Sale Sheet document was not found in Estate Documents");
  }

  await client.put(`/buckets/${projectId}/documents/${documentId}.json`, {
    title,
    content: linkSaleSheetContent(content, saleUrl)
  });
}

async function completeSaleMilestone(
  client: BasecampClient,
  projectId: string,
  todosetId: string
) {
  const lists = (
    await client.getAll<unknown>(
      `/buckets/${projectId}/todosets/${todosetId}/todolists.json`
    )
  )
    .map(objectValue)
    .filter(Boolean);
  const list = lists.find(
    (item) =>
      item?.name === "Sale Milestones" || item?.title === "Sale Milestones"
  );
  const listId = idValue(list?.id);
  if (!listId) {
    throw new Error("Sale Milestones todo list was not found");
  }

  const pendingTodos = (
    await client.getAll<unknown>(
      `/buckets/${projectId}/todolists/${listId}/todos.json`
    )
  )
    .map(objectValue)
    .filter(Boolean);
  let todo = pendingTodos.find((item) =>
    stringValue(item?.content)?.startsWith("Sale created at log.abeliquidators.com")
  );
  if (!todo) {
    const completedTodos = (
      await client.getAll<unknown>(
        `/buckets/${projectId}/todolists/${listId}/todos.json?completed=true`
      )
    )
      .map(objectValue)
      .filter(Boolean);
    todo = completedTodos.find((item) =>
      stringValue(item?.content)?.startsWith(
        "Sale created at log.abeliquidators.com"
      )
    );
  }
  const todoId = idValue(todo?.id);
  if (!todoId) {
    throw new Error("Sale-created milestone was not found");
  }

  if (todo?.completed !== true) {
    await client.post(`/buckets/${projectId}/todos/${todoId}/completion.json`);
  }
}

export async function processBasecampCardLink(linkId: number) {
  const staleBefore = new Date(Date.now() - 5 * 60_000);
  const claimed = await prisma.basecampCardLink.updateMany({
    where: {
      id: linkId,
      OR: [
        { status: BasecampJobStatus.PENDING },
        { status: BasecampJobStatus.NEEDS_ATTENTION },
        {
          status: BasecampJobStatus.PROCESSING,
          processingStartedAt: { lt: staleBefore }
        }
      ]
    },
    data: {
      status: BasecampJobStatus.PROCESSING,
      processingStartedAt: new Date(),
      attemptCount: { increment: 1 },
      lastError: null
    }
  });
  if (claimed.count === 0) {
    return;
  }

  try {
    const saleId = await createSaleForLink(linkId);
    let link = await prisma.basecampCardLink.findUniqueOrThrow({
      where: { id: linkId }
    });
    const client = new BasecampClient();
    const project = await ensureProject(client, link);
    link = await prisma.basecampCardLink.findUniqueOrThrow({
      where: { id: linkId }
    });

    const errors: string[] = [];
    if (link.teamLeadPersonId && !link.teamLeadGranted) {
      try {
        await client.put(`/projects/${project.id}/people/users.json`, {
          grant: [Number(link.teamLeadPersonId)]
        });
        await prisma.basecampCardLink.update({
          where: { id: linkId },
          data: { teamLeadGranted: true }
        });
      } catch (error) {
        errors.push(`Team lead: ${errorMessage(error)}`);
      }
    }

    let projectDetail: unknown = null;
    try {
      projectDetail = await client.get(`/projects/${project.id}.json`);
    } catch (error) {
      errors.push(`Project dock: ${errorMessage(error)}`);
    }

    if (!link.saleSheetLinked && projectDetail) {
      try {
        const vaultId = dockEntry(projectDetail, "vault", "estate documents");
        if (!vaultId) {
          throw new Error("Estate Documents vault was not found");
        }
        await linkSaleSheet(
          client,
          project.id,
          vaultId,
          `${appBaseUrl()}/sales/${saleId}`
        );
        await prisma.basecampCardLink.update({
          where: { id: linkId },
          data: { saleSheetLinked: true }
        });
      } catch (error) {
        errors.push(`Sale Sheet: ${errorMessage(error)}`);
      }
    }

    if (!link.milestoneCompleted && projectDetail) {
      try {
        const todosetId = dockEntry(projectDetail, "todoset");
        if (!todosetId) {
          throw new Error("Project todoset was not found");
        }
        await completeSaleMilestone(client, project.id, todosetId);
        await prisma.basecampCardLink.update({
          where: { id: linkId },
          data: { milestoneCompleted: true }
        });
      } catch (error) {
        errors.push(`Milestone: ${errorMessage(error)}`);
      }
    }

    const current = await prisma.basecampCardLink.findUniqueOrThrow({
      where: { id: linkId }
    });
    const needsAttention = Boolean(current.manualFollowUp) || errors.length > 0;
    await prisma.basecampCardLink.update({
      where: { id: linkId },
      data: {
        status: needsAttention
          ? BasecampJobStatus.NEEDS_ATTENTION
          : BasecampJobStatus.COMPLETED,
        lastError: errors.length ? errors.join("\n") : null,
        processingStartedAt: null,
        completedAt: needsAttention ? null : new Date()
      }
    });
  } catch (error) {
    await prisma.basecampCardLink.update({
      where: { id: linkId },
      data: {
        status: BasecampJobStatus.NEEDS_ATTENTION,
        lastError: errorMessage(error),
        processingStartedAt: null
      }
    });
    console.error("Basecamp card processing failed", {
      linkId,
      error: errorMessage(error)
    });
  }
}
