export IMAGE_NAME_PREFIX="ghcr.io/yuya-takeyama/monorepo/"
export SERVICE_NAME="service-foo"
export GITHUB_SHA="deadbeef"

@test "returns build params for develop when the event is 'push' to 'develop' branch" {
  GITHUB_EVENT_NAME="push" GITHUB_REF="refs/heads/develop" run ./action.sh
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "::set-output name=overlay::develop" ]
  [ "${lines[1]}" = "::set-output name=namespace::develop" ]
  [ "${lines[2]}" = "::set-output name=image-tags::ghcr.io/yuya-takeyama/monorepo/service-foo:develop.deadbeef" ]
}

@test "returns build params for release when the event is 'push' to 'release' branch" {
  GITHUB_EVENT_NAME="push" GITHUB_REF="refs/heads/release" run ./action.sh
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "::set-output name=overlay::release" ]
  [ "${lines[1]}" = "::set-output name=namespace::release" ]
  [ "${lines[2]}" = "::set-output name=image-tags::ghcr.io/yuya-takeyama/monorepo/service-foo:release.deadbeef" ]
}

@test "returns build params for production when the event is 'push' to 'master' branch" {
  GITHUB_EVENT_NAME="push" GITHUB_REF="refs/heads/master" run ./action.sh
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "::set-output name=overlay::production" ]
  [ "${lines[1]}" = "::set-output name=namespace::production" ]
  [ "${lines[2]}" = "::set-output name=image-tags::ghcr.io/yuya-takeyama/monorepo/service-foo:production.deadbeef" ]
}

@test "returns build params for staging when the event is 'pull_request'" {
  GITHUB_EVENT_NAME="pull_request" GITHUB_REF="refs/pull/123/merge" run ./action.sh
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "::set-output name=overlay::staging" ]
  [ "${lines[1]}" = "::set-output name=namespace::pr-123" ]
  [ "${lines[2]}" = "::set-output name=image-tags::ghcr.io/yuya-takeyama/monorepo/service-foo:pr-123.deadbeef" ]
}
