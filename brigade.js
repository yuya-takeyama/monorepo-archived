const { events, Job } = require('brigadier');

events.on('push', (e, p) => {
  const imageBuilder = new Job('image-builder');

  imageBuilder.image = 'gcr.io/kaniko-project/executor';

  imageBuilder.args = [
    '--help',
  ];

  imageBuilder.streamLogs = true;

  imageBuilder.run();
});
