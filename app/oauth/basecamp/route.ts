import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireManagement } from "@/lib/auth";
import { basecampApiConfig, basecampRedirectUri } from "@/lib/basecamp/config";

export const runtime = "nodejs";

export async function GET() {
  await requireManagement();
  const { clientId } = basecampApiConfig();
  const state = randomBytes(32).toString("hex");
  const authorizeUrl = new URL(
    "https://launchpad.37signals.com/authorization/new"
  );
  authorizeUrl.search = new URLSearchParams({
    type: "web_server",
    response_type: "code",
    client_id: clientId,
    redirect_uri: basecampRedirectUri(),
    state
  }).toString();

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("basecamp_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/oauth/basecamp/callback",
    maxAge: 10 * 60
  });
  return response;
}
