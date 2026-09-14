# 10Signals

Competitive product research, on your infrastructure.

Enter a domain to find product comparisons, competitor prices, and the public sources behind them.

[Use Cloud](https://10signals.xyz/) · [Documentation](docs/README.md) · [CLI package](https://www.npmjs.com/package/@10signals/cli)

## Cloud or self-hosted?

- **Cloud:** use [10signals.xyz](https://10signals.xyz/) without installing anything.
- **Self-hosted:** run 10Signals locally and use your own OpenAI account. Follow the steps below.

Self-hosting is currently a **local preview**. It is not ready for a publicly exposed server. Successful research with your valid provider key remains an acceptance test.

See [release status and updates](docs/release-status.md) for the difference between source, the pinned image, and the separate CLI package.

## Quick start

You need **Git** and **Docker with Compose 2.24+**. Windows PowerShell, macOS Terminal, and Linux use the same commands. No Node.js, npm, or GitHub login is required.

### 1. Clone

```sh
git clone https://github.com/10claws/10signals-self-host.git 10signals
cd 10signals
```

### 2. Set up

```sh
docker compose run --rm setup
```

This creates private configuration. Docker downloads the prebuilt image; nothing is compiled on your computer.

### 3. Start

```sh
docker compose up -d --wait
```

Open **[localhost:8787](http://localhost:8787)** when the services are healthy.

### 4. Add your key

Create a local account, open **Account → AI provider**, enter your own **OpenAI API key**, and choose **Test & save**. Then create a report.

Keys are encrypted for each account. The test checks key and model access, not billing credit or successful research. A key rejected during this check is not saved. Never put keys in terminal commands or Git.

## Already have an installation?

Use a distinct folder name to create an independent installation. For a different port, pass `--port 8788` to the first setup command and open that port. Keep existing data and volumes—cloning does not migrate or delete them.

See the [installation guide](docs/local-quickstart.md) for updates, backups, port conflicts, and troubleshooting. Existing HTTPS/source-build installations have a [separate guide](docs/self-hosting.md).

## Learn more

- [Documentation and available options](docs/README.md)
- [Trigger setup and credentials](docs/trigger-authentication.md)
- [Connect an AI agent to hosted 10Signals](docs/mcp-connection.md)
- [Contribute](CONTRIBUTING.md)

The separate `@10signals/cli` package connects to existing Trigger tasks; it is not the self-hosting installer. Hosted API/MCP and scheduled watches are not provided by this local preview.

## Source and license

This repository is a reviewed public source distribution. `PUBLIC_SOURCE.json` records the source revision and file hashes. Private Git history, production configuration, and account data are not included.

[Apache-2.0](LICENSE)
