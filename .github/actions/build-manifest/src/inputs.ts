import { getInput } from '@actions/core';

export type Inputs = {
  serviceName: string;
  overlay: string;
  namespace: string;
  imageTag: string | undefined;
  githubSha: string;
  manifestPath: string;
};

export const getInputs = (): Inputs => {
  const imageTag = getInput('image-tag');

  return {
    serviceName: getInput('service-name', { required: true }),
    overlay: getInput('overlay', { required: true }),
    namespace: getInput('namespace', { required: true }),
    imageTag: imageTag !== '' ? imageTag : undefined,
    githubSha: getInput('github-sha', { required: true }),
    manifestPath: getInput('manifest-path', { required: true }),
  };
};
