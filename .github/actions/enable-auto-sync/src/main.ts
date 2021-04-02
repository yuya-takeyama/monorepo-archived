import { setFailed } from '@actions/core';
import { context } from '@actions/github';
import { enableAutoSync } from './enableAutoSync';

const run = async (): Promise<void> => {
  try {
    await enableAutoSync(context);
  } catch (error) {
    setFailed(error.message);
  }
};

run();
