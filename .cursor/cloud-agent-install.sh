#!/usr/bin/env bash
set -euo pipefail

# SvelteKit 3 requires Node.js >= 22.17. /exec-daemon/node is the older daemon runtime.
# nvm's Node 22 includes Corepack, so pnpm stays on `corepack enable`.
NODE_VERSION=22.23.3

export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
set +u
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"
nvm install "${NODE_VERSION}"
nvm alias default "${NODE_VERSION}"
nvm use "${NODE_VERSION}"
set -u

# When this Node is already on PATH, `nvm use` keeps that position. /exec-daemon
# is ahead of it, so prepend the selected bin explicitly.
export PATH="${NVM_BIN}:${PATH}"
hash -r

bashrc_line="export PATH=\"\${NVM_DIR}/versions/node/v${NODE_VERSION}/bin:\${PATH}\""
if [[ -f "${HOME}/.bashrc" ]] && ! grep -qF "${bashrc_line}" "${HOME}/.bashrc"; then
	printf '\n%s\n' "${bashrc_line}" >>"${HOME}/.bashrc"
fi

corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
