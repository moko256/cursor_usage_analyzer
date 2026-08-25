#!/usr/bin/env bash

set -euo pipefail

readonly script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly repository_root="$(cd -- "${script_dir}/.." && pwd)"
readonly build_dir="${BUILD_DIR:-${repository_root}/build}"
readonly pages_branch="${PAGES_BRANCH:-gh-pages}"
readonly pages_remote_url="${PAGES_REMOTE_URL:-}"
readonly pages_token="${PAGES_TOKEN:-}"
readonly commit_message="${DEPLOY_COMMIT_MESSAGE:-Deploy static site}"
readonly pages_checkout="$(mktemp -d)"

cleanup() {
	rm -rf -- "${pages_checkout}"
}
trap cleanup EXIT

if [[ ! -d "${build_dir}" ]]; then
	printf 'Build directory does not exist: %s\n' "${build_dir}" >&2
	exit 1
fi

if [[ -z "${pages_remote_url}" ]]; then
	printf 'PAGES_REMOTE_URL must be set.\n' >&2
	exit 1
fi

if [[ -z "${pages_token}" ]]; then
	printf 'PAGES_TOKEN must be set.\n' >&2
	exit 1
fi

git_authenticated() {
	git -c "http.extraheader=AUTHORIZATION: bearer ${pages_token}" "$@"
}

if git_authenticated ls-remote --exit-code --heads "${pages_remote_url}" "${pages_branch}" >/dev/null; then
	git_authenticated clone --branch "${pages_branch}" --single-branch "${pages_remote_url}" "${pages_checkout}"
else
	remote_status=$?
	if [[ "${remote_status}" -ne 2 ]]; then
		printf 'Unable to inspect remote branch %s.\n' "${pages_branch}" >&2
		exit "${remote_status}"
	fi

	git init --initial-branch="${pages_branch}" "${pages_checkout}" >/dev/null
	git -C "${pages_checkout}" remote add origin "${pages_remote_url}"
fi

find "${pages_checkout}" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf -- {} +
cp -a "${build_dir}/." "${pages_checkout}/"
touch "${pages_checkout}/.nojekyll"

git -C "${pages_checkout}" config user.name "${GIT_AUTHOR_NAME:-github-actions[bot]}"
git -C "${pages_checkout}" config user.email "${GIT_AUTHOR_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"
git -C "${pages_checkout}" add --all

if git -C "${pages_checkout}" diff --cached --quiet; then
	printf 'No changes to deploy to %s.\n' "${pages_branch}"
	exit 0
fi

git -C "${pages_checkout}" commit --message "${commit_message}" >/dev/null
git_authenticated -C "${pages_checkout}" push origin "HEAD:${pages_branch}"
