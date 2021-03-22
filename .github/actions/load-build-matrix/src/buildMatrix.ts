import { Context } from '@actions/github/lib/context';

export type BuildMatrix = {
  services: string[];
  buildParams: string[];
};

export type BuildParams = {
  namespace: string;
  overlay: string;
};

export const getBuildMatrix = (ctx: Context): BuildMatrix => {
  const services = ['ingress', 'service-foo', 'service-bar'];
  const branch = getBranch(ctx);
  const buildParams = getBuildParams(ctx, branch);

  return {
    services,
    buildParams: buildParams.map(buildParam => JSON.stringify(buildParam)),
  };
};

const getBranch = (ctx: Context): string => {
  switch (ctx.eventName) {
    case 'pull_request':
      return ctx.payload.pull_request?.head || '';

    case 'push':
      return ctx.ref.replace(/^refs\/heads\//, '');

    default:
      throw new Error(`Unknown event name: ${ctx.eventName}`);
  }
};

const getBuildParams = (ctx: Context, branch: string): BuildParams[] => {
  let prNumber: number | undefined;

  switch (branch) {
    case 'develop':
      return [{ namespace: branch, overlay: branch }];

    case 'release':
      return [{ namespace: branch, overlay: branch }];

    case 'master':
      return [{ namespace: 'production', overlay: 'production' }];

    default:
      prNumber = ctx.payload.pull_request?.number;
      if (typeof prNumber !== 'number') {
        throw new Error(
          'Failed to retrieve Pull Request nubmer: Use pull_request event for staging',
        );
      }

      return [{ namespace: `pr-${prNumber}`, overlay: 'staging' }];
  }
};
