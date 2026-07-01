import Link from "next/link";
import {
  ArrowLeft,
  FileBarChart2,
  NotebookPen,
  Rows3,
  type LucideIcon
} from "lucide-react";
import { centsToDollars, saleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";

type SaleContext = {
  id: number;
  saleName: string | null;
  addressRaw: string;
  reportThresholdCents: number;
  assignedTeam: { name: string } | null;
};

const VIEWS: { key: string; label: string; icon: LucideIcon; path: string }[] = [
  { key: "quick", label: "Quick", icon: NotebookPen, path: "quick-entry" },
  { key: "batch", label: "Batch", icon: Rows3, path: "batch" },
  { key: "report", label: "Report", icon: FileBarChart2, path: "report" }
];

export function SaleContextHeader({
  sale,
  active
}: {
  sale: SaleContext;
  active?: "quick" | "batch" | "report";
}) {
  return (
    <section className="pt-safe sticky top-14 z-30 -mx-4 mb-4 border-b border-border bg-card/95 px-4 backdrop-blur-md md:-mx-6 md:px-6 print:hidden">
      <div className="mx-auto max-w-6xl space-y-2.5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/sales/${sale.id}`}
            className="focus-ring flex min-w-0 items-center gap-2 rounded-md text-foreground"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Logging for
              </span>
              <span className="block truncate font-display text-[0.95rem] font-bold leading-tight">
                {saleTitle(sale)}
              </span>
            </span>
          </Link>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:inline-flex">
            <span className="price text-foreground">
              {centsToDollars(sale.reportThresholdCents)}
            </span>
            min
          </span>
        </div>

        <nav className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/60 p-1">
          {VIEWS.map((view) => {
            const isActive = active === view.key;
            return (
              <Link
                key={view.key}
                href={`/sales/${sale.id}/${view.path}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-md text-sm font-bold transition-colors",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <view.icon className="size-4" aria-hidden="true" />
                {view.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
