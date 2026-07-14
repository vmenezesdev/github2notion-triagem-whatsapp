import assert from "node:assert/strict";
import test from "node:test";
import { NotionClient } from "../src/notion-client.mjs";

test("cliente respeita Retry-After em 429", async () => {
  const waits = [];
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return response(429, { code: "rate_limited", message: "slow down" }, { "retry-after": "2" });
    return response(200, { ok: true });
  };
  const client = new NotionClient({
    token: "test-token",
    fetchImpl,
    sleep: async (ms) => waits.push(ms),
    random: () => 0,
    maxAttempts: 2
  });
  assert.deepEqual(await client.request("/v1/test"), { ok: true });
  assert.deepEqual(waits, [2000]);
});

function response(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}
