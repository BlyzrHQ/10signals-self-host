# 10Signals

Self-host 10Signals to research a domain and compare products with public prices.
Your accounts, reports and background worker run on your own infrastructure.
AI/search calls use your own provider account; no company Trigger key is included.

## Install

This is a **source-build preview**, not yet a production-ready release. You need
Git, Docker with Compose, and Node.js 22.18+. Windows PowerShell and macOS Terminal
use the same commands below. No GitHub login is required.

```text
git clone https://github.com/BlyzrHQ/10signals-self-host.git 10signals
```

```text
cd 10signals
```

```text
node scripts/setup-self-host.mjs
```

Enter your own provider key at the hidden prompt. Never paste it into an issue or
commit the generated `.env.self-host`. For installation-only testing, use
`node scripts/setup-self-host.mjs --without-provider` instead.

```text
docker compose --env-file .env.self-host -f compose.self-host.yaml --profile research up --build -d
```

Omit `--profile research` if you skipped the provider key. Open your local instance
at `https://localhost:8443` after following the installation-specific certificate
instructions in the [full setup guide](docs/self-hosting.md).

This candidate binds only to your own computer. Do not expose it publicly by
changing the port binding. Local API/MCP connections and scheduled price watches
are not enabled yet. Live local research, successful sharing, public-server
hardening and dependency remediation remain release gates.

## What is included

- 10Signals application and account-owned report storage.
- Local background report worker and shared comparison engine.
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
containers, run `git pull --ff-only`, review the release notes, rebuild, and verify
your accounts and reports. Do not run `docker compose down --volumes` unless you
intend to delete your installation's data.

Licensed under [Apache-2.0](LICENSE). See [contributing](CONTRIBUTING.md).
