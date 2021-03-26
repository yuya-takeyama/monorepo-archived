#!/bin/bash

set -eu
set -o pipefail

gitops_repo_dir="${GITHUB_WORKSPACE}/gitops-repo"

cd "$gitops_repo_dir"

if [ -z $(git status --porcelain) ]; then
  echo "Nothing to commit"
  exit
fi

branch="${SERVICE_NAME}/$(uuidgen)"
git checkout -b "$branch"
git config --global user.email "${GIT_USER_EMAIL}"
git config --global user.name "${GIT_USER_NAME}"
git add --all
git commit -m "Update ${SERVICE_NAME}"
git push -f origin "$branch"

pull_request_body=""
if [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
  pr_number="${GITHUB_REF#"refs/pull/"}"
  pr_number="${pr_number%"/merge"}"
  pull_request_body="From https://github.com/${GITHUB_REPOSITORY}/pull/${pr_number}"
else
  origin_branch="${GITHUB_REF#"refs/heads/"}"
  pull_request_body="From ${origin_branch} branch"
fi

gh pr create \
  --title "Update ${SERVICE_NAME} in ${NAMESPACE}" \
  --body "${pull_request_body}"
gh pr merge --merge
