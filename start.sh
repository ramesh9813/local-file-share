#!/usr/bin/env bash

# AirLink LAN - Start Script
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "⚡ Starting AirLink LAN File Sharing Web Application"
echo "=========================================================="

PORT=${PORT:-5000}
export PORT

node server/index.js
