import assert from "node:assert/strict";
import test from "node:test";
import {
  cardSaleFields,
  htmlToText,
  linkSaleSheetContent,
  signedCardSnapshot
} from "../lib/basecamp-webhook";

test("accepts a Basecamp card whose current parent is the Signed column", () => {
  const snapshot = signedCardSnapshot({
    kind: "kanban_card_moved",
    recording: {
      id: 123,
      type: "Kanban::Card",
      parent: { id: 10171470527 },
      title: "John Doe – Citrus Heights",
      content: "<p><strong>Property Address:</strong> 123 Main St</p>",
      app_url: "https://3.basecamp.com/card/123",
      assignees: [{ id: 456 }]
    }
  });

  assert.deepEqual(snapshot, {
    cardId: "123",
    title: "John Doe – Citrus Heights",
    content: "<p><strong>Property Address:</strong> 123 Main St</p>",
    appUrl: "https://3.basecamp.com/card/123",
    teamLeadPersonId: "456"
  });
});

test("ignores the event kind and rejects cards outside Signed", () => {
  assert.equal(
    signedCardSnapshot({
      kind: "anything",
      recording: {
        id: 123,
        type: "Kanban::Card",
        parent: { id: 999 }
      }
    }),
    null
  );
});

test("extracts sale fields from the card title and HTML body", () => {
  const fields = cardSaleFields({
    cardId: "123",
    title: "John Doe – Citrus Heights",
    content:
      "<div>Phone: 555-0100</div><div>Property Address: 123 Main St, Citrus Heights, CA</div>",
    appUrl: "https://3.basecamp.com/card/123",
    teamLeadPersonId: null
  });

  assert.equal(fields.address, "123 Main St, Citrus Heights, CA");
  assert.equal(fields.city, "Citrus Heights");
  assert.equal(fields.clientName, "John Doe");
  assert.equal(fields.missingAddress, false);
  assert.match(fields.notes ?? "", /Basecamp card:/);
  assert.equal(htmlToText("A &amp; B<br>Second"), "A & B\nSecond");
});

test("replaces the Sale Sheet placeholder and is idempotent", () => {
  const saleUrl = "https://log.abeliquidators.com/sales/42";
  const linked = linkSaleSheetContent(
    "<li>Open https://log.abeliquidators.com/sales/[ID]</li>",
    saleUrl
  );

  assert.equal(linked, `<li>Open ${saleUrl}</li>`);
  assert.equal(linkSaleSheetContent(linked, saleUrl), linked);
});

test("accepts a property-address label followed by its value", () => {
  const fields = cardSaleFields({
    cardId: "123",
    title: "John Doe – Citrus Heights",
    content: "<div>Property Address<br>456 Oak Ave, Citrus Heights, CA</div>",
    appUrl: null,
    teamLeadPersonId: null
  });

  assert.equal(fields.address, "456 Oak Ave, Citrus Heights, CA");
  assert.equal(fields.missingAddress, false);
});
