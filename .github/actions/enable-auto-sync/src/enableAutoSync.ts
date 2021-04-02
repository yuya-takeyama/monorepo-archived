import { Context } from '@actions/github/lib/context';
import { setOutput } from '@actions/core';

interface Label {
  id: number;
  name: string;
  description: string;
}

export const enableAutoSync = async (ctx: Context): Promise<void> => {
  if (ctx.eventName === 'pull_request') {
    const labels = ctx.payload.pull_request?.labels as Label[];

    if (labels.some(label => label.name === 'disable-auto-sync')) {
      setOutput('result', 'false');
      return;
    }
  }

  setOutput('result', 'true');
};
