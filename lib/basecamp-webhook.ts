const SIGNED_COLUMN_ID = "10171470527";

type UnknownRecord = Record<string, unknown>;

export type SignedCardSnapshot = {
  cardId: string;
  title: string;
  content: string | null;
  appUrl: string | null;
  teamLeadPersonId: string | null;
};

function objectValue(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

function idValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function signedCardSnapshot(payload: unknown): SignedCardSnapshot | null {
  const root = objectValue(payload);
  const recording = objectValue(root?.recording);
  const parent = objectValue(recording?.parent);

  if (
    recording?.type !== "Kanban::Card" ||
    idValue(parent?.id) !== SIGNED_COLUMN_ID
  ) {
    return null;
  }

  const cardId = idValue(recording.id);
  if (!cardId) {
    return null;
  }

  const assignees = Array.isArray(recording.assignees)
    ? recording.assignees
    : [];
  const firstAssignee = objectValue(assignees[0]);

  return {
    cardId,
    title: stringValue(recording.title) ?? `Basecamp card ${cardId}`,
    content: stringValue(recording.content),
    appUrl: stringValue(recording.app_url),
    teamLeadPersonId: idValue(firstAssignee?.id)
  };
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"'
};

export function htmlToText(html: string) {
  return html
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      }
      return HTML_ENTITIES[code.toLowerCase()] ?? entity;
    })
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean)
    .join("\n");
}

export function cardSaleFields(snapshot: SignedCardSnapshot) {
  const titleParts = snapshot.title.split(/\s+[\u2013\u2014-]\s+/, 2);
  const clientName = titleParts[0]?.trim() || null;
  const city = titleParts[1]?.trim() || null;
  const text = snapshot.content ? htmlToText(snapshot.content) : "";
  const lines = text.split("\n");
  const addressIndex = lines.findIndex((line) =>
    /^(?:(?:property|estate)\s+)?address\s*:?/i.test(line)
  );
  const inlineAddress =
    addressIndex >= 0
      ? lines[addressIndex]
          .replace(/^(?:(?:property|estate)\s+)?address\s*:?\s*/i, "")
          .trim()
      : "";
  const address =
    inlineAddress || (addressIndex >= 0 ? lines[addressIndex + 1]?.trim() : "") || null;
  const notes = [
    snapshot.appUrl ? `Basecamp card: ${snapshot.appUrl}` : null,
    text || null
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    address: address ?? city ?? snapshot.title,
    city,
    clientName,
    notes: notes || null,
    missingAddress: !address
  };
}

export function linkSaleSheetContent(content: string, saleUrl: string) {
  const placeholder = "https://log.abeliquidators.com/sales/[ID]";
  if (content.includes(saleUrl)) {
    return content;
  }
  if (!content.includes(placeholder)) {
    throw new Error("Sale Sheet placeholder was not found");
  }
  return content.replaceAll(placeholder, saleUrl);
}
