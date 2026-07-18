# Local config (not for production secrets in git)

Put machine-local Google Cloud credentials under `google-cloud/`.

- Keep `service-account.json` and similar files **out of git** (ignored).
- Cloud Functions and scripts should use Application Default Credentials or env vars in deployed environments.
- Do not copy this folder into `dist/` or Hosting.
