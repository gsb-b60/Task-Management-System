#!/bin/sh
# Container entrypoint: migrate, seed once, then start the API.
# Runs as the non-root `app` user. No pnpm shim in the runtime image —
# node_modules/.bin is all we need.
set -e

echo "Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "Seeding (skipped automatically when data already exists)..."
node_modules/.bin/tsx prisma/seed.ts

echo "Starting API..."
exec "$@"
