# ---- Stage 1: dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build (Prisma client + tsc) ----
FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build

# ---- Stage 3: runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
RUN addgroup -S app && adduser -S app -G app

# Full node_modules (not --prod): the entrypoint needs the Prisma CLI and tsx
# to run migrations and the seed before the API serves its first request.
# Copied from `build`, not `deps`, so the generated Prisma client is included.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist          ./dist
COPY --from=build /app/prisma        ./prisma
# The seed runs from source via tsx and imports app helpers (password/env).
COPY --from=build /app/src           ./src
COPY package.json ./
COPY docker-entrypoint.sh ./

USER app
EXPOSE 5004

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5004/health || exit 1

ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
