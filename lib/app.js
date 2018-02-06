/* global logger */

const got = require('got');
const jwt = require('jsonwebtoken');

module.exports = {
  generateJwt,
  getUserRepositories,
  getRepositories,
};

function generateJwt(appId, pemFileContent) {
  logger.debug(`githubApp.generateJwt(${appId})`);
  const payload = {
    // GitHub app identifier
    iss: appId,
  };
  const options = {
    // 5 minutes
    expiresIn: 300,
    // RS256 required by GitHub
    algorithm: 'RS256',
  };
  return jwt.sign(payload, pemFileContent, options);
}

async function getUserRepositories(appToken, installationId) {
  logger.debug(`githubApp.getUserRepositories(appToken, ${installationId})`);
  const userToken = await getInstallationToken(appToken, installationId);
  const userRepositories = await getInstallationRepositories(userToken);
  logger.debug(`Found ${userRepositories.repositories.length} repositories`);
  return userRepositories.repositories.map(repository => ({
    repository: repository.full_name,
    token: userToken,
  }));
}

async function getRepositories(config) {
  logger.debug(`getRepositories()`);
  let installedRepos = [];
  try {
    const appToken = module.exports.generateJwt(
      config.githubAppId,
      config.githubAppKey
    );
    const installations = await getInstallations(appToken);
    logger.info(`Found installations for ${installations.length} users`);
    for (const installation of installations) {
      logger.debug(`installation=${JSON.stringify(installation)}`);
      const installationRepos = await module.exports.getUserRepositories(
        appToken,
        installation.id
      );
      installedRepos = installedRepos.concat(installationRepos);
    }
  } catch (err) {
    logger.error(`githubApp.getRepositories error: ${JSON.stringify(err)}`);
  }
  return installedRepos;
}

// Get all installations for a GitHub app
async function getInstallations(appToken) {
  logger.debug('getInstallations()');
  try {
    const url = 'https://api.github.com/app/installations';
    const options = {
      json: true,
      headers: {
        accept: 'application/vnd.github.machine-man-preview+json',
        authorization: `Bearer ${appToken}`,
      },
    };
    const res = await got(url, options);
    logger.debug(`Returning ${res.body.length} results`);
    return res.body;
  } catch (err) {
    logger.error({ err }, `GitHub getInstallations error`);
    throw err;
  }
}

// Get the user's installation token
async function getInstallationToken(appToken, installationId) {
  logger.debug(`getInstallationToken(appToken, ${installationId})`);
  try {
    const url = `https://api.github.com/installations/${installationId}/access_tokens`;
    const options = {
      json: true,
      headers: {
        accept: 'application/vnd.github.machine-man-preview+json',
        authorization: `Bearer ${appToken}`,
      },
    };
    const res = await got.post(url, options);
    return res.body.token;
  } catch (err) {
    logger.error({ err }, `GitHub getInstallationToken error`);
    throw err;
  }
}

// Get all repositories for a user's installation
async function getInstallationRepositories(userToken) {
  logger.debug('getInstallationRepositories()');
  try {
    const url = 'https://api.github.com/installation/repositories';
    const options = {
      json: true,
      headers: {
        accept: 'application/vnd.github.machine-man-preview+json',
        authorization: `token ${userToken}`,
      },
    };
    const res = await got(url, options);
    logger.debug(
      `Returning ${res.body.repositories.length} results from a total of ${
        res.body.total_count
      }`
    );
    return res.body;
  } catch (err) {
    logger.error({ err }, `GitHub getInstallationRepositories error`);
    throw err;
  }
}
