import { setOutput, setFailed } from '@actions/core';
import { context } from '@actions/github';
import { getInputs } from './inputs';
import { detectClosedPullRequests } from './detectClosedPullRequests';

const run = async (): Promise<void> => {
  try {
    const pullRequestNumbers = await detectClosedPullRequests(
      getInputs(),
      context,
    );

    setOutput('pull-request-numbers', JSON.stringify(pullRequestNumbers));
  } catch (error) {
    setFailed(error.message);
  }
};

run();
