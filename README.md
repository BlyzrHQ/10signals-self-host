# 10Signals

Self-host 10Signals to research a domain and compare products with public prices.
Your accounts, reports and background worker run on your own infrastructure.
AI/search calls use your own provider account; no company Trigger key is included.

## Install

Looking for the right path? Start with the [documentation index](docs/README.md).
It separates product usage, Cloud, self-hosting, Trigger CLI, API and MCP.

The default `main` branch contains the **local quickstart preview**, including
**Account → AI provider**. No feature branch is required. This is not a production
release, and cloning into a fresh folder does not migrate an existing installation.

You need Git and a running Docker installation with Compose 2.24+. No Node.js,
npm, Go, GitHub login or certificate installation is needed. Windows PowerShell,
macOS Terminal and Linux use the same four commands.

```text
git clone https://github.com/BlyzrHQ/10signals-self-host.git 10signals
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
The [provider settings page](http://localhost:8787/account?section=provider) has a
masked **OpenAI API key** field and a **Test & save** button. On success it says
“Key and model access checked. Saved for your account.” Do not use `--set-key` or
paste a key into a terminal command.
Each account has its own encrypted key. The test checks authentication and model
visibility, not billing credit or successful inference. Missing or rejected keys
do not start a report. Replace or remove your key from the same screen.
See the [quickstart guide](docs/local-quickstart.md)
for ports, updates, backups and troubleshooting. Existing HTTPS/source-build
installations should keep using [their guide](docs/self-hosting.md).

**Port already allocated?** Do not open the address until this installation's
gateway is healthy: another installation may be serving that port. Stop the old
installation from its own folder with `docker compose stop`, or choose a free
port on first setup, for example `docker compose run --rm setup --port 8788`.
Open the port printed by setup. Use a new folder name if `10signals` already exists.
Compose derives its project name from the folder name: use a distinct name made
of letters, numbers and hyphens. Two folders named `10signals` can share Docker
state even under different parent directories; adding `+` is not a distinct name.
See [existing installations and backups](docs/local-quickstart.md#updates-and-existing-installations)
before updating; never delete volumes to fix a port conflict.

This candidate binds only to your own computer. Do not expose it publicly by
changing the port binding or opening a tunnel. Other users of a shared computer
can reach localhost: use a trusted personal computer. The general local account API and scheduled price watches are not enabled yet. MCP connects to a separate hosted account; it does not expose this installation.
Live local research, successful sharing, public-server
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
