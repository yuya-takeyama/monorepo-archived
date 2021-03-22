import { setOutput, setFailed } from '@actions/core';
import { context } from '@actions/github';
import { getBuildMatrix, BuildMatrix } from './buildMatrix';

const run = (): void => {
  try {
    const matrix: BuildMatrix = getBuildMatrix(context);

    setOutput('matrix', JSON.stringify(matrix));
  } catch (error) {
    setFailed(error.message);
  }
};

run();
