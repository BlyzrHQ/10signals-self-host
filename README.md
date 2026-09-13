# 10Signals

Self-host 10Signals to research a domain and compare products with public prices.
Your accounts, reports and background worker run on your own infrastructure.
AI/search calls use your own provider account; no company Trigger key is included.

## Install

This is a **local quickstart preview**, not a production release. The candidate
branch and prebuilt image are public; owner acceptance is required before this
becomes the default installation. Your existing installation is not migrated.

You need Git and a running Docker installation with Compose 2.24+. No Node.js,
npm, Go, GitHub login or certificate installation is needed. Windows PowerShell,
macOS Terminal and Linux use the same four commands.

```text
git clone --branch codex/provider-settings https://github.com/BlyzrHQ/10signals-self-host.git 10signals
```

```text
cd 10signals
```

```text
docker compose run --rm setup
```

Setup creates private configuration automatically. No key is requested in the
terminal. Never commit the generated `.env`. Docker downloads a prebuilt image;
nothing is compiled on your computer. Setup does not start research.

```text
docker compose up -d --wait
```

The app, local worker and gateway start together. Open
[http://localhost:8787](http://localhost:8787) and create a local account.
Open **Account → AI provider**, enter your own OpenAI API key, and select
**Test & save**. Then create a report. There is no worker restart or Trigger key.
Each account has its own encrypted key. The test checks authentication and model
visibility, not billing credit or successful inference. Missing or rejected keys
do not start a report. Replace or remove your key from the same screen.
See the [quickstart guide](docs/local-quickstart.md)
for ports, updates, backups and troubleshooting. Existing HTTPS/source-build
installations should keep using [their guide](docs/self-hosting.md).

This candidate binds only to your own computer. Do not expose it publicly by
changing the port binding or opening a tunnel. Other users of a shared computer
can reach localhost: use a trusted personal computer. Local API/MCP and scheduled price watches
are not enabled yet. Live local research, successful sharing, public-server
hardening and dependency remediation remain release gates.

## What is included

- 10Signals application and account-owned report storage.
- Local background report worker and shared comparison engine.
- Account-specific OpenAI key settings: test, encrypted save, replace and remove.
- Container configuration, setup guide and local queue tests.
- Public source evidence and visible report limitations; demo assets are UI examples.

The separate `@10signals/cli` npm package connects to existing Trigger projects;
it is not this project's installer. The managed service is at
[10signals.xyz](https://10signals.xyz/).

## Updates and contributions

This repository is a one-way public source distribution maintained by BlyzrHQ.
`PUBLIC_SOURCE.json` records the source revision and hashes for each exported file.
No private Git history, deployment workflow, production credential or account data
is mirrored. New export paths require an explicit reviewed allowlist update.

Open an issue or pull request here to propose changes. Maintainers review them
before integrating into the source project and publishing a new snapshot. Public
contributions never execute on our production infrastructure.

Back up your data and private configuration before updating. Stop your local
containers and back up both `application-data` and `provider-private` volumes
together with `.env`. Together these backups can decrypt saved provider keys;
protect them as credentials. Losing the private-key volume makes saved keys
unusable; restore the matching backup rather than generating a new key. Stop your
containers, run `git pull --ff-only`, review the release notes, pull the newly
pinned image with `docker compose pull`, run `docker compose up -d --wait`, and verify
your accounts and reports. Do not run `docker compose down --volumes` unless you
intend to delete your installation's data.

Licensed under [Apache-2.0](LICENSE). See [contributing](CONTRIBUTING.md).
