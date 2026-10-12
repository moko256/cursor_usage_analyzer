#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION=26.11.1
PNPM_VERSION=10.33.4

install_node() {
	if [[ -x /usr/local/bin/node ]] && [[ "$(/usr/local/bin/node -v 2>/dev/null || true)" == "v${NODE_VERSION}" ]]; then
		return 0
	fi

	local arch archive tmp
	case "$(uname -m)" in
		x86_64) arch=x64 ;;
		aarch64) arch=arm64 ;;
		*)
			echo "unsupported architecture: $(uname -m)" >&2
			exit 1
			;;
	esac
	archive="node-v${NODE_VERSION}-linux-${arch}.tar.xz"
	tmp="$(mktemp -d)"
	curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${archive}" -o "${tmp}/${archive}"
	curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o "${tmp}/SHASUMS256.txt"
	(
		cd "${tmp}"
		grep " ${archive}$" SHASUMS256.txt | sha256sum -c -
	)
	sudo tar -xJf "${tmp}/${archive}" -C /usr/local --strip-components=1 --no-same-owner
	rm -rf "${tmp}"
}

# Agent shells prepend /exec-daemon, whose `node` is the daemon runtime (v22.14).
# Keep that binary for the daemon and answer `node` with the toolchain above.
prefer_node() {
	local runtime="/exec-daemon/cursor-node"
	local signature wrapper

	if [[ -d /exec-daemon && ! -x "${runtime}" && -f /exec-daemon/node ]]; then
		signature="$(od -An -t x1 -N 4 /exec-daemon/node | tr -d ' \n')"
		if [[ "${signature}" == "7f454c46" ]]; then
			sudo cp -a /exec-daemon/node "${runtime}"
		fi
	fi

	if [[ -x "${runtime}" ]]; then
		wrapper="$(mktemp)"
		cat >"${wrapper}" <<'EOF'
#!/bin/sh
if [ "${1:-}" = "/exec-daemon/index.js" ]; then
	exec /exec-daemon/cursor-node "$@"
fi
exec /usr/local/bin/node "$@"
EOF
		sudo mv "${wrapper}" /exec-daemon/node
		sudo chmod 755 /exec-daemon/node
	fi

	local path_line='export PATH="/usr/local/bin:$PATH"'
	if [[ -f "${HOME}/.bashrc" ]] && ! grep -qF "${path_line}" "${HOME}/.bashrc"; then
		printf '\n%s\n' "${path_line}" >>"${HOME}/.bashrc"
	fi
}

install_node
prefer_node

export PATH="/usr/local/bin:${PATH}"
# Node.js 26 does not ship Corepack.
sudo /usr/local/bin/npm install -g "pnpm@${PNPM_VERSION}"

pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
