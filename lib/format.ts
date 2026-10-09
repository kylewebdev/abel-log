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

export function parseQuantity(value: FormDataEntryValue | null) {
  // Older entry forms omit quantity and represent a single item or bundle.
  if (value === null) return 1;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;

  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 2147483647
    ? quantity
    : null;
}

export function itemLabel(item: { itemDescription: string; quantity: number }) {
  return item.quantity > 1
    ? `${item.quantity}x ${item.itemDescription}`
    : item.itemDescription;
}

export function itemTotalCents(item: {
  finalSoldPriceCents: number;
  quantity: number;
}) {
  // The stored price is per item (or per bundle); totals are always derived.
  return item.finalSoldPriceCents * item.quantity;
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

export function saleDateRange(sale: {
  startDate: Date | string | null;
  endDate: Date | string | null;
}) {
  if (sale.startDate && sale.endDate) {
    const start = shortDate(sale.startDate);
    const end = shortDate(sale.endDate);

    return start === end ? start : `${start} - ${end}`;
  }

  if (sale.startDate) {
    return `Starts ${shortDate(sale.startDate)}`;
  }

  if (sale.endDate) {
    return `Ends ${shortDate(sale.endDate)}`;
  }

  return "Dates not set";
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
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  const [year, month, day] = value.split("-").map(Number);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}
