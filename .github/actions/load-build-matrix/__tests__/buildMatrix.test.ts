import { BuildMatrix, getBuildMatrix } from '../src/buildMatrix';
import { Context } from '@actions/github/lib/context';

const services = ['ingress', 'service-foo', 'service-bar', 'frontend'];

const pullRequestCtx: Context = {
  eventName: 'pull_request',
  sha: 'deadbeef',
  payload: {
    pull_request: {
      number: 123,
    },
  },
  ref: 'refs/pr/123',
  workflow: 'workflow',
  job: 'job',
  actor: 'octocat',
  action: 'action',
  runNumber: 123,
  runId: 123,
  issue: {
    owner: 'octocat',
    repo: 'github',
    number: 123,
  },
  repo: {
    owner: 'octocat',
    repo: 'github',
  },
};

test('develop branch', () => {
  const buildMatrix = getBuildMatrix(getPushContext('develop'));
  expect(buildMatrix).toEqual<BuildMatrix>({
    services,
    buildParams: [JSON.stringify({ namespace: 'develop', overlay: 'develop' })],
  });
});

test('release branch', () => {
  const buildMatrix = getBuildMatrix(getPushContext('release'));
  expect(buildMatrix).toEqual<BuildMatrix>({
    services,
    buildParams: [JSON.stringify({ namespace: 'release', overlay: 'release' })],
  });
});

test('master branch', () => {
  const buildMatrix = getBuildMatrix(getPushContext('master'));
  expect(buildMatrix).toEqual<BuildMatrix>({
    services,
    buildParams: [
      JSON.stringify({ namespace: 'production', overlay: 'production' }),
    ],
  });
});

test('Pull Request', () => {
  const buildMatrix = getBuildMatrix(pullRequestCtx);
  expect(buildMatrix).toEqual<BuildMatrix>({
    services,
    buildParams: [JSON.stringify({ namespace: 'pr-123', overlay: 'staging' })],
  });
});

const getPushContext = (branch: string): Context => {
  return {
    ...pullRequestCtx,
    eventName: 'push',
    ref: `refs/heads/${branch}`,
    payload: {},
    issue: {
      owner: 'octocat',
      repo: 'github',
      number: 123,
    },
    repo: {
      owner: 'octocat',
      repo: 'github',
    },
  };
};
