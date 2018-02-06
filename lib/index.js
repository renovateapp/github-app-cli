/* global logger */

const bunyan = require('bunyan');
const { getRepositories } = require('./app');
const { initLogger } = require('renovate/lib/logger');
const configParser = require('renovate/lib/config');
const { renovateRepository } = require('renovate/lib/workers/repository');

(async function go() {
  initLogger();
  process.env.GITHUB_TOKEN = 'dummy_token';
  config = await configParser.parseConfigs(process.env, process.argv);
  delete process.env.GITHUB_TOKEN;
  config.githubAppId = process.env.RENOVATE_APP_ID;
  logger.debug({ config });
  if (!config.githubAppId) {
    logger.error('You need to define RENOVATE_APP_ID in env');
    process.exit(1);
  }
  config.githubAppKey = process.env.RENOVATE_APP_KEY;
  if (!config.githubAppKey) {
    logger.error('You need to define RENOVATE_APP_KEY in env');
    process.exit(2);
  }
  config.repositories = await getRepositories(config);
  for (const repository of config.repositories) {
    let repoConfig = configParser.mergeChildConfig(
      JSON.parse(JSON.stringify(config)),
      {
        repository: repository.repository,
      }
    );
    repoConfig = configParser.filterConfig(repoConfig, 'repository');
    delete repoConfig.githubAppId;
    delete repoConfig.githubAppKey;
    logger.debug({ config: repoConfig });
    const res = await renovateRepository(repoConfig, repository.token);
    logger.info(
      { repository: repoConfig.repository, res },
      'Finished repository'
    );
  }
})();
