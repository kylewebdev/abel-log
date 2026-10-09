import { itemTotalCents } from "./format";
import { matchesReportGroupFilter, type ReportGroupFilter } from "./report-groups";

type ReportItem = {
  finalSoldPriceCents: number;
  quantity: number;
  isArchived: boolean;
  reportGroupId: number | null;
};

export function buildSaleReport<T extends ReportItem>(
  items: T[],
  options: {
    thresholdCents: number;
    includeUnderThreshold: boolean;
    includeArchived: boolean;
    groupFilter: ReportGroupFilter;
  }
) {
  const filteredItems = items
    .filter((item) => options.includeArchived || !item.isArchived)
    .filter((item) => matchesReportGroupFilter(item.reportGroupId, options.groupFilter))
    .filter((item) => options.includeUnderThreshold || itemTotalCents(item) >= options.thresholdCents)
    .sort((a, b) => itemTotalCents(b) - itemTotalCents(a));

  return {
    items: filteredItems,
    totalCents: filteredItems.reduce((sum, item) => sum + itemTotalCents(item), 0),
    itemCount: filteredItems.reduce((sum, item) => sum + item.quantity, 0)
  };
}
