#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Initializing database..."
cd /app/packages/database && pnpm db:init

echo "Starting backend API in development mode..."
cd /app
exec pnpm --filter @mono-repo-starter/backend-api dev
