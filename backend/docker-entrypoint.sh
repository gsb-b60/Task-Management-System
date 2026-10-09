#!/bin/sh
# Wait for database to be ready
echo "Waiting for database..."
until pg_isready -h postgres -p 5432 -U postgres -d todogit; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Database ready! Running migrations..."
pnpm prisma migrate deploy

echo "Generating Prisma client..."
pnpm prisma generate

echo "Starting dev server..."
exec pnpm dev