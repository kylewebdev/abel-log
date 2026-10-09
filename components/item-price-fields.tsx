"use client";

import { useState } from "react";
import { centsToDollars, dollarsToCents, itemTotalCents, parseQuantity } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PriceValues = { quantity: string; price: string };

export function ItemPriceFields({
  quantity,
  price,
  onChange,
  idPrefix = "",
  batch = false,
  required = true
}: PriceValues & {
  onChange: (patch: Partial<PriceValues>) => void;
  idPrefix?: string;
  batch?: boolean;
  required?: boolean;
}) {
  const quantityId = `${idPrefix}quantity`;
  const priceId = `${idPrefix}price`;
  const parsedQuantity = parseQuantity(quantity);
  const priceCents = dollarsToCents(price);
  const totalCents = parsedQuantity !== null && priceCents !== null
    ? itemTotalCents({ quantity: parsedQuantity, finalSoldPriceCents: priceCents })
    : null;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={quantityId}>Quantity</Label>
        <Input
          id={quantityId}
          name={batch ? "quantity[]" : "quantity"}
          type="number"
          inputMode="numeric"
          min={1}
          max={2147483647}
          step={1}
          value={quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
          required={required}
          className={batch ? "max-w-32 font-semibold" : "h-14 max-w-32 text-lg font-semibold"}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={priceId}>Sold price per item</Label>
        <div className="relative max-w-xs">
          <span
            className="price pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground"
            aria-hidden="true"
          >
            $
          </span>
          <Input
            id={priceId}
            name={batch ? "price[]" : "price"}
            inputMode="decimal"
            value={price}
            onChange={(event) => onChange({ price: event.target.value })}
            placeholder="0.00"
            className={batch ? "price pl-7 font-bold" : "price h-14 pl-8 text-xl font-bold"}
            autoComplete="off"
            required={required}
          />
        </div>
        <p className="text-xs text-muted-foreground">Enter the price for one item or bundle.</p>
      </div>
      <div className="text-sm font-semibold">
        Total sold price:{" "}
        <output htmlFor={`${quantityId} ${priceId}`} className="price" aria-live="polite">
          {totalCents === null ? "—" : centsToDollars(totalCents)}
        </output>
      </div>
    </>
  );
}

export function SingleItemPriceFields({
  defaultQuantity = 1,
  defaultPrice = ""
}: {
  defaultQuantity?: number;
  defaultPrice?: string;
}) {
  const [values, setValues] = useState<PriceValues>({
    quantity: String(defaultQuantity),
    price: defaultPrice
  });

  return (
    <ItemPriceFields
      {...values}
      onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
    />
  );
}
