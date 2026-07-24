import { cn } from "@/lib/utils";
import { reportGroupColor } from "@/lib/report-groups";

export type ReportGroupSummary = {
  name: string;
  color: string;
};

export function ReportGroupBadge({
  group,
  className,
  showUnassigned = false
}: {
  group: ReportGroupSummary | null;
  className?: string;
  showUnassigned?: boolean;
}) {
  if (!group) {
    return showUnassigned ? (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-muted px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.05em] text-muted-foreground",
          className
        )}
      >
        <span className="size-2 rounded-full bg-slate-400" aria-hidden="true" />
        Unassigned
      </span>
    ) : null;
  }

  const color = reportGroupColor(group.color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.05em]",
        color.badgeClass,
        className
      )}
    >
      <span className={cn("size-2 rounded-full", color.dotClass)} aria-hidden="true" />
      {group.name}
    </span>
  );
}
