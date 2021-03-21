#!/bin/bash

set -eu
set -o pipefail

service_name="applications"
path=""

if [[ "$OVERLAY" == "staging" ]]; then
  path="staging/${NAMESPACE}"
else
  path="${NAMESPACE}"
fi

gitops_repo_dir="${GITHUB_WORKSPACE}/gitops-repo"

mkdir -p "${gitops_repo_dir}/applications/${path}"
manifest_file="${gitops_repo_dir}/applications/${path}/application.yaml"

cat << EOS > "${manifest_file}"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${NAMESPACE}
  namespace: argocd
spec:
  destination:
    namespace: ${NAMESPACE}
    server: https://kubernetes.default.svc
  project: default
  source:
    directory:
      recurse: true
    path: ${path}
    repoURL: https://github.com/yuya-takeyama/gitops-repo.git
    targetRevision: master
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
EOS

if [[ "$OVERLAY" == "staging" ]]; then
staging_toplevel_manifest_file="${gitops_repo_dir}/applications/staging/application.yaml"
  cat << EOS > "${staging_toplevel_manifest_file}"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: staging
  namespace: argocd
spec:
  destination:
    server: https://kubernetes.default.svc
  project: default
  source:
    directory:
      recurse: true
    path: applications/staging
    repoURL: https://github.com/yuya-takeyama/gitops-repo.git
    targetRevision: master
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOS
fi

cd "${gitops_repo_dir}"

if [ -z $(git status --porcelain) ]; then
  echo "Nothing to commit"
  exit
else
  branch="${service_name}/$(uuidgen)"
	git checkout -b "$branch"
	git config --global user.email "${GIT_USER_EMAIL}"
	git config --global user.name "${GIT_USER_NAME}"
	git add --all
	git commit -m "Update ${service_name}"
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
		--title "Update ${service_name} in ${NAMESPACE}" \
		--body "${pull_request_body}"
	gh pr merge --merge
fi
