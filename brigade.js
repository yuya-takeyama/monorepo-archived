const { events, Job } = require('brigadier');

events.on('push', async (e, project) => {
  const kanikoCredentialLoader = new Job('kaniko-credential-loader');

  kanikoCredentialLoader.image = 'alpine';

  kanikoCredentialLoader.volumes = [
    {
      "name": "kaniko-credential-storage",
      "emptyDir": {},
    }
  ];
  kanikoCredentialLoader.volumeMounts = [
    {
      name: "kaniko-credential-storage",
      mountPath: "/kaniko/.docker"
    }
  ];

  const auth = {
    auths: {
      'https://index.docker.io/v1/': {
        'auth': project.secrets.DOCKER_CREDENTIAL,
      },
    },
  };
  kanikoCredentialLoader.tasks = [
    `echo '${JSON.stringify(auth)}' > /kaniko/.docker/config.json`,
    `cat /kaniko/.docker/config.json`,
  ];

  kanikoCredentialLoader.streamLogs = true;

  await kanikoCredentialLoader.run();

  const imageBuilder = new Job('image-builder');

  imageBuilder.image = 'gcr.io/kaniko-project/executor';

  imageBuilder.args = [
    '--cache',
    '--context=/src/service-foo',
    '--dockerfile=/src/service-foo/Dockerfile',
    '--destination=yuyat/service-foo',
  ];

  imageBuilder.volumes = [
    {
      "name": "kaniko-credential-storage",
      "emptyDir": {},
    }
  ];
  imageBuilder.volumeMounts = [
    {
      "name": "kaniko-credential-storage",
      "mountPath": "/kaniko/.docker"
    }
  ];

  imageBuilder.streamLogs = true;

  await imageBuilder.run();
});
