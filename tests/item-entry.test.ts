import assert from "node:assert/strict";
import test from "node:test";
import { itemLabel, parseDateInput, parseQuantity } from "../lib/format";

test("quantity defaults for older forms and accepts positive whole numbers", () => {
  assert.equal(parseQuantity(null), 1);
  assert.equal(parseQuantity("1"), 1);
  assert.equal(parseQuantity("4"), 4);
  assert.equal(parseQuantity(" 12 "), 12);
  assert.equal(parseQuantity("2147483647"), 2147483647);
});

test("quantity rejects blanks, fractions, non-positive values and integer overflow", () => {
  for (const value of ["", " ", "0", "-1", "1.5", "4x", "1e2", "NaN", "Infinity", "2147483648"]) {
    assert.equal(parseQuantity(value), null, value);
  }
});

test("item labels show multi-item quantities without changing the stored description", () => {
  assert.equal(itemLabel({ itemDescription: "Shelves", quantity: 4 }), "4x Shelves");
  assert.equal(itemLabel({ itemDescription: "Desk", quantity: 1 }), "Desk");
});

test("sale date validation rejects missing and impossible calendar dates", () => {
  for (const value of [null, "", " ", "invalid", "2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-10-00"]) {
    assert.equal(parseDateInput(value), null, String(value));
  }
  for (const value of ["2026-10-02", "2028-02-29"]) {
    const date = parseDateInput(value);
    assert.ok(date);
    const [year, month, day] = value.split("-").map(Number);
    assert.equal(date.getFullYear(), year);
    assert.equal(date.getMonth(), month - 1);
    assert.equal(date.getDate(), day);
  }
});
