import { env, featureStatus, isConfigured } from "@content-engine/config";
import { MemoryRepository, setRepository } from "@content-engine/db";
import { inngest } from "@content-engine/services";
import { serve } from "inngest/node";
import { createServer } from "node:http";
import { functions } from "./functions";

/**
 * Worker process: serves the Inngest functions over HTTP (the Inngest server
 * calls in to run steps) plus a health check. Rendering happens here.
 */
if (!isConfigured("database")) {
  // The dashboard's sample drafts must never leak into the pipeline (they would eat the daily quota).
  setRepository(new MemoryRepository({ seed: false }));
  console.warn("[worker] SUPABASE_URL is not set: using a temporary in-memory store. Drafts will not reach the dashboard.");
}

const inngestHandler = serve({ client: inngest, functions });

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "worker", functions: functions.length, features: featureStatus() }));
    return;
  }
  if (url.pathname.startsWith("/api/inngest")) {
    void inngestHandler(req, res);
    return;
  }
  res.writeHead(404).end();
});

// Renders can take minutes; keep step requests open long enough.
server.requestTimeout = 15 * 60_000;
server.headersTimeout = 15 * 60_000 + 1_000;

const port = env().WORKER_PORT;
server.listen(port, () => {
  console.log(`[worker] listening on :${port} (Inngest endpoint /api/inngest, ${functions.length} functions)`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[worker] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
