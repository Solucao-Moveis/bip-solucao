// Production server for self-hosting the TanStack Start SSR app under Bun.
//
// On Cloudflare Workers the *platform* serves the static assets (dist/client)
// and the worker only does SSR. When self-hosting (EasyPanel/Docker) there is
// no platform asset layer, so this server reproduces that behaviour:
//   1. Try to serve a real file from dist/client (the built static assets).
//   2. Otherwise hand the request to the SSR fetch handler from dist/server.
//
// Server-side env (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
// SUPABASE_SERVICE_ROLE_KEY) is read from process.env at runtime and passed to
// the handler as the Cloudflare-style `env` argument. The VITE_* vars were
// already baked into the client bundle at build time.

import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, sep } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, 'dist', 'client');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Import the SSR handler. The default export is the Web-standard worker object
// `{ fetch }` produced by TanStack Start's server-entry.
const serverModule = await import('./dist/server/index.js');
const handler = serverModule.default;

if (!handler || typeof handler.fetch !== 'function') {
  throw new Error(
    'SSR entrypoint dist/server/index.js does not export a default { fetch } handler.',
  );
}

// Minimal Cloudflare-Workers-compatible execution context. The SSR handler may
// call ctx.waitUntil()/ctx.passThroughOnException(); under Bun we just no-op.
const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

// Resolve a request pathname to a file inside dist/client, guarding against
// path traversal (e.g. "/../../etc/passwd"). Returns null if the resolved path
// escapes CLIENT_DIR.
function resolveStaticPath(pathname) {
  // Decode percent-encoding; bail on malformed input.
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  // normalize() collapses ".." segments; we then verify containment.
  const safePath = normalize(join(CLIENT_DIR, decoded));
  if (safePath !== CLIENT_DIR && !safePath.startsWith(CLIENT_DIR + sep)) {
    return null;
  }
  return safePath;
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  // Allow large request bodies (photo uploads etc.); default is 128MB.
  maxRequestBodySize: 1024 * 1024 * 1024,
  async fetch(req) {
    const url = new URL(req.url);

    // Only GET/HEAD can be satisfied by a static file; everything else (POST
    // server functions, etc.) goes straight to SSR.
    if (req.method === 'GET' || req.method === 'HEAD') {
      const filePath = resolveStaticPath(url.pathname);
      if (filePath) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          // Bun infers Content-Type from the file extension.
          return new Response(file);
        }
      }
    }

    // Fall through to the SSR handler. Pass process.env as the CF-style `env`
    // so server code reading env via the platform binding keeps working, while
    // our app reads process.env directly anyway.
    return handler.fetch(req, process.env, ctx);
  },
});

console.log(`[server] SSR + static listening on http://${server.hostname}:${server.port}`);
