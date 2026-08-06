export const INCLUDE_ARCHIVED_SALES_PARAM = "include_archived";

export function shouldIncludeArchivedSales(value: unknown) {
  return value === "true";
}

export function saleListArchiveResultPath({
  includeArchived,
  result
}: {
  includeArchived: boolean;
  result: "archived" | "restored";
}) {
  const params = new URLSearchParams();

  if (includeArchived) {
    params.set(INCLUDE_ARCHIVED_SALES_PARAM, "true");
  }

  params.set(result, "1");
  return `/sales?${params.toString()}`;
}
