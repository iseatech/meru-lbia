import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // IMPORTANT:
  // We DO NOT mount vite.middlewares globally because it can swallow backend routes in middlewareMode.
  // Instead we wrap it and bypass backend prefixes explicitly.
  app.use((req, res, next) => {
    const url = (req as any).originalUrl || (req as any).url || "";
    if (url.startsWith("/api") || url.startsWith("/meru") || url.startsWith("/verify")) {
      return next();
    }
    return (vite.middlewares as any)(req, res, next);
  });

  // SPA fallback for frontend routes only
  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl || "";

    // Never let SPA fallback handle backend routes
    if (url.startsWith("/api") || url.startsWith("/meru") || url.startsWith("/verify")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");

      // Always reload index.html from disk in dev
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
