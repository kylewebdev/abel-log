import { timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { enqueueBasecampCard, processBasecampCardLink } from "@/lib/basecamp-jobs";
import { signedCardSnapshot } from "@/lib/basecamp-webhook";

export const runtime = "nodejs";
export const maxDuration = 60;

function validToken(received: string | null) {
  const expected = process.env.BASECAMP_WEBHOOK_TOKEN?.trim();
  if (!expected || !received) {
    return false;
  }
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export async function POST(request: NextRequest) {
  if (!validToken(request.nextUrl.searchParams.get("token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const snapshot = signedCardSnapshot(payload);
  if (!snapshot) {
    return new NextResponse(null, { status: 204 });
  }

  const link = await enqueueBasecampCard(snapshot);
  after(() => processBasecampCardLink(link.id));

  return NextResponse.json({ accepted: true }, { status: 202 });
}
