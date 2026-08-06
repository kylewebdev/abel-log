import assert from "node:assert/strict";
import test from "node:test";
import { deleteEstateSaleRecords } from "../lib/estate-sale-deletion";

test("detaches Basecamp history before permanently deleting a sale", async () => {
  const calls: Array<{ operation: string; args: unknown }> = [];
  const client = {
    basecampCardLink: {
      async updateMany(args: unknown) {
        calls.push({ operation: "detachBasecampLink", args });
      }
    },
    soldItem: {
      async deleteMany(args: unknown) {
        calls.push({ operation: "deleteSoldItems", args });
      }
    },
    estateSale: {
      async delete(args: unknown) {
        calls.push({ operation: "deleteEstateSale", args });
      }
    }
  };

  await deleteEstateSaleRecords(client, 42);

  assert.deepEqual(calls, [
    {
      operation: "detachBasecampLink",
      args: { where: { estateSaleId: 42 }, data: { estateSaleId: null } }
    },
    {
      operation: "deleteSoldItems",
      args: { where: { estateSaleId: 42 } }
    },
    {
      operation: "deleteEstateSale",
      args: { where: { id: 42 } }
    }
  ]);
});
