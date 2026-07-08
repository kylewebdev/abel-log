"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { createBatchItemsAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
  id: number;
  description: string;
  price: string;
};

let rowCounter = 0;
function blankRow(): Row {
  rowCounter += 1;
  return {
    id: rowCounter,
    description: "",
    price: ""
  };
}

export function BatchEntryForm({
  saleId
}: {
  saleId: number;
}) {
  const [rows, setRows] = useState<Row[]>(() => [blankRow(), blankRow(), blankRow()]);

  const filledCount = useMemo(
    () =>
      rows.filter((row) => row.description.trim() && row.price.trim()).length,
    [rows]
  );

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((current) => [...current, blankRow()]);
  }

  function removeRow(id: number) {
    setRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.id !== id)
    );
  }

  return (
    <form action={createBatchItemsAction}>
      <input type="hidden" name="saleId" value={saleId} />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="space-y-3 rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="stamp text-[0.7rem] font-bold text-muted-foreground">
                Row {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.id)}
                aria-label={`Remove row ${index + 1}`}
                className="size-9 text-muted-foreground hover:text-destructive"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>

            <Input
              name="description[]"
              value={row.description}
              onChange={(event) =>
                updateRow(row.id, { description: event.target.value })
              }
              placeholder="Item or bundle sold"
              className="font-semibold"
              autoComplete="off"
            />

            <div className="relative max-w-xs">
              <span
                className="price pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground"
                aria-hidden="true"
              >
                $
              </span>
              <Input
                name="price[]"
                inputMode="decimal"
                value={row.price}
                onChange={(event) =>
                  updateRow(row.id, { price: event.target.value })
                }
                placeholder="0.00"
                className="price pl-7 font-bold"
                autoComplete="off"
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={addRow}
        className="mt-3 w-full border-dashed"
      >
        <Plus aria-hidden="true" />
        Add another row
      </Button>

      <div className="pb-safe sticky bottom-0 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="price text-base font-bold text-foreground">
              {filledCount}
            </span>{" "}
            ready
          </p>
          <Button type="submit" size="xl" className="flex-1" disabled={filledCount === 0}>
            <Save aria-hidden="true" />
            Save {filledCount > 0 ? `${filledCount} ` : ""}item
            {filledCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </form>
  );
}
