const { events, Job, Group } = require('brigadier');

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

  const detectBuilds = new Job('build-builds');

  detectBuilds.image = 'alpine';

  detectBuilds.tasks = [
    'cd /src',
    'find . -name Dockerfile | awk -F / \'{ print $2 }\'',
  ];

  const detectBuildsResult = await detectBuilds.run();

  const buildTargets = detectBuildsResult.data.split('\n').filter((target) => target !== '');
  console.log('buildTargets = %j', buildTargets);

  const buildJobs = buildTargets.map((target) => {
    const imageBuilder = new Job(`build-${target}`);

    imageBuilder.image = 'gcr.io/kaniko-project/executor';

    imageBuilder.storage.enabled = true;
    imageBuilder.storage.path = '/kaniko/.docker';

    imageBuilder.args = [
      `--context=/src/${target}`,
      `--dockerfile=/src/${target}/Dockerfile`,
      `--destination=yuyat/${target}`,
    ];

    return imageBuilder;
  });

  await Group.runAll(buildJobs);
});
