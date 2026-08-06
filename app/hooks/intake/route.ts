import { BasecampJobStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { BasecampClient } from "@/lib/basecamp-client";
import {
  basecampIntakeCard,
  intakeFingerprint,
  parseBasecampIntake,
  validIntakeAuthorization
} from "@/lib/basecamp-intake";
import { BASECAMP_TRIAGE_COLUMN_ID } from "@/lib/basecamp/config";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 64 * 1024;
const STALE_PROCESSING_MILLISECONDS = 5 * 60 * 1000;

type CreatedCard = {
  id?: unknown;
  app_url?: unknown;
};

function cardResult(intake: {
  basecampCardId: string | null;
  basecampCardAppUrl: string | null;
}) {
  return {
    accepted: true,
    cardId: intake.basecampCardId,
    cardUrl: intake.basecampCardAppUrl
  };
}

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown intake error").slice(
    0,
    1000
  );
}

export async function POST(request: NextRequest) {
  if (!process.env.INTAKE_WEBHOOK_TOKEN?.trim()) {
    console.error("INTAKE_WEBHOOK_TOKEN is not configured");
    return NextResponse.json(
      { error: "Intake is unavailable" },
      { status: 503 }
    );
  }
  if (!validIntakeAuthorization(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body is too large" },
      { status: 413 }
    );
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  const bodyText = await request.text();
  if (Buffer.byteLength(bodyText, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body is too large" },
      { status: 413 }
    );
  }
  const body = (() => {
    try {
      return JSON.parse(bodyText) as unknown;
    } catch {
      return null;
    }
  })();
  const parsed = parseBasecampIntake(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const card = basecampIntakeCard(parsed.payload);
  const fingerprint = intakeFingerprint(parsed.payload);
  let intake;
  try {
    intake = await prisma.basecampIntake.create({
      data: {
        submissionId: parsed.payload.submissionId,
        requestFingerprint: fingerprint,
        cardTitle: card.title,
        cardContent: card.content
      }
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    intake = await prisma.basecampIntake.findUniqueOrThrow({
      where: { submissionId: parsed.payload.submissionId }
    });
  }

  if (intake.requestFingerprint !== fingerprint) {
    return NextResponse.json(
      { error: "submissionId was already used for different intake data" },
      { status: 409 }
    );
  }
  if (intake.status === BasecampJobStatus.COMPLETED) {
    return NextResponse.json({ ...cardResult(intake), duplicate: true });
  }
  if (intake.status === BasecampJobStatus.PROCESSING) {
    if (
      intake.processingStartedAt &&
      intake.processingStartedAt.getTime() <
        Date.now() - STALE_PROCESSING_MILLISECONDS
    ) {
      await prisma.basecampIntake.updateMany({
        where: {
          id: intake.id,
          status: BasecampJobStatus.PROCESSING
        },
        data: {
          status: BasecampJobStatus.NEEDS_ATTENTION,
          lastError:
            "Intake processing did not finish; automatic retry was suppressed to avoid a duplicate Basecamp card."
        }
      });
      return NextResponse.json(
        { error: "This intake needs manual attention" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { accepted: true, processing: true },
      { status: 202 }
    );
  }
  if (intake.status === BasecampJobStatus.NEEDS_ATTENTION) {
    return NextResponse.json(
      { error: "This intake needs manual attention" },
      { status: 503 }
    );
  }

  const claimed = await prisma.basecampIntake.updateMany({
    where: {
      id: intake.id,
      status: BasecampJobStatus.PENDING,
      processingStartedAt: null
    },
    data: {
      status: BasecampJobStatus.PROCESSING,
      processingStartedAt: new Date(),
      attemptCount: { increment: 1 },
      lastError: null
    }
  });
  if (claimed.count !== 1) {
    return NextResponse.json(
      { accepted: true, processing: true },
      { status: 202 }
    );
  }

  try {
    const client = new BasecampClient();
    const created = await client.postOnce<CreatedCard>(
      `/card_tables/lists/${BASECAMP_TRIAGE_COLUMN_ID}/cards.json`,
      { title: card.title, content: card.content, notify: false }
    );
    const cardId =
      typeof created.id === "string" || typeof created.id === "number"
        ? String(created.id)
        : null;
    if (!cardId) {
      throw new Error("Basecamp did not return a card ID");
    }
    const cardUrl =
      typeof created.app_url === "string" && created.app_url.trim()
        ? created.app_url.trim()
        : null;
    const completed = await prisma.basecampIntake.update({
      where: { id: intake.id },
      data: {
        basecampCardId: cardId,
        basecampCardAppUrl: cardUrl,
        status: BasecampJobStatus.COMPLETED,
        completedAt: new Date(),
        lastError: null
      }
    });
    return NextResponse.json(cardResult(completed), { status: 201 });
  } catch (error) {
    const message = errorMessage(error);
    await prisma.basecampIntake
      .update({
        where: { id: intake.id },
        data: {
          status: BasecampJobStatus.NEEDS_ATTENTION,
          lastError: message
        }
      })
      .catch(() => undefined);
    console.error("Basecamp intake card creation failed", {
      intakeId: intake.id,
      submissionId: intake.submissionId,
      error: message
    });
    return NextResponse.json(
      { error: "Basecamp card creation failed" },
      { status: 502 }
    );
  }
}
