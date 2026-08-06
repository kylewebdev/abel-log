import { prisma } from "@/lib/db";
import {
  BASECAMP_ACCOUNT_ID,
  basecampApiConfig,
  basecampRedirectUri
} from "@/lib/basecamp/config";

const TOKEN_URL = "https://launchpad.37signals.com/authorization/token";
const CREDENTIAL_ID = "primary";

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
};

function tokenString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function tokenExpiry(expiresIn: unknown) {
  const seconds = Number(expiresIn);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(Date.now() + seconds * 1000)
    : null;
}

async function tokenRequest(params: URLSearchParams) {
  const { userAgent } = basecampApiConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent
    },
    body: params.toString(),
    cache: "no-store"
  });

  const body = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!response.ok) {
    throw new Error(`Basecamp OAuth token request failed with ${response.status}`);
  }

  const accessToken = tokenString(body?.access_token);
  if (!accessToken) {
    throw new Error("Basecamp OAuth response did not include an access token");
  }

  return {
    accessToken,
    refreshToken: tokenString(body?.refresh_token),
    expiresAt: tokenExpiry(body?.expires_in)
  };
}

async function verifyAuthorizedAccount(accessToken: string) {
  const { userAgent } = basecampApiConfig();
  const response = await fetch(
    "https://launchpad.37signals.com/authorization.json",
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": userAgent
      },
      cache: "no-store"
    }
  );
  if (!response.ok) {
    throw new Error(
      `Basecamp authorization lookup failed with ${response.status}`
    );
  }

  const body = (await response.json()) as { accounts?: unknown };
  const accounts = Array.isArray(body.accounts) ? body.accounts : [];
  const authorized = accounts.some((value) => {
    if (!value || typeof value !== "object") {
      return false;
    }
    const account = value as Record<string, unknown>;
    return (
      account.product === "bc3" && String(account.id) === BASECAMP_ACCOUNT_ID
    );
  });
  if (!authorized) {
    throw new Error(
      `The authorized Basecamp user cannot access account ${BASECAMP_ACCOUNT_ID}`
    );
  }
}

export async function exchangeBasecampAuthorizationCode(code: string) {
  const { clientId, clientSecret } = basecampApiConfig();
  const tokens = await tokenRequest(
    new URLSearchParams({
      type: "web_server",
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: basecampRedirectUri(),
      client_secret: clientSecret,
      code
    })
  );

  if (!tokens.refreshToken) {
    throw new Error("Basecamp OAuth response did not include a refresh token");
  }

  await verifyAuthorizedAccount(tokens.accessToken);

  await prisma.basecampOAuthCredential.upsert({
    where: { id: CREDENTIAL_ID },
    update: {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt
    },
    create: {
      id: CREDENTIAL_ID,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt
    }
  });
}

async function accessToken() {
  const credential = await prisma.basecampOAuthCredential.findUnique({
    where: { id: CREDENTIAL_ID }
  });
  if (!credential) {
    throw new Error("Basecamp has not been authorized yet");
  }

  if (
    credential.accessToken &&
    credential.expiresAt &&
    credential.expiresAt.getTime() > Date.now() + 60_000
  ) {
    return credential.accessToken;
  }

  const { clientId, clientSecret } = basecampApiConfig();
  const tokens = await tokenRequest(
    new URLSearchParams({
      type: "refresh",
      grant_type: "refresh_token",
      refresh_token: credential.refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  );

  await prisma.basecampOAuthCredential.update({
    where: { id: CREDENTIAL_ID },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? credential.refreshToken,
      expiresAt: tokens.expiresAt
    }
  });
  return tokens.accessToken;
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 10_000);
  }
  return 500 * 2 ** attempt;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class BasecampClient {
  private async fetchResponse(path: string, init: RequestInit = {}) {
    const { apiBaseUrl, userAgent } = basecampApiConfig();
    const token = await accessToken();
    const url = path.startsWith("https://") ? path : `${apiBaseUrl}${path}`;
    const parsedUrl = new URL(url);
    const parsedBaseUrl = new URL(apiBaseUrl);
    if (
      parsedUrl.origin !== parsedBaseUrl.origin ||
      !parsedUrl.pathname.startsWith(`${parsedBaseUrl.pathname}/`)
    ) {
      throw new Error("Basecamp pagination returned an unexpected URL");
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
          "User-Agent": userAgent,
          ...init.headers
        },
        cache: "no-store"
      });

      if (response.ok) {
        return response;
      }

      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await sleep(retryDelay(response, attempt));
        continue;
      }

      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(
        `Basecamp API ${init.method ?? "GET"} ${path} failed with ${response.status}${
          detail ? `: ${detail}` : ""
        }`
      );
    }

    throw new Error(`Basecamp API ${path} exhausted its retries`);
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchResponse(path, init);
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  async getAll<T>(path: string) {
    const results: T[] = [];
    let next: string | null = path;
    let pageCount = 0;

    while (next && pageCount < 20) {
      const response = await this.fetchResponse(next);
      const page = (await response.json()) as unknown;
      if (!Array.isArray(page)) {
        throw new Error(`Basecamp API ${path} did not return a collection`);
      }
      results.push(...(page as T[]));
      const link = response.headers.get("link");
      next =
        link
          ?.split(",")
          .map((part) => part.trim())
          .find((part) => /rel="?next"?/i.test(part))
          ?.match(/<([^>]+)>/)?.[1] ?? null;
      pageCount += 1;
    }

    if (next) {
      throw new Error(`Basecamp API ${path} exceeded 20 pagination pages`);
    }
    return results;
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }
}
