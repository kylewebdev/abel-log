"use client";

import { useEffect, useMemo, useState } from "react";
import { Tags } from "lucide-react";
import { ReportGroupBadge } from "@/components/report-group-badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type SelectableReportGroup = {
  id: number;
  name: string;
  color: string;
};

function storageKey(saleId: number) {
  return `abel-log:report-group:${saleId}`;
}

export function ReportGroupPicker({
  saleId,
  groups
}: {
  saleId: number;
  groups: SelectableReportGroup[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === selectedId) ?? null,
    [groups, selectedId]
  );

  useEffect(() => {
    try {
      const savedId = window.localStorage.getItem(storageKey(saleId));
      if (savedId && groups.some((group) => String(group.id) === savedId)) {
        setSelectedId(savedId);
      }
    } catch {
      // Storage can be unavailable in locked-down browser modes. The picker
      // still works for the current page and simply will not persist.
    }
  }, [groups, saleId]);

  if (groups.length === 0) {
    return <input type="hidden" name="reportGroupId" value="" />;
  }

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-primary/[0.04] p-3.5">
      <div className="mb-2 flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Tags className="size-4" aria-hidden="true" />
        </span>
        <div>
          <Label htmlFor={`report-group-${saleId}`} className="text-base">
            Active report group
          </Label>
          <p className="text-xs text-muted-foreground">
            Every item you add stays in this group until you switch it on this device.
          </p>
        </div>
      </div>
      <Select
        id={`report-group-${saleId}`}
        name="reportGroupId"
        value={selectedId}
        onChange={(event) => {
          const value = event.target.value;
          setSelectedId(value);
          try {
            window.localStorage.setItem(storageKey(saleId), value);
          } catch {
            // Keep the current selection even when persistence is unavailable.
          }
        }}
        required
        className="font-bold"
        aria-describedby={`report-group-help-${saleId}`}
      >
        <option value="" disabled>
          Choose a report group
        </option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </Select>
      <div
        id={`report-group-help-${saleId}`}
        className="mt-2 min-h-5 text-xs font-medium text-muted-foreground"
        aria-live="polite"
      >
        {selectedGroup ? (
          <span className="flex items-center gap-2">
            New entries will be tagged
            <ReportGroupBadge group={selectedGroup} />
          </span>
        ) : (
          "Select a group before saving an item."
        )}
      </div>
    </div>
  );
}
