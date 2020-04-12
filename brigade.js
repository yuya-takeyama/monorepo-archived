const { events, Job, Group } = require('brigadier');
const Octokit = require('@octokit/rest');

const parseBuildParams = async (event, octokit) => {
  const branch = event.revision.ref.split('/')[2];

  let overlay;
  let imagePrefix;

  if (branch === 'develop') {
    overlay = 'develop';
    overlay = 'develop';
    imagePrefix = 'develop';
  } else if (branch === 'release') {
    overlay = 'release';
    imagePrefix = 'release';
  } else if (branch === 'master') {
    overlay = 'production';
    imagePrefix = 'production';
  } else {
    const res = await octokit.repos.listPullRequestsAssociatedWithCommit({
      owner: 'yuya-takeyama',
      repo: 'monorepo',
      commit_sha: event.revision.commit,
    });
    const pullRequestNumber = res.data[0].url.match(/\/(\d+)$/)[1];
    overlay = 'staging';
    imagePrefix = `pr-${pullRequestNumber}`;
  }

  return {
    overlay: overlay,
    namespace: imagePrefix,
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
  const octokit = new Octokit({ auth: project.secrets.GITHUB_API_TOKEN });

  const setupJobs = new Group([
    createKanikoCredentialLoaderJob(project.secrets.DOCKER_CREDENTIAL),
    createDetectBuildsJob(),
  ]);

  const [_, detectBuildsResult] = await setupJobs.runAll();

  const buildTargets = detectBuildsResult.data.split('\n').filter((target) => target !== '');
  console.log('buildTargets = %j', buildTargets);

  const buildParams = await parseBuildParams(e, octokit);
  console.log('buildParams = %j', buildParams);

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

      let baseDir;
      let manifestDir;
      if (buildParams.overlay === 'staging') {
        baseDir = `staging/${buildParams.namespace}`;
        manifestDir = `${baseDir}/${target}`;
      } else {
        baseDir = `${buildParams.namespace}`;
        manifestDir = `${baseDir}/${target}`;
      }

      reorganizer.tasks = [
        `echo "${project.secrets.GIT_DEPLOY_KEY_BASE64}" > /tmp/id_rsa_base64`,
        'mkdir -pv ~/.ssh',
        'cat /tmp/id_rsa_base64 | base64 -d > ~/.ssh/id_rsa',
        'chmod 400 ~/.ssh/id_rsa',
        'cat ~/.ssh/id_rsa',
        'apk add --update bash git curl openssh gettext',
        'ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts',
        'mkdir /kustomize',
        'cd /kustomize',
        'curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | OSTYPE=linux-gnu bash',
        `cd /src/${target}/kubernetes/overlays/${buildParams.overlay}`,
        `/kustomize/kustomize edit set image yuyat/${target}=yuyat/${target}:${buildParams.imageTag}`,
        'git clone git@github.com:yuya-takeyama/gitops-repo.git /gitops-repo',
        'cd /gitops-repo',
        `mkdir -pv ${manifestDir}`,

        `echo 'apiVersion: v1' > ${baseDir}/namespace.yaml`,
        `echo 'kind: Namespace' >> ${baseDir}/namespace.yaml`,
        `echo 'metadata:' >> ${baseDir}/namespace.yaml`,
        `echo '  name: ${buildParams.namespace}' >> ${baseDir}/namespace.yaml`,

        `/kustomize/kustomize build /src/${target}/kubernetes/overlays/${buildParams.overlay} | NAMESPACE="${buildParams.namespace}" envsubst '$NAMESPACE'> ${manifestDir}/manifest.yaml`,
        `cat ${manifestDir}/manifest.yaml`,
        `git config --global user.email "${project.secrets.GIT_USER_EMAIL}"`,
        `git config --global user.name "${project.secrets.GIT_USER_NAME}"`,
        'git add --all',
        `git commit -m 'Update ${target}/${buildParams.imageTag}'`,
        'git push origin master',
      ];

      return reorganizer.run();
    });
  });

  await Promise.all(buildJobs);
});

