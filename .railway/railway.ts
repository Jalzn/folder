import { defineRailway, project, service, volume } from 'railway/iac';

export default defineRailway(() => {
  const data = volume('tinyfold-volume', { region: 'sfo', sizeMB: 5000 });
  const tinyfold = service('tinyfold', {
    build: { buildEnvironment: 'V3', builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
    healthcheck: '/ready',
    healthcheckTimeout: 120,
    replicas: { sfo: 1 },
    deploy: {
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 10,
      sleepApplication: false,
      overlapSeconds: 0,
      drainingSeconds: 30,
    },
    domains: [{ domain: 'folder.jalzn.com', port: 3370 }],
    volumeMounts: { '/data': data },
  });

  // The CLI supports variable ownership before the SDK exposes it in ProjectDefinition.
  const configuration = {
    variables: { managed: false },
    resources: [tinyfold, data],
  };
  return project('tinyfold', configuration);
});
