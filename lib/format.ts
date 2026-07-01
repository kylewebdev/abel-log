export function normalizeAddress(address: string) {
  return address
    .trim()
    .toLowerCase()
    .replace(/[#.,]/g, "")
    .replace(/\b(street)\b/g, "st")
    .replace(/\b(avenue)\b/g, "ave")
    .replace(/\b(road)\b/g, "rd")
    .replace(/\b(drive)\b/g, "dr")
    .replace(/\b(court)\b/g, "ct")
    .replace(/\s+/g, " ");
}

export function normalizeAlias(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function dollarsToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function centsToDollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(cents / 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function shortDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function saleTitle(sale: { saleName: string | null; addressRaw: string }) {
  return sale.saleName ? `${sale.saleName}, ${sale.addressRaw}` : sale.addressRaw;
}

export function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseDateInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
