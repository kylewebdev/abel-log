import assert from "node:assert/strict";
import test from "node:test";
import { buildSaleReport } from "../lib/sale-report";

const items = [
  { id: 1, finalSoldPriceCents: 1000, quantity: 4, isArchived: false, reportGroupId: 3 },
  { id: 2, finalSoldPriceCents: 3500, quantity: 1, isArchived: false, reportGroupId: 7 },
  { id: 3, finalSoldPriceCents: 500, quantity: 5, isArchived: false, reportGroupId: null },
  { id: 4, finalSoldPriceCents: 800, quantity: 3, isArchived: false, reportGroupId: 3 },
  { id: 5, finalSoldPriceCents: 2000, quantity: 3, isArchived: true, reportGroupId: 3 }
];
const options = {
  thresholdCents: 2500,
  includeUnderThreshold: false,
  includeArchived: false,
  groupFilter: "all" as const
};

test("reports filter, sort and sum extended totals, including the exact threshold", () => {
  const report = buildSaleReport(items, options);
  assert.deepEqual(report.items.map((item) => item.id), [1, 2, 3]);
  assert.equal(report.totalCents, 10000);
  assert.equal(report.itemCount, 10);
  assert.deepEqual(items.map((item) => item.id), [1, 2, 3, 4, 5]);
});

test("quantity-only edits change report inclusion, order and totals", () => {
  const increased = items.map((item) => item.id === 4 ? { ...item, quantity: 6 } : item);
  const report = buildSaleReport(increased, options);
  assert.deepEqual(report.items.map((item) => item.id), [4, 1, 2, 3]);
  assert.equal(report.totalCents, 14800);
  assert.equal(report.itemCount, 16);

  const decreased = items.map((item) => item.id === 1 ? { ...item, quantity: 2 } : item);
  const updatedReport = buildSaleReport(decreased, options);
  assert.deepEqual(updatedReport.items.map((item) => item.id), [2, 3]);
  assert.equal(updatedReport.totalCents, 6000);
  assert.equal(updatedReport.itemCount, 6);
});

test("group, archived and under-threshold filters retain quantity-aware totals", () => {
  const group = buildSaleReport(items, { ...options, groupFilter: 3 });
  assert.equal(group.totalCents, 4000);
  assert.equal(group.itemCount, 4);

  const unassigned = buildSaleReport(items, { ...options, groupFilter: "unassigned" });
  assert.equal(unassigned.totalCents, 2500);
  assert.equal(unassigned.itemCount, 5);

  const all = buildSaleReport(items, { ...options, includeUnderThreshold: true, includeArchived: true });
  assert.deepEqual(all.items.map((item) => item.id), [5, 1, 2, 3, 4]);
  assert.equal(all.totalCents, 18400);
  assert.equal(all.itemCount, 16);

  const archivedGroup = buildSaleReport(items, { ...options, groupFilter: 3, includeArchived: true });
  assert.equal(archivedGroup.totalCents, 10000);
  assert.equal(archivedGroup.itemCount, 7);
});

test("empty reports and decimal prices have exact totals", () => {
  assert.deepEqual(buildSaleReport([], options), { items: [], totalCents: 0, itemCount: 0 });
  const report = buildSaleReport([
    { ...items[0], finalSoldPriceCents: 1999, quantity: 3 },
    { ...items[1], finalSoldPriceCents: 10, quantity: 3 }
  ], { ...options, includeUnderThreshold: true });
  assert.equal(report.totalCents, 6027);
  assert.equal(report.itemCount, 6);
});
