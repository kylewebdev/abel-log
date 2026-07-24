import assert from "node:assert/strict";
import test from "node:test";
import {
  isReportGroupColor,
  matchesReportGroupFilter,
  REPORT_GROUP_COLORS,
  reportGroupColor,
  resolveReportGroupFilter
} from "../lib/report-groups";

test("report group palette uses unique stable values", () => {
  const values = REPORT_GROUP_COLORS.map((color) => color.value);

  assert.equal(new Set(values).size, values.length);
  assert.equal(isReportGroupColor("blue"), true);
  assert.equal(isReportGroupColor("chartreuse"), false);
  assert.equal(reportGroupColor("blue").label, "Blue");
});

test("report group filter accepts only groups on the current sale", () => {
  const groups = [{ id: 3 }, { id: 7 }];

  assert.equal(resolveReportGroupFilter("3", groups), 3);
  assert.equal(resolveReportGroupFilter("unassigned", groups), "unassigned");
  assert.equal(resolveReportGroupFilter("99", groups), "all");
  assert.equal(resolveReportGroupFilter("not-an-id", groups), "all");
  assert.equal(resolveReportGroupFilter(undefined, groups), "all");
});

test("report group matching keeps combined and split reports distinct", () => {
  assert.equal(matchesReportGroupFilter(3, "all"), true);
  assert.equal(matchesReportGroupFilter(null, "all"), true);
  assert.equal(matchesReportGroupFilter(null, "unassigned"), true);
  assert.equal(matchesReportGroupFilter(3, "unassigned"), false);
  assert.equal(matchesReportGroupFilter(3, 3), true);
  assert.equal(matchesReportGroupFilter(7, 3), false);
});
