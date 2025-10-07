#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Initializing database..."
cd /app/packages/database && pnpm db:init:prod

echo "Generating OpenAPI spec and Scalar documentation..."
cd /app/apps/backend-api && pnpm generate:openapi

echo "Starting backend API in production mode..."
cd /app
exec node apps/backend-api/dist/index.js
