import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createDeskHandler } from "./server/desk.mjs";

function deskPlugin(): Plugin {
  const handle = createDeskHandler({
    contentDir: path.resolve("content"),
    dataDir: path.resolve("data"),
  });
  return {
    name: "desk",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (!(await handle(req, res))) next();
        } catch {
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.end("error");
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), deskPlugin()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
