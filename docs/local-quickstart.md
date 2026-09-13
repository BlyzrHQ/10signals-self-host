# 10Signals local quickstart

Local preview for owner testing; not promoted to the default public branch yet.
The candidate branch uses a public, digest-pinned image. No GitHub login is needed.
Do not use the company repository's `compose.yaml`.

## Before you start

Install Git and Docker Desktop on Windows/macOS (Docker Engine + Compose on Linux).
Start Docker. Use Docker Compose 2.24 or later. You do **not** need Node.js, npm,
Go, a Trigger account, a GitHub login, or certificate installation.

This installs the complete 10Signals application and its local research worker.
You own its accounts and stored reports. Research calls use your own OpenAI
provider account and are billed there; this is not offline AI. Setup never starts
research automatically. The separately installed Trigger CLI is a different path.

## Install — same four commands on Windows, macOS and Linux

Use a new folder, leaving existing installations untouched.

```text
git clone --branch codex/local-quickstart https://github.com/BlyzrHQ/10signals-self-host.git 10signals
```

```text
cd 10signals
```

```text
docker compose run --rm setup
```

Paste your own provider key at the hidden prompt. This creates private `.env`
configuration with a fresh account secret. Existing configuration is not replaced.
Press Enter to explore 10Signals without research; the app will show a setup notice.
The key is saved locally, not sent to BlyzrHQ. Setup does not verify provider credit
or model access; those are checked when you start research.

```text
docker compose up -d --wait
```

Docker downloads the prebuilt image. It does not compile the project on your
computer. When web, worker and gateway are healthy, open
[http://localhost:8787](http://localhost:8787), create your **local** account, and
enter your domain. No company login or Trigger key is used.

Only use the `localhost` address. `127.0.0.1` as a browser address and other Host
headers are rejected intentionally. The gateway binds only to `127.0.0.1`; never
change that to `0.0.0.0` or put this HTTP preview behind a public tunnel. Local
cookies are HttpOnly/SameSite, but HTTP is not suitable for a public server.
On a shared computer, other local users and processes can also reach this port
and register their own accounts. This preview is intended for a trusted personal
computer, not a shared or multi-user server.

## Optional commands

| Want to… | Command |
| --- | --- |
| Change/add your provider key | `docker compose run --rm setup --set-key` |
| Apply configuration changes | `docker compose up -d --wait` |
| Check services | `docker compose ps` |
| View worker errors | `docker compose logs --tail 100 worker` |
| Stop without deleting data | `docker compose stop` |
| Start again | `docker compose up -d --wait` |

For a different port on first setup: `docker compose run --rm setup --port 8788`.
For installation-only automation: `docker compose run --rm -T setup --without-provider`.
For secure unattended provisioning, `--key-stdin` accepts the key from your secret
manager through stdin. Do not put it in a command argument or share `.env`.
Avoid `docker compose config` in screenshots: its full output includes secrets.

Accounts, reports and queue state live in the installation's `application-data`
Docker volume. Stop containers before backing up that entire volume and `.env`;
restore them together. `docker compose down --volumes` deletes the data: do not use
it for updates. Setup's `--set-key` preserves the account secret and port.

On Linux the generated file has mode 0600 and the installation directory's owner.
On Windows/macOS keep the folder private to your OS user; filesystem protections
depend on Docker Desktop's host file sharing. No provider key enters the web
container and no account-auth secret enters the worker.

## Updates and existing installations

After owner acceptance, releases pin a multiarchitecture image digest. A new
version requires reviewing release notes, backing up, `git pull --ff-only`,
`docker compose pull`, then `docker compose up -d --wait`. A pinned digest does
not silently advance. Windows/macOS Docker Desktop uses the Linux image matching
Intel/AMD64 or Apple Silicon/ARM64.

The older HTTPS/source-build preview uses `.env.self-host`, a separate Compose
file and separate volumes. Continue using [its guide](self-hosting.md) for that
installation. This quickstart does not migrate or overwrite it. Public-server
hardening, local API/MCP and scheduled watches remain separate acceptance gates.
