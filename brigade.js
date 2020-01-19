const { events, Job } = require('brigadier');

events.on('push', (e, p) => {
  const imageBuilder = new Job('image-builder');

  imageBuilder.image = 'gcr.io/kaniko-project/executor';

  imageBuilder.args = [
    '--cache',
    '--context=/src/service-foo',
    '--dockerfile=/src/service-foo/Dockerfile',
    '--destination=yuyat/service-foo',
  ];

  imageBuilder.streamLogs = true;

  imageBuilder.run();
});
