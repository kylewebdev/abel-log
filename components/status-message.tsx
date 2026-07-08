import { CheckCircle2 } from "lucide-react";

const messages: Record<string, string> = {
  created: "Estate sale created — start adding sold items.",
  saved: "Item saved.",
  batchSaved: "Batch entries saved.",
  duplicate:
    "An active sale already exists for this address — opened the existing one.",
  updated: "Changes saved.",
  archived: "Sale archived — hidden from the active list.",
  restored: "Sale restored to the active list.",
  deleted: "Sale deleted."
};

export function StatusMessage({
  params
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const entries = Object.entries(messages).filter(([key]) => params[key]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {entries.map(([key, message]) => (
        <div
          key={key}
          className="flex animate-rise-in items-center gap-2.5 rounded-md border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm font-semibold text-success"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {key === "batchSaved" && typeof params[key] === "string"
            ? `${params[key]} paper-note rows saved.`
            : message}
        </div>
      ))}
    </div>
  );
}
