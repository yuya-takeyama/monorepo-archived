import { getInput } from '@actions/core';

export type Inputs = {
  githubToken: string;
  manifestPath: string;
};

export const getInputs = (): Inputs => {
  return {
    githubToken: getInput('github-token', { required: true }),
    manifestPath: getInput('manifest-path', { required: true }),
  };
};
