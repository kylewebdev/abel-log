import Link from "next/link";
import {
  FileBarChart2,
  NotebookPen,
  Rows3,
  type LucideIcon
} from "lucide-react";
import { centsToDollars, saleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/breadcrumbs";

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
  const activeView = VIEWS.find((view) => view.key === active);

  return (
    <section className="pt-safe sticky top-14 z-30 -mx-4 mb-4 border-b border-border bg-card/95 px-4 backdrop-blur-md md:-mx-6 md:px-6 print:hidden">
      <div className="mx-auto max-w-6xl space-y-2.5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              { label: "All sales", href: "/sales" },
              { label: saleTitle(sale), href: `/sales/${sale.id}` },
              { label: activeView?.label ?? "Sale" }
            ]}
          />
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
