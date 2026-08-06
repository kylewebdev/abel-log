import { createHash, timingSafeEqual } from "node:crypto";

export type BasecampIntakePayload = {
  submissionId: string;
  name: string;
  phone: string | null;
  email: string;
  propertyAddress: string | null;
  city: string | null;
  situation: string | null;
  contactMethod: string | null;
  description: string;
};

type IntakeCard = {
  title: string;
  content: string;
};

type ParseResult =
  | { ok: true; payload: BasecampIntakePayload }
  | { ok: false; error: string };

type RequiredStringResult = { value: string } | { error: string };

const MAX_LENGTHS = {
  submissionId: 128,
  name: 160,
  phone: 80,
  email: 254,
  propertyAddress: 500,
  city: 160,
  situation: 160,
  contactMethod: 80,
  description: 5000
} as const;

function recordValue(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(
  record: Record<string, unknown>,
  names: string[],
  maxLength: number
) {
  const value = names
    .map((name) => record[name])
    .find((candidate) => typeof candidate === "string");
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function requiredString(
  record: Record<string, unknown>,
  names: string[],
  label: keyof typeof MAX_LENGTHS
): RequiredStringResult {
  const value = stringValue(record, names, MAX_LENGTHS[label]);
  if (value) {
    return { value };
  }
  return {
    error: `${names[0]} is required and must be at most ${MAX_LENGTHS[label]} characters`
  };
}

export function parseBasecampIntake(value: unknown): ParseResult {
  const record = recordValue(value);
  if (!record) {
    return { ok: false, error: "The request body must be a JSON object" };
  }

  const submissionId = requiredString(
    record,
    ["submissionId", "submission_id"],
    "submissionId"
  );
  const name = requiredString(record, ["name"], "name");
  const email = requiredString(record, ["email"], "email");
  const description = requiredString(
    record,
    ["description"],
    "description"
  );
  const required = [submissionId, name, email, description];
  const invalid = required.find((result) => "error" in result);
  if (invalid && "error" in invalid) {
    return { ok: false, error: invalid.error };
  }

  const emailValue = "value" in email ? email.value : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    return { ok: false, error: "email must be a valid email address" };
  }

  return {
    ok: true,
    payload: {
      submissionId: "value" in submissionId ? submissionId.value : "",
      name: "value" in name ? name.value : "",
      phone: stringValue(record, ["phone"], MAX_LENGTHS.phone),
      email: emailValue,
      propertyAddress: stringValue(
        record,
        ["propertyAddress", "property_address"],
        MAX_LENGTHS.propertyAddress
      ),
      city: stringValue(record, ["city"], MAX_LENGTHS.city),
      situation: stringValue(record, ["situation"], MAX_LENGTHS.situation),
      contactMethod: stringValue(
        record,
        ["contactMethod", "contact_method"],
        MAX_LENGTHS.contactMethod
      ),
      description: "value" in description ? description.value : ""
    }
  };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function line(label: string, value: string | null) {
  return value
    ? `<div><strong>${label}:</strong> ${escapeHtml(value)
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .replaceAll("\n", "<br>")}</div>`
    : null;
}

export function basecampIntakeCard(payload: BasecampIntakePayload): IntakeCard {
  const location = payload.city ?? "Location pending";
  const content = [
    line("Phone", payload.phone),
    line("Email", payload.email),
    line("Property Address", payload.propertyAddress),
    line("City / ZIP", payload.city),
    line("Situation", payload.situation),
    line("Preferred Contact", payload.contactMethod),
    line("Source", "Website consultation form"),
    line("Details", payload.description),
    line("Submission ID", payload.submissionId)
  ]
    .filter((value): value is string => value !== null)
    .join("");

  return {
    title: `${payload.name} – ${location}`,
    content
  };
}

export function intakeFingerprint(payload: BasecampIntakePayload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function validIntakeAuthorization(
  authorization: string | null,
  expectedToken = process.env.INTAKE_WEBHOOK_TOKEN?.trim()
) {
  if (!expectedToken || !authorization?.startsWith("Bearer ")) {
    return false;
  }
  const receivedToken = authorization.slice("Bearer ".length).trim();
  if (!receivedToken) {
    return false;
  }
  const expectedBytes = Buffer.from(expectedToken);
  const receivedBytes = Buffer.from(receivedToken);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}
