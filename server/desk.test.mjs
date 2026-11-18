import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDeskHandler } from "./desk.mjs";

const contentDir = path.resolve("content");

function serve(dataDir) {
  const handle = createDeskHandler({ contentDir, dataDir });
  const server = http.createServer(async (req, res) => {
    if (!(await handle(req, res))) {
      res.statusCode = 404;
      res.end("no");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

test("diaries are separate and private files stay hidden", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dp-desk-"));
  const { server, port } = await serve(dataDir);
  const base = `http://127.0.0.1:${port}`;
  const one = crypto.randomUUID();
  const two = crypto.randomUUID();
  try {
    const hidden = await fetch(`${base}/content/keys.json`);
    assert.equal(hidden.status, 404);
    const notes = await fetch(`${base}/content/../memory.md`);
    assert.equal(notes.status, 404);

    const missing = await fetch(`${base}/api/log`);
    assert.equal(missing.status, 400);

    const saved = await fetch(`${base}/api/log`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-desk-id": one },
      body: JSON.stringify({ type: "rule", text: "one" }),
    });
    assert.equal(saved.status, 200);

    const own = await fetch(`${base}/api/log`, { headers: { "x-desk-id": one } });
    const other = await fetch(`${base}/api/log`, { headers: { "x-desk-id": two } });
    assert.equal((await own.json()).length, 1);
    assert.equal((await other.json()).length, 0);

    const lesson = await fetch(`${base}/content/lessons/f1d1.md`);
    assert.equal(lesson.status, 200);
    assert.match(await lesson.text(), /One index/);
  } finally {
    server.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
