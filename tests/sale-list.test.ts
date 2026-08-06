import assert from "node:assert/strict";
import test from "node:test";
import {
  saleListArchiveResultPath,
  shouldIncludeArchivedSales
} from "../lib/sale-list";

test("archived sales are included only for the explicit true query value", () => {
  assert.equal(shouldIncludeArchivedSales("true"), true);
  assert.equal(shouldIncludeArchivedSales("false"), false);
  assert.equal(shouldIncludeArchivedSales(["true"]), false);
  assert.equal(shouldIncludeArchivedSales(undefined), false);
});

test("sale archive actions return to the requested list view with feedback", () => {
  assert.equal(
    saleListArchiveResultPath({ includeArchived: false, result: "archived" }),
    "/sales?archived=1"
  );
  assert.equal(
    saleListArchiveResultPath({ includeArchived: true, result: "restored" }),
    "/sales?include_archived=true&restored=1"
  );
});
