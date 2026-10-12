#!/usr/bin/env bash
set -euo pipefail

# SvelteKit 3 requires Node.js >= 22.17. The image's /exec-daemon/node is older.
# Use the Node version shipped with nvm (it includes Corepack).
NODE_VERSION=22.23.3

export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
set +u
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"
nvm install "${NODE_VERSION}"
nvm alias default "${NODE_VERSION}"
nvm use "${NODE_VERSION}"
set -u
hash -r

corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
