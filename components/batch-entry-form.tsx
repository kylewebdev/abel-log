"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Rows3, Save, Trash2 } from "lucide-react";
import { createBatchItemsAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const { filledCount, partialCount } = useMemo(
    () =>
      rows.reduce(
        (counts, row) => {
          const hasDescription = Boolean(row.description.trim());
          const hasPrice = Boolean(row.price.trim());

          if (hasDescription && hasPrice) {
            counts.filledCount += 1;
          } else if (hasDescription || hasPrice) {
            counts.partialCount += 1;
          }

          return counts;
        },
        { filledCount: 0, partialCount: 0 }
      ),
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
      current.length === 1
        ? current.map((row) =>
            row.id === id ? { ...row, description: "", price: "" } : row
          )
        : current.filter((row) => row.id !== id)
    );
  }

  const saveHelp =
    filledCount === 0
      ? partialCount > 0
        ? "Finish both fields in an item to turn on Save items."
        : "Add a description and price to turn on Save items."
      : partialCount > 0
        ? `${filledCount} ready. ${partialCount} incomplete ${partialCount === 1 ? "row will" : "rows will"} be skipped.`
        : `${filledCount} ${filledCount === 1 ? "item is" : "items are"} ready to save.`;

  return (
    <form action={createBatchItemsAction}>
      <input type="hidden" name="saleId" value={saleId} />

      <div className="mb-4 flex gap-3 rounded-lg border border-border bg-muted/45 p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-accent shadow-sm">
          <Rows3 className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-sm font-bold">Each card is one sold item</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Fill in both fields for every item you want to save. Use the clearly
            labeled Delete row button to discard an item you do not need.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const hasDescription = Boolean(row.description.trim());
          const hasPrice = Boolean(row.price.trim());
          const isReady = hasDescription && hasPrice;
          const isPartial = hasDescription !== hasPrice;
          const descriptionId = `batch-description-${row.id}`;
          const priceId = `batch-price-${row.id}`;

          return (
            <fieldset
              key={row.id}
              className="min-w-0 space-y-3 rounded-lg border border-border bg-card p-3 shadow-sm"
            >
              <legend className="sr-only">Item {index + 1}</legend>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="stamp text-[0.7rem] font-bold text-foreground">
                    Item {index + 1}
                  </span>
                  {isReady ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Ready
                    </span>
                  ) : isPartial ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Needs both fields
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                  aria-label={`${rows.length === 1 ? "Clear" : "Delete"} item ${index + 1} row`}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                  {rows.length === 1 ? "Clear row" : "Delete row"}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={descriptionId}>Item or bundle sold</Label>
                <Input
                  id={descriptionId}
                  name="description[]"
                  value={row.description}
                  onChange={(event) =>
                    updateRow(row.id, { description: event.target.value })
                  }
                  placeholder="Bundle of garden tools"
                  className="font-semibold"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={priceId}>Final sold price</Label>
                <div className="relative max-w-xs">
                  <span
                    className="price pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground"
                    aria-hidden="true"
                  >
                    $
                  </span>
                  <Input
                    id={priceId}
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
            </fieldset>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={addRow}
        className="mt-3 w-full border-dashed"
      >
        <Plus aria-hidden="true" />
        Add another item
      </Button>

      <div className="pb-safe sticky bottom-0 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-2 sm:flex sm:items-center sm:gap-4 sm:space-y-0">
          <p
            id="batch-save-help"
            className="text-sm font-medium text-muted-foreground sm:max-w-sm"
            aria-live="polite"
          >
            {saveHelp}
          </p>
          <Button
            type="submit"
            size="xl"
            variant="accent"
            className="w-full flex-1"
            disabled={filledCount === 0}
            aria-describedby="batch-save-help"
            title={filledCount === 0 ? saveHelp : undefined}
          >
            <Save aria-hidden="true" />
            Save {filledCount > 0 ? `${filledCount} ` : ""}item
            {filledCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </form>
  );
}
