#!/bin/bash

set -eu
set -o pipefail

image_name="${IMAGE_NAME_PREFIX}${IMAGE_NAME}"
overlay=""
namespace=""
image_tags=""

if [[ "$GITHUB_EVENT_NAME" == "push" ]]; then
  branch="${GITHUB_REF#"refs/heads/"}"

  if [[ "$branch" == "develop" ]]; then
    overlay="develop"
    namespace="develop"
    image_tags="$image_name:develop.$GITHUB_SHA"
  elif [[ "$branch" == "release" ]]; then
    overlay="release"
    namespace="release"
    image_tags="$image_name:release.$GITHUB_SHA"
  elif [[ "$branch" == "master" ]]; then
    overlay="production"
    namespace="production"
    image_tags="$image_name:production.$GITHUB_SHA"
  else
    >&2 echo "Invalid branch name: $branch"
    exit 1
  fi
elif [[ "$GITHUB_EVENT_NAME" == "pull_request" ]]; then
  pr_number="${GITHUB_REF#"refs/pull/"}"
  pr_number="${pr_number%"/merge"}"
  overlay="staging"
  namespace="pr-$pr_number"
  image_tags="$image_name:pr-$pr_number.$GITHUB_SHA"
fi

echo "::set-output name=overlay::$overlay"
echo "::set-output name=namespace::$namespace"
echo "::set-output name=image-tags::$image_tags"
