#!/usr/bin/env bash

set -euo pipefail

readonly script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly repository_root="$(cd -- "${script_dir}/.." && pwd)"

cd "${repository_root}"
rm -rf -- build

# Do not pass GitHub's ambient credentials to the build or its child processes.
env -u GH_TOKEN -u GITHUB_TOKEN pnpm build
