const { events, Job } = require('brigadier');

events.on('push', async (e, project) => {
  const kanikoCredentialLoader = new Job('kaniko-credential-loader');

  kanikoCredentialLoader.image = 'alpine';

  kanikoCredentialLoader.storage.enabled = true;
  kanikoCredentialLoader.storage.path = '/kaniko/.docker';

  const auth = {
    auths: {
      'https://index.docker.io/v1/': {
        'auth': project.secrets.DOCKER_CREDENTIAL,
      },
    },
  };
  kanikoCredentialLoader.tasks = [
    `echo '${JSON.stringify(auth)}' > /kaniko/.docker/config.json`,
  ];

  await kanikoCredentialLoader.run();

  const imageBuilder = new Job('image-builder');

  imageBuilder.image = 'gcr.io/kaniko-project/executor';

  imageBuilder.storage.enabled = true;
  imageBuilder.storage.path = '/kaniko/.docker';

  imageBuilder.args = [
    '--context=/src/service-foo',
    '--dockerfile=/src/service-foo/Dockerfile',
    '--destination=yuyat/service-foo',
  ];

  await imageBuilder.run();
});
