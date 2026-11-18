import fs from "node:fs";
import path from "node:path";
import type { Connect } from "vite";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function norm(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function deskPlugin(): Plugin {
  const content = path.resolve("content");
  const logPath = path.join(content, "log.json");
  return {
    name: "desk-log",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, "http://127.0.0.1");
        if (url.pathname.includes("keys.json") || url.pathname.includes("lesson_gates.json")) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        if (url.pathname === "/api/log" && req.method === "GET") {
          const text = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "[]";
          res.setHeader("Content-Type", "application/json");
          res.end(text || "[]");
          return;
        }
        if (url.pathname === "/api/log" && req.method === "POST") {
          const raw = await readBody(req);
          const event = JSON.parse(raw) as Record<string, unknown>;
          const current = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : [];
          current.push({ ...event, t: new Date().toISOString() });
          fs.writeFileSync(logPath, JSON.stringify(current, null, 2) + "\n");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (url.pathname.startsWith("/api/key/")) {
          const id = decodeURIComponent(url.pathname.slice("/api/key/".length));
          const keys = JSON.parse(fs.readFileSync(path.join(content, "keys.json"), "utf8")) as Record<string, Record<string, string>>;
          const key = keys[id];
          res.setHeader("Content-Type", "application/json");
          if (!key) {
            res.statusCode = 404;
            res.end("{}");
            return;
          }
          const part = url.searchParams.get("part");
          if (part === "hint3") res.end(JSON.stringify({ hint3: key.hint3 }));
          else if (part === "sentence") res.end(JSON.stringify({ sentence: key.sentence }));
          else {
            res.statusCode = 400;
            res.end("{}");
          }
          return;
        }
        if (url.pathname === "/api/check-cells" && req.method === "POST") {
          const body = JSON.parse(await readBody(req)) as { id?: string; answer?: string; mid?: string };
          const keys = JSON.parse(fs.readFileSync(path.join(content, "keys.json"), "utf8")) as Record<string, Record<string, string>>;
          const key = body.id ? keys[body.id] : undefined;
          res.setHeader("Content-Type", "application/json");
          if (!key) {
            res.statusCode = 404;
            res.end("{}");
            return;
          }
          res.end(JSON.stringify({
            answerOk: norm(body.answer) === norm(key.answer),
            midOk: norm(body.mid) === norm(key.mid),
          }));
          return;
        }
        if (url.pathname.startsWith("/api/lesson-labels/")) {
          const id = decodeURIComponent(url.pathname.slice("/api/lesson-labels/".length));
          const gates = JSON.parse(fs.readFileSync(path.join(content, "lesson_gates.json"), "utf8")) as Record<string, { label: string }[]>;
          const labels = (gates[id] ?? []).map((cell) => cell.label);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(labels));
          return;
        }
        if (url.pathname === "/api/check-lesson" && req.method === "POST") {
          const body = JSON.parse(await readBody(req)) as { lessonId?: string; values?: string[] };
          const gates = JSON.parse(fs.readFileSync(path.join(content, "lesson_gates.json"), "utf8")) as Record<string, { value: string }[]>;
          const rows = body.lessonId ? gates[body.lessonId] ?? [] : [];
          const values = body.values ?? [];
          const ok = rows.length > 0 && rows.every((cell, index) => norm(values[index]) === norm(cell.value));
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok }));
          return;
        }
        if (url.pathname.startsWith("/content/") && !url.pathname.includes("keys.json")) {
          const rel = decodeURIComponent(url.pathname.slice("/content/".length));
          const file = path.resolve(content, rel);
          if (!file.startsWith(content) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            next();
            return;
          }
          const ext = path.extname(file);
          res.setHeader("Content-Type", ext === ".json" ? "application/json" : "text/plain; charset=utf-8");
          res.end(fs.readFileSync(file));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), deskPlugin()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
