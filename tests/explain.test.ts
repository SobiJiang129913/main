import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/explain/route";
import { isExplanationRequest, isExplanation, explanationKey } from "../src/lib/explanation";

const input = { kind: "word", text: "attention", context: "To read deeply is to pay attention." };
const note = { meaning: "注意力", explanation: "pay attention 表示专注。", example: "Pay attention to the rhythm.", question: "注意力如何影响阅读？" };
const realFetch = globalThis.fetch;
const original = { enabled: process.env.LUMI_AI_ENABLED, key: process.env.LUMI_OPENAI_API_KEY, openai: process.env.OPENAI_API_KEY, provider: process.env.LUMI_AI_PROVIDER };
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [name, value] of [["LUMI_AI_ENABLED", original.enabled], ["LUMI_OPENAI_API_KEY", original.key], ["OPENAI_API_KEY", original.openai], ["LUMI_AI_PROVIDER", original.provider]]) {
    if (value === undefined) delete process.env[name!]; else process.env[name!] = value;
  }
});
function setup() {
  process.env.LUMI_AI_ENABLED = "true";
  process.env.LUMI_AI_PROVIDER = "openai";
  process.env.LUMI_OPENAI_API_KEY = "unit-test-only-not-a-real-key";
  globalThis.fetch = async () => { throw new Error("Unexpected upstream call"); };
}
function request(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request("https://lumi.test/api/explain", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
function wire(text = JSON.stringify(note), status = "completed") {
  return Response.json({ id: "resp_test", object: "response", status, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] }] });
}

test("validates request limits, membership and response shape", () => {
  assert.ok(isExplanationRequest(input));
  for (const bad of [null, [], { ...input, kind: "other" }, { ...input, text: "elsewhere" }, { ...input, text: "x".repeat(121) }, { ...input, context: "attention".repeat(500) }]) assert.equal(isExplanationRequest(bad), false);
  assert.ok(isExplanation(note));
  assert.equal(isExplanation({ ...note, question: "" }), false);
  assert.notEqual(explanationKey(input), explanationKey({ ...input, context: "Please pay attention." }));
});

test("rejects cross-origin and non-JSON requests before calling OpenAI", async () => {
  setup();
  assert.equal((await POST(request(input, { origin: "https://other.test" }))).status, 403);
  assert.equal((await POST(request(input, { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await POST(request(input, { "content-type": "text/plain" }))).status, 415);
});

test("rejects malformed, invalid and oversized bodies", async () => {
  setup();
  assert.equal((await POST(new Request("https://lumi.test/api/explain", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400);
  assert.equal((await POST(request({ ...input, kind: "invalid" }))).status, 400);
  assert.equal((await POST(request({ text: "x".repeat(25000) }))).status, 413);
});

test("disabled and missing-key setups do not call OpenAI", async () => {
  setup(); delete process.env.LUMI_AI_ENABLED;
  assert.equal((await (await POST(request())).json()).code, "DISABLED");
  process.env.LUMI_AI_ENABLED = "true"; delete process.env.LUMI_OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
  assert.equal((await (await POST(request())).json()).code, "NOT_CONFIGURED");
});

test("word and sentence requests use fixed OpenAI endpoint, structured output, no storage", async () => {
  setup();
  for (const selection of [input, { kind: "sentence", text: input.context, context: input.context }]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), "https://api.openai.com/v1/responses");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.store, false); assert.equal(body.max_output_tokens, 1200);
      assert.equal(body.text.format.type, "json_schema"); assert.equal(body.text.format.strict, true);
      assert.deepEqual(JSON.parse(body.input), selection);
      return wire();
    };
    const response = await POST(request(selection));
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual((await response.json()).explanation, note);
  }
});

test("maps upstream auth, quota and server failures without leaking details or retrying", async () => {
  setup();
  for (const [status, expected] of [[401, 503], [403, 503], [429, 429], [500, 502]]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ error: { message: "PRIVATE_PROVIDER_DETAIL", type: "test_error" } }, { status }); };
    const response = await POST(request());
    assert.equal(response.status, expected); assert.equal(calls, 1);
    const body = await response.text(); assert.ok(!body.includes("PRIVATE_PROVIDER_DETAIL")); assert.ok(!body.includes("unit-test-only"));
  }
});

test("handles network and timeout failures", async () => {
  setup();
  globalThis.fetch = async () => { throw new TypeError("connection failed"); };
  assert.equal((await POST(request())).status, 502);
  globalThis.fetch = async () => { const error = new Error("timed out"); error.name = "TimeoutError"; throw error; };
  assert.equal((await POST(request())).status, 504);
});

test("rejects incomplete, refused, malformed and invalid model responses", async () => {
  setup();
  for (const response of [wire("{}", "incomplete"), wire(""), wire("not JSON"), wire('{"meaning":"only one field"}')]) {
    globalThis.fetch = async () => response;
    assert.equal((await POST(request())).status, 502);
  }
});

test("applies a bounded per-process request window before further upstream calls", async () => {
  setup(); let calls = 0; let limited = false;
  globalThis.fetch = async () => { calls++; return wire(); };
  for (let i = 0; i < 21; i++) {
    const response = await POST(request());
    if (response.status === 429) { limited = true; assert.ok(response.headers.get("retry-after")); break; }
    assert.equal(response.status, 200);
  }
  assert.ok(limited); assert.ok(calls <= 20);
});
