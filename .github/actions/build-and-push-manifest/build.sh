#!/bin/bash

set -eu
set -o pipefail

cd "${SERVICE_NAME}/kubernetes/overlays/${OVERLAY}"
kustomize edit set image "${SERVICE_NAME}=${IMAGE_TAG}"

input_dir="${GITHUB_WORKSPACE}/${SERVICE_NAME}/kubernetes/overlays/${OVERLAY}"
gitops_repo_dir="${GITHUB_WORKSPACE}/gitops-repo"
output_dir=""

if [[ "${OVERLAY}" == "staging" ]]; then
  output_dir="${gitops_repo_dir}/${OVERLAY}/${NAMESPACE}/${SERVICE_NAME}"
else
  output_dir="${gitops_repo_dir}/${OVERLAY}/${SERVICE_NAME}"
fi

mkdir -p "${output_dir}"
kustomize build "${input_dir}" > ${output_dir}/manifest.yaml
