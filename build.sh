#!/usr/bin/env bash

# AirLink LAN - Client Rebuild Script
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR/client"

echo "Building React frontend..."
ESBUILD_BINARY_PATH=/tmp/esbuild node node_modules/vite/bin/vite.js build
echo "Build complete! Artifacts are in client/dist"
