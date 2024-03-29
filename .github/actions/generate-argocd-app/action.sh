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

manifests_dir="${GITHUB_WORKSPACE}/${MANIFEST_PATH}"

mkdir -p "${manifests_dir}/applications/${path}"
manifest_file="${manifests_dir}/applications/${path}/application.yaml"

sync_policy=""
if [[ "$ENABLE_AUTO_SYNC" == "true" ]]; then
  sync_policy="automated: { prune: true, selfHeal: true }"
fi

cat << EOS > "${manifest_file}"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${NAMESPACE}
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  destination:
    namespace: ${NAMESPACE}
    server: https://kubernetes.default.svc
  project: default
  source:
    directory:
      recurse: true
    path: ${path}
    repoURL: ${REPO_URL}
    targetRevision: master
  syncPolicy:
    ${sync_policy}
    syncOptions:
    - CreateNamespace=true
EOS

manifest_dir="${manifests_dir}/${path}"
namespace_file="${manifest_dir}/namespace.yaml"

mkdir -p "${manifest_dir}"
cat << EOS > "${namespace_file}"
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE}
EOS

if [[ "$OVERLAY" == "staging" ]]; then
staging_toplevel_manifest_file="${manifests_dir}/applications/staging/application.yaml"
  cat << EOS > "${staging_toplevel_manifest_file}"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: staging
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  destination:
    server: https://kubernetes.default.svc
  project: default
  source:
    directory:
      recurse: true
    path: applications/staging
    repoURL: ${REPO_URL}
    targetRevision: master
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOS
fi
