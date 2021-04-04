import { Context } from '@actions/github/lib/context';
import originalGlob from 'glob';
import { getOctokit } from '@actions/github';
import { promisify } from 'util';
import { join } from 'path';
import { Inputs } from './inputs';

const glob = promisify(originalGlob);

type PullRequestNumberAndState = [number, 'open' | 'closed'];

export const detectClosedPullRequests = async (
  inputs: Inputs,
  ctx: Context,
): Promise<number[]> => {
  const prNumbers = await getExistingPullRequestNumbers(inputs);
  const numbersAndStates = await getPullRequestNumbersAndStates(
    inputs,
    ctx,
    prNumbers,
  );

  return numbersAndStates.reduce<number[]>(
    (acc, prNumberAndState): number[] => {
      const [number, state] = prNumberAndState;
      if (state === 'closed') {
        return [...acc, number];
      } else {
        return acc;
      }
    },
    [],
  );
};

const getExistingPullRequestNumbers = async (
  inputs: Inputs,
): Promise<number[]> => {
  const manifestsDir = `${process.env.GITHUB_WORKSPACE}/${inputs.manifestPath}`;
  const appOfAppsDirGlob = join(
    manifestsDir,
    'applications',
    'staging',
    'pr-*',
  );
  const appsDirGlob = join(manifestsDir, 'staging', 'pr-*');

  const dirs1 = await glob(appOfAppsDirGlob);
  const dirs2 = await glob(appsDirGlob);
  const dirs = [...dirs1, ...dirs2].map(dir => {
    const paths = dir.split('/');
    return paths[paths.length - 1];
  });

  return uniq(dirs).map(dir => parseInt(dir.replace('pr-', '')));
};

const uniq = (arr: string[]): string[] => {
  const obj = arr.reduce<{ [key: string]: true }>((acc, elem) => {
    acc[elem] = true;
    return acc;
  }, {});
  return Object.keys(obj);
};

const getPullRequestNumbersAndStates = async (
  inputs: Inputs,
  ctx: Context,
  prNumbers: number[],
): Promise<PullRequestNumberAndState[]> => {
  const promises = prNumbers.map(
    async (prNumber: number): Promise<PullRequestNumberAndState> => {
      const octokit = getOctokit(inputs.githubToken);
      const res = await octokit.request(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}',
        {
          owner: ctx.repo.owner,
          repo: ctx.repo.repo,
          pull_number: prNumber,
        },
      );
      return [prNumber, res.data.state];
    },
  );
  return Promise.all(promises);
};
