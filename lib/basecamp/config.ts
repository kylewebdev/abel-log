export const BASECAMP_ACCOUNT_ID = "6255208";
export const BASECAMP_PIPELINE_PROJECT_ID = "48401748";
export const BASECAMP_TRIAGE_COLUMN_ID = "10171421031";
export const BASECAMP_SIGNED_COLUMN_ID = "10171470527";
export const BASECAMP_TEMPLATE_ID = "48409398";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function basecampApiConfig() {
  return {
    apiBaseUrl: `https://3.basecampapi.com/${BASECAMP_ACCOUNT_ID}`,
    clientId: required("BASECAMP_CLIENT_ID"),
    clientSecret: required("BASECAMP_CLIENT_SECRET"),
    userAgent: required("BASECAMP_USER_AGENT")
  };
}

export function basecampRedirectUri() {
  return (
    process.env.BASECAMP_OAUTH_REDIRECT_URI?.trim() ||
    "https://log.abeliquidators.com/oauth/basecamp/callback"
  );
}

export function appBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() || "https://log.abeliquidators.com"
  ).replace(/\/$/, "");
}

export function basecampActorUserId() {
  const value = Number(required("BASECAMP_ACTOR_USER_ID"));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("BASECAMP_ACTOR_USER_ID must be a positive user ID");
  }
  return value;
}
