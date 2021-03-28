import { Inputs } from './inputs';
import { exec } from '@actions/exec';
import { mkdirSync, writeFileSync } from 'fs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import envsub from 'envsub';
import originalGlob from 'glob';
import { promisify } from 'util';

const glob = promisify(originalGlob);

export const build = async (inputs: Inputs): Promise<void> => {
  const kubernetesDir = `${process.env.GITHUB_WORKSPACE}/${inputs.serviceName}/kubernetes`;
  const inputDir = `${process.env.GITHUB_WORKSPACE}/${inputs.serviceName}/kubernetes/overlays/${inputs.overlay}`;
  const manifestDir = `${process.env.GITHUB_WORKSPACE}/${inputs.manifestPath}`;
  const outputDir = getOutputDir(inputs, manifestDir);

  process.chdir(kubernetesDir);

  const files = await glob('**/*.yaml');
  const promises = files.map((file: string) =>
    envsub({
      templateFile: file,
      options: {
        envs: [{ name: 'NAMESPACE', value: inputs.namespace }],
      },
    }),
  );
  await Promise.all(promises);

  mkdirSync(outputDir, { recursive: true });
  process.chdir(inputDir);

  if (inputs.imageTag) {
    await exec(
      'kustomize',
      ['edit', 'set', 'image', `${inputs.serviceName}=${inputs.imageTag}`],
      { silent: true },
    );
  }

  await createMetadataConfigMap(inputs);
  await kustomizeBuild(inputDir, outputDir);
};

const createMetadataConfigMap = async (inputs: Inputs): Promise<void> => {
  await exec(
    'kustomize',
    [
      'edit',
      'add',
      'configmap',
      `${inputs.serviceName}-metadata`,
      `--from-literal=NAMESPACE=${inputs.namespace}`,
      `--from-literal=SERVICE_NAME=${inputs.serviceName}`,
      `--from-literal=OVERLAY=${inputs.overlay}`,
      `--from-literal=GITHUB_SHA=${inputs.githubSha}`,
      `--behavior=create`,
    ],
    { silent: true },
  );
};

const getOutputDir = (inputs: Inputs, manifestDir: string): string => {
  if (inputs.overlay === 'staging') {
    return `${manifestDir}/${inputs.overlay}/${inputs.namespace}/${inputs.serviceName}`;
  } else {
    return `${manifestDir}/${inputs.overlay}/${inputs.serviceName}`;
  }
};

const kustomizeBuild = async (
  inputDir: string,
  outputDir: string,
): Promise<void> => {
  let manifest = '';
  await exec('kustomize', ['build', inputDir], {
    silent: true,
    listeners: {
      stdout: (data: Buffer) => {
        manifest += data.toString();
      },
    },
  });
  writeFileSync(`${outputDir}/manifest.yaml`, manifest);
};
