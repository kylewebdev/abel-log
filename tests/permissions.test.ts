import assert from "node:assert/strict";
import test from "node:test";
import { Role } from "@prisma/client";
import {
  canAccessSale,
  canDeleteItem,
  canEditSale,
  canManageItem
} from "../lib/permissions";

const manager = { role: Role.MANAGEMENT, teamId: null };
const teamA = { role: Role.TEAM, teamId: 1 };
const teamB = { role: Role.TEAM, teamId: 2 };

test("management retains full sale and item authority", () => {
  assert.equal(canAccessSale(manager, { assignedTeamId: null }), true);
  assert.equal(canEditSale(manager), true);
  assert.equal(canDeleteItem(manager), true);
  assert.equal(
    canManageItem(manager, {
      submittedTeamId: 1,
      estateSale: { assignedTeamId: 2 }
    }),
    true
  );
});

test("teams can access only their assigned sales", () => {
  assert.equal(canAccessSale(teamA, { assignedTeamId: 1 }), true);
  assert.equal(canAccessSale(teamA, { assignedTeamId: 2 }), false);
  assert.equal(canAccessSale(teamA, { assignedTeamId: null }), false);
});

test("teams cannot edit sale metadata or permanently delete items", () => {
  assert.equal(canEditSale(teamA), false);
  assert.equal(canDeleteItem(teamA), false);
});

test("teams can manage only items they submitted on their currently assigned sale", () => {
  assert.equal(
    canManageItem(teamA, {
      submittedTeamId: 1,
      estateSale: { assignedTeamId: 1 }
    }),
    true
  );
  assert.equal(
    canManageItem(teamA, {
      submittedTeamId: 2,
      estateSale: { assignedTeamId: 1 }
    }),
    false
  );
});

test("sale reassignment neither transfers old item authority nor preserves stale access", () => {
  const teamAItemAfterReassignment = {
    submittedTeamId: 1,
    estateSale: { assignedTeamId: 2 }
  };

  assert.equal(canManageItem(teamA, teamAItemAfterReassignment), false);
  assert.equal(canManageItem(teamB, teamAItemAfterReassignment), false);
});
