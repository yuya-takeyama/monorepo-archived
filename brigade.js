const { events, Job, Group } = require('brigadier');

const parseBuildParams = (event) => {
  const branch = event.revision.ref.split('/')[2];

  if (branch === 'develop') {
    imagePrefix = 'develop';
  } else if (branch === 'master') {
    imagePrefix = 'production';
  } else {
    throw new Error(`Unsupported ref: ${event.revision.ref}`);
  }

  return {
    overlay: imagePrefix,
    imageTag: `${imagePrefix}.${event.revision.commit}`,
  };
};

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

  const buildParams = parseBuildParams(e);

  const buildJobs = buildTargets.map((target) => {
    const imageBuilder = new Job(`build-${target}`);

    imageBuilder.image = 'gcr.io/kaniko-project/executor';

    imageBuilder.storage.enabled = true;
    imageBuilder.storage.path = '/kaniko/.docker';

    imageBuilder.args = [
      `--context=/src/${target}`,
      `--dockerfile=/src/${target}/Dockerfile`,
      `--destination=yuyat/${target}:${buildParams.imageTag}`,
    ];

    return imageBuilder.run().then(() => {
      const reorganizer = new Job(`reorganize-${target}`, 'alpine');

      reorganizer.tasks = [
        `echo "${project.secrets.GIT_DEPLOY_KEY_BASE64}" > /tmp/id_rsa_base64`,
        'mkdir -pv ~/.ssh',
        'cat /tmp/id_rsa_base64 | base64 -d > ~/.ssh/id_rsa',
        'chmod 400 ~/.ssh/id_rsa',
        'cat ~/.ssh/id_rsa',
        'apk add --update bash git curl openssh',
        'mkdir /kustomize',
        'cd /kustomize',
        'curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | OSTYPE=linux-gnu bash',
        `cd /src/${target}/kubernetes/overlays/${buildParams.overlay}`,
        `/kustomize/kustomize edit set image yuyat/${target}=yuyat/${target}:${buildParams.imageTag}`,
        'git clone git@github.com:yuya-takeyama/gitops-repo.git',
        'cd /gitops-repo',
        `mkdir -pv ${buildParams.overlay}/${target}`,
        `/kustomize/kustomize build /src/${target}/kubernetes/overlays/${buildParams.overlay} > ${buildParams.overlay}/${target}/manifest.yaml`,
        `cat ${buildParams.overlay}/${target}/manifest.yaml`,
        `git config --global user.email "${project.secrets.GIT_USER_EMAIL}"`,
        `git config --global user.name "${project.secrets.GIT_USER_NAME}"`,
        'git add --all',
        `git commit -m 'Update ${buildParams.imageTag}'`,
        'git push origin master',
      ];

      return reorganizer.run();
    });
  });

  await Promise.all(buildJobs);
});
