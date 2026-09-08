#!/usr/bin/env bash
set -euo pipefail

corepack enable
corepack prepare --activate
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
