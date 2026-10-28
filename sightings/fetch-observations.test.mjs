import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { fetchObservations } from "./fetch-observations.mjs";

const success = () => Response.json({ results: [{ id: 123 }] });
function setup(responses) {
  const waits = [];
  const calls = [];
  return {
    waits, calls,
    options: {
      userAgent: "Nautica/test",
      sleep: async (ms) => { waits.push(ms); },
      fetch: async (...args) => {
        calls.push(args);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        assert(response, "unexpected extra fetch");
        return response;
      },
    },
  };
}

test("recovers from the socket-closed failure seen in Actions", async () => {
  const s = setup([new TypeError("fetch failed", { cause: new Error("other side closed") }), success()]);
  assert.deepEqual(await fetchObservations("https://example.test", "Europe/Crab", s.options), [{ id: 123 }]);
  assert.deepEqual(s.waits, [2000]);
  assert.equal(s.calls[0][1].headers["User-Agent"], "Nautica/test");
  assert(s.calls[0][1].signal instanceof AbortSignal);
  assert.notEqual(s.calls[0][1].signal, s.calls[1][1].signal);
});

test("retries timeout, HTTP 408 and HTTP 503 with bounded backoff", async () => {
  const s = setup([new DOMException("timed out", "TimeoutError"), new Response(null, { status: 408 }), new Response(null, { status: 503 }), success()]);
  await fetchObservations("https://example.test", "Europe/Crab", s.options);
  assert.deepEqual(s.waits, [2000, 4000, 8000]);
});

test("honors rate-limit Retry-After, capped at 30 seconds", async () => {
  for (const [header, expected] of [["7", 7000], ["3600", 30000], ["invalid", 2000]]) {
    const s = setup([new Response(null, { status: 429, headers: { "Retry-After": header } }), success()]);
    await fetchObservations("https://example.test", "Europe/Crab", s.options);
    assert.deepEqual(s.waits, [expected]);
  }
});

test("retries when the connection closes while reading the response body", async () => {
  const body = new ReadableStream({ start(controller) { controller.error(new TypeError("terminated")); } });
  const s = setup([new Response(body), success()]);
  await fetchObservations("https://example.test", "Europe/Crab", s.options);
  assert.deepEqual(s.waits, [2000]);
});

test("fails after four attempts with the affected group and original cause", async () => {
  const original = new TypeError("fetch failed");
  const s = setup([original, original, original, original]);
  await assert.rejects(fetchObservations("https://example.test", "Vietnam/Shark", s.options), (error) => {
    assert.match(error.message, /Vietnam\/Shark failed after 4 attempt/);
    assert.equal(error.cause, original);
    return true;
  });
  assert.equal(s.calls.length, 4);
  assert.deepEqual(s.waits, [2000, 4000, 8000]);
});

test("does not retry permanent HTTP errors", async () => {
  const s = setup([new Response(null, { status: 400 })]);
  await assert.rejects(fetchObservations("https://example.test", "Europe/Crab", s.options), (error) => {
    assert.match(error.cause.message, /HTTP 400/);
    return true;
  });
  assert.equal(s.calls.length, 1);
  assert.deepEqual(s.waits, []);
});

test("rejects invalid JSON and missing results instead of publishing an empty group", async () => {
  for (const response of [new Response("bad json"), Response.json({}), Response.json({ results: null })]) {
    const s = setup([response]);
    await assert.rejects(fetchObservations("https://example.test", "Europe/Crab", s.options));
    assert.equal(s.calls.length, 1);
    assert.deepEqual(s.waits, []);
  }
});

test("accepts a genuinely empty results array", async () => {
  const s = setup([Response.json({ results: [] })]);
  assert.deepEqual(await fetchObservations("https://example.test", "Europe/Crab", s.options), []);
  assert.deepEqual(s.waits, []);
});

test("the per-attempt timeout also interrupts a stalled response body", async (t) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"results":[');
    // Deliberately never finish the body.
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const waits = [];
  await assert.rejects(fetchObservations(url, "Australia/Turtle", {
    userAgent: "Nautica/test", timeoutMs: 30,
    sleep: async (ms) => { waits.push(ms); },
  }), (error) => {
    assert.match(error.message, /Australia\/Turtle failed after 4 attempt/);
    assert.match(error.cause.name, /^(TimeoutError|AbortError)$/);
    return true;
  });
  assert.deepEqual(waits, [2000, 4000, 8000]);
});
