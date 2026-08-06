import assert from "node:assert/strict";
import test from "node:test";
import {
  basecampIntakeCard,
  intakeFingerprint,
  parseBasecampIntake,
  validIntakeAuthorization
} from "../lib/basecamp-intake";

const input = {
  submissionId: "website-123",
  name: "Jane & John Smith",
  phone: "555-0100",
  email: "jane@example.com",
  property_address: "123 <Main> St",
  city: "Sacramento",
  situation: "downsizing",
  contact_method: "phone",
  description: "Needs an estimate & next steps"
};

test("parses website field aliases and builds escaped Basecamp card HTML", () => {
  const parsed = parseBasecampIntake(input);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const card = basecampIntakeCard(parsed.payload);
  assert.equal(card.title, "Jane & John Smith – Sacramento");
  assert.match(card.content, /<strong>Email:<\/strong> jane@example\.com/);
  assert.match(card.content, /123 &lt;Main&gt; St/);
  assert.match(card.content, /Needs an estimate &amp; next steps/);
  assert.match(card.content, /<strong>Submission ID:<\/strong> website-123/);
  assert.doesNotMatch(card.content, /123 <Main>/);
});

test("requires the intake identity and core lead fields", () => {
  assert.deepEqual(parseBasecampIntake({ name: "Jane" }), {
    ok: false,
    error: "submissionId is required and must be at most 128 characters"
  });
});

test("rejects invalid email addresses and oversized fields", () => {
  assert.deepEqual(parseBasecampIntake({ ...input, email: "invalid" }), {
    ok: false,
    error: "email must be a valid email address"
  });
  assert.deepEqual(
    parseBasecampIntake({ ...input, description: "x".repeat(5001) }),
    {
      ok: false,
      error: "description is required and must be at most 5000 characters"
    }
  );
});

test("uses Location pending when the website has no city", () => {
  const parsed = parseBasecampIntake({ ...input, city: "" });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(
      basecampIntakeCard(parsed.payload).title,
      "Jane & John Smith – Location pending"
    );
  }
});

test("fingerprint is stable and changes with the intake data", () => {
  const first = parseBasecampIntake(input);
  const second = parseBasecampIntake({ ...input, city: "Roseville" });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (first.ok && second.ok) {
    assert.equal(intakeFingerprint(first.payload), intakeFingerprint(first.payload));
    assert.notEqual(intakeFingerprint(first.payload), intakeFingerprint(second.payload));
  }
});

test("checks the bearer token without accepting malformed authorization", () => {
  assert.equal(validIntakeAuthorization("Bearer secret", "secret"), true);
  assert.equal(validIntakeAuthorization("Bearer wrong", "secret"), false);
  assert.equal(validIntakeAuthorization("secret", "secret"), false);
  assert.equal(validIntakeAuthorization(null, "secret"), false);
});
