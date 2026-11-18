import fs from "node:fs";
import path from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BODY_LIMIT = 32 * 1024;
const LOG_LIMIT = 512 * 1024;
const MAX_DIARIES = 2000;
const BLOCKED = new Set(["keys.json", "lesson_gates.json"]);

function norm(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(Object.assign(new Error("too large"), { status: 413 }));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res, status, body, type) {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), "application/json; charset=utf-8");
}

function safeChild(root, urlPath, prefix) {
  let rel = "";
  try {
    rel = decodeURIComponent(urlPath.slice(prefix.length));
  } catch {
    return null;
  }
  if (rel.includes("\0") || rel.split(/[/\\]/).includes("..")) return null;
  if (BLOCKED.has(path.basename(rel))) return null;
  const rootResolved = path.resolve(root);
  const file = path.resolve(rootResolved, rel);
  if (file !== rootResolved && !file.startsWith(rootResolved + path.sep)) return null;
  return file;
}

function deskId(req) {
  const header = req.headers["x-desk-id"];
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
}

export function createDeskHandler({ contentDir, dataDir }) {
  const logsDir = path.join(dataDir, "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const queues = new Map();

  function withLog(id, work) {
    const previous = queues.get(id) ?? Promise.resolve();
    const run = previous.then(work, work);
    queues.set(id, run.then(() => undefined, () => undefined));
    return run;
  }

  function logFile(id) {
    return path.join(logsDir, `${id}.json`);
  }

  function readLog(id) {
    const file = logFile(id);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  return async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const { pathname } = url;

    if (pathname.includes("keys.json") || pathname.includes("lesson_gates.json")) {
      send(res, 404, "not found", "text/plain; charset=utf-8");
      return true;
    }

    try {
      if (pathname === "/api/log" && (req.method === "GET" || req.method === "POST")) {
        const id = deskId(req);
        if (!id) {
          sendJson(res, 400, { ok: false });
          return true;
        }
        if (req.method === "GET") {
          sendJson(res, 200, readLog(id));
          return true;
        }
        const event = JSON.parse(await readBody(req));
        if (!event || typeof event !== "object" || Array.isArray(event)) {
          sendJson(res, 400, { ok: false });
          return true;
        }
        await withLog(id, async () => {
          const file = logFile(id);
          const exists = fs.existsSync(file);
          if (!exists && fs.readdirSync(logsDir).length >= MAX_DIARIES) {
            sendJson(res, 503, { ok: false });
            return;
          }
          const current = exists ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
          current.push({ ...event, t: new Date().toISOString() });
          const text = JSON.stringify(current);
          if (Buffer.byteLength(text) > LOG_LIMIT) {
            sendJson(res, 413, { ok: false });
            return;
          }
          fs.writeFileSync(file, text + "\n");
          sendJson(res, 200, { ok: true });
        });
        return true;
      }

      if (pathname.startsWith("/api/key/")) {
        const id = decodeURIComponent(pathname.slice("/api/key/".length));
        const keys = JSON.parse(fs.readFileSync(path.join(contentDir, "keys.json"), "utf8"));
        const key = keys[id];
        if (!key) {
          sendJson(res, 404, {});
          return true;
        }
        const part = url.searchParams.get("part");
        if (part === "hint3") sendJson(res, 200, { hint3: key.hint3 });
        else if (part === "sentence") sendJson(res, 200, { sentence: key.sentence });
        else sendJson(res, 400, {});
        return true;
      }

      if (pathname === "/api/check-cells" && req.method === "POST") {
        const body = JSON.parse(await readBody(req));
        const keys = JSON.parse(fs.readFileSync(path.join(contentDir, "keys.json"), "utf8"));
        const key = body.id ? keys[body.id] : undefined;
        if (!key) {
          sendJson(res, 404, {});
          return true;
        }
        sendJson(res, 200, {
          answerOk: norm(body.answer) === norm(key.answer),
          midOk: norm(body.mid) === norm(key.mid),
        });
        return true;
      }

      if (pathname.startsWith("/api/lesson-labels/")) {
        const id = decodeURIComponent(pathname.slice("/api/lesson-labels/".length));
        const gates = JSON.parse(fs.readFileSync(path.join(contentDir, "lesson_gates.json"), "utf8"));
        const labels = (gates[id] ?? []).map((cell) => cell.label);
        sendJson(res, 200, labels);
        return true;
      }

      if (pathname === "/api/check-lesson" && req.method === "POST") {
        const body = JSON.parse(await readBody(req));
        const gates = JSON.parse(fs.readFileSync(path.join(contentDir, "lesson_gates.json"), "utf8"));
        const rows = body.lessonId ? gates[body.lessonId] ?? [] : [];
        const values = body.values ?? [];
        const ok = rows.length > 0 && rows.every((cell, index) => norm(values[index]) === norm(cell.value));
        sendJson(res, 200, { ok });
        return true;
      }

      if (pathname.startsWith("/content/")) {
        const file = safeChild(contentDir, pathname, "/content/");
        if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          send(res, 404, "not found", "text/plain; charset=utf-8");
          return true;
        }
        const ext = path.extname(file);
        const type = ext === ".json" ? "application/json; charset=utf-8" : "text/plain; charset=utf-8";
        send(res, 200, fs.readFileSync(file), type);
        return true;
      }
    } catch (error) {
      const status = error && error.status ? error.status : 400;
      sendJson(res, status, { ok: false });
      return true;
    }

    return false;
  };
}
