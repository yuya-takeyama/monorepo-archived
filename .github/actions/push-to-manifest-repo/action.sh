#!/bin/bash

set -eu
set -o pipefail

manifests_dir="${GITHUB_WORKSPACE}/${MANIFEST_PATH}"

cd "$manifests_dir"

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to commit"
  exit
fi

branch="${BRANCH_PREFIX}/$(uuidgen)"
git checkout -b "$branch"
git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config --global user.name "github-actions[bot]"
git add --all
git commit -m "${COMMIT_MESSAGE}"
git push -f origin "$branch"

gh pr create --title "${PULL_REQUEST_TITLE}" --body "${PULL_REQUEST_BODY}"
gh pr merge --merge
