# github-app-cli

This is a GitHub App CLI wrapper around Renovate.

It requires the following two env variables to be defined:

* `RENOVATE_APP_ID`
* `RENOVATE_APP_KEY`

The app key is the `.pem` file, e.g. `export RENOVATE_APP_KEY=$(cat my-secret-key.pem)`.
