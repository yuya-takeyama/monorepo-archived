const { events, Job, Group } = require('brigadier');

const createKanikoCredentialLoaderJob = (credential) => {
  const kanikoCredentialLoader = new Job('kaniko-credential-loader', 'alpine');

  kanikoCredentialLoader.storage.enabled = true;
  kanikoCredentialLoader.storage.path = '/kaniko/.docker';

  const auth = {
    auths: {
      'https://index.docker.io/v1/': {
        'auth': credential,
      },
    },
  };
  kanikoCredentialLoader.tasks = [
    `echo '${JSON.stringify(auth)}' > /kaniko/.docker/config.json`,
  ];

  return kanikoCredentialLoader;
}

const createDetectBuildsJob = () => {
  const detectBuilds = new Job('detect-builds', 'alpine');

  detectBuilds.tasks = [
    'cd /src',
    'find . -name Dockerfile | awk -F / \'{ print $2 }\'',
  ];

  return detectBuilds;
};

events.on('push', async (e, project) => {
  const setupJobs = new Group([
    createKanikoCredentialLoaderJob(project.secrets.DOCKER_CREDENTIAL),
    createDetectBuildsJob(),
  ]);

  const [_, detectBuildsResult] = await setupJobs.runAll();

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
