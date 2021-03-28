import { setFailed } from '@actions/core';
import { build } from './build';
import { getInputs } from './inputs';

const run = async (): Promise<void> => {
  try {
    await build(getInputs());
  } catch (error) {
    setFailed(error.message);
  }
};

run();
