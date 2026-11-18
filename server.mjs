import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createDeskHandler } from "./server/desk.mjs";

const port = Number(process.env.PORT || 8080);
const dataDir = process.env.DATA_DIR || path.resolve("data");
const distDir = path.resolve("dist");
const handle = createDeskHandler({
  contentDir: path.resolve("content"),
  dataDir,
});

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function safeDist(urlPath) {
  let rel = "";
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.includes("\0") || rel.split("/").includes("..")) return null;
  const root = path.resolve(distDir);
  const file = path.resolve(root, `.${rel}`);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

function sendFile(res, file) {
  const type = types[path.extname(file)] ?? "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", type);
  res.end(fs.readFileSync(file));
}

const server = http.createServer(async (req, res) => {
  try {
    if (await handle(req, res)) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const file = safeDist(url.pathname);
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
      if (req.method === "HEAD") {
        res.statusCode = 200;
        res.end();
        return;
      }
      sendFile(res, file);
      return;
    }
    const index = path.join(distDir, "index.html");
    if (!fs.existsSync(index)) {
      res.statusCode = 503;
      res.end("not built");
      return;
    }
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.end();
      return;
    }
    sendFile(res, index);
  } catch {
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.end("error");
    }
  }
});

server.listen(port, "0.0.0.0");
