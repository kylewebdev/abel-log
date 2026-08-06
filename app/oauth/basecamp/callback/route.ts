import { timingSafeEqual } from "node:crypto";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { exchangeBasecampAuthorizationCode } from "@/lib/basecamp-client";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

function sameState(expected: string | undefined, received: string | null) {
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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.MANAGEMENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedState = request.cookies.get("basecamp_oauth_state")?.value;
  const receivedState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!sameState(expectedState, receivedState) || !code) {
    return NextResponse.json(
      { error: "Invalid or expired OAuth callback" },
      { status: 400 }
    );
  }

  await exchangeBasecampAuthorizationCode(code);
  const response = NextResponse.redirect(
    new URL("/sales?basecamp=connected", request.url)
  );
  response.cookies.delete("basecamp_oauth_state");
  return response;
}
