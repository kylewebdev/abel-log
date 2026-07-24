export const REPORT_GROUP_COLORS = [
  {
    value: "blue",
    label: "Blue",
    dotClass: "bg-blue-500",
    badgeClass: "border-blue-300 bg-blue-100 text-blue-900"
  },
  {
    value: "red",
    label: "Red",
    dotClass: "bg-red-500",
    badgeClass: "border-red-300 bg-red-100 text-red-900"
  },
  {
    value: "green",
    label: "Green",
    dotClass: "bg-green-500",
    badgeClass: "border-green-300 bg-green-100 text-green-900"
  },
  {
    value: "amber",
    label: "Amber",
    dotClass: "bg-amber-500",
    badgeClass: "border-amber-300 bg-amber-100 text-amber-950"
  },
  {
    value: "purple",
    label: "Purple",
    dotClass: "bg-purple-500",
    badgeClass: "border-purple-300 bg-purple-100 text-purple-900"
  },
  {
    value: "pink",
    label: "Pink",
    dotClass: "bg-pink-500",
    badgeClass: "border-pink-300 bg-pink-100 text-pink-900"
  },
  {
    value: "teal",
    label: "Teal",
    dotClass: "bg-teal-500",
    badgeClass: "border-teal-300 bg-teal-100 text-teal-950"
  },
  {
    value: "orange",
    label: "Orange",
    dotClass: "bg-orange-500",
    badgeClass: "border-orange-300 bg-orange-100 text-orange-950"
  }
] as const;

export type ReportGroupColor = (typeof REPORT_GROUP_COLORS)[number]["value"];
export type ReportGroupFilter = "all" | "unassigned" | number;

export function isReportGroupColor(value: string): value is ReportGroupColor {
  return REPORT_GROUP_COLORS.some((color) => color.value === value);
}

export function reportGroupColor(color: string) {
  return (
    REPORT_GROUP_COLORS.find((option) => option.value === color) ?? {
      value: color,
      label: "Group",
      dotClass: "bg-slate-500",
      badgeClass: "border-slate-300 bg-slate-100 text-slate-900"
    }
  );
}

export function resolveReportGroupFilter(
  requested: string | undefined,
  groups: { id: number }[]
): ReportGroupFilter {
  if (requested === "unassigned") {
    return "unassigned";
  }

  const requestedId = Number(requested);
  return Number.isInteger(requestedId) &&
    groups.some((group) => group.id === requestedId)
    ? requestedId
    : "all";
}

export function matchesReportGroupFilter(
  reportGroupId: number | null,
  filter: ReportGroupFilter
) {
  return filter === "all"
    ? true
    : filter === "unassigned"
      ? reportGroupId === null
      : reportGroupId === filter;
}
