import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import vultr, { API_KEY_ENV, BASE_URL_ENV } from "../extensions/vultr.ts";

let server: Server;
const agents: (string | undefined)[] = [];
const keys: (string | undefined)[] = [];

before(async () => {
  server = createServer((req, res) => {
    agents.push(req.headers["user-agent"]);
    keys.push(req.headers["authorization"]);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ object: "list", data: [] }));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  process.env[BASE_URL_ENV] = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  process.env["PI_CODING_AGENT_DIR"] = mkdtempSync(join(tmpdir(), "vultr-pi-"));
});

after(() => server.close());

test("the catalog request names the extension and its version", async () => {
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  const registered: string[] = [];
  await vultr({ registerProvider: (name: string) => registered.push(name) } as unknown as ExtensionAPI);
  assert.deepEqual(registered, ["vultr"]);
  assert.equal(agents.length, 1);
  assert.ok(agents[0]?.startsWith(`vultr-model-provider-pi/${version} vultr-model-catalog/`), agents[0]);
});

// The gateway answers the catalog for the key that asks, so the read carries the key.
test("the catalog request carries the key when one is set, and none otherwise", async () => {
  const api = { registerProvider: () => {} } as unknown as ExtensionAPI;
  const saved = process.env[API_KEY_ENV];
  try {
    delete process.env[API_KEY_ENV];
    keys.length = 0;
    await vultr(api);
    process.env[API_KEY_ENV] = "test-key";
    await vultr(api);
    assert.deepEqual(keys, [undefined, "Bearer test-key"]);
  } finally {
    if (saved === undefined) delete process.env[API_KEY_ENV];
    else process.env[API_KEY_ENV] = saved;
  }
});
