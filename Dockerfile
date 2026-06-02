# syntax=docker/dockerfile:1
# Multi-stage build for self-hosting the TanStack Start SSR app under Bun.

# ---------- Build stage ----------
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies against the committed lockfile (reproducible).
COPY package.json bun.lockb bunfig.toml ./
RUN bun install --frozen-lockfile

# Copy the rest of the source and build.
# NOTE: the committed .env supplies the public VITE_* vars, which Vite inlines
# into the client bundle at build time.
COPY . .
RUN bun run build

# ---------- Runtime stage ----------
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# node_modules is copied even though the SSR bundle is self-contained, as a
# safeguard for any dependency that might be resolved at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY server.mjs ./server.mjs

EXPOSE 3000
CMD ["bun", "server.mjs"]
