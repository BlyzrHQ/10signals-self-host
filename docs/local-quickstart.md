# 10Signals local quickstart

The default public `main` branch contains this local preview, including account
provider settings. It uses a public, digest-pinned image. No GitHub login is needed.
This is a preview for personal testing, not a hardened public-server release.
Maintainer validation has not yet completed a real report with a valid provider
key on this preview. Key saving and paid research remain owner acceptance tests.
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
git clone https://github.com/BlyzrHQ/10signals-self-host.git 10signals
```

```text
cd 10signals
```

```text
docker compose run --rm setup
```

Setup creates private `.env` configuration with a fresh account secret. Existing
configuration is not replaced. No provider key is requested in the terminal.
You can explore without research and add your own key in the app when ready.

```text
docker compose up -d --wait
```

Docker downloads the prebuilt image. It does not compile the project on your
computer. When web, worker and gateway are healthy, open
[http://localhost:8787](http://localhost:8787), create your **local** account, and
open **Account → AI provider**. Enter your OpenAI API key and choose **Test & save**.
Then return home and enter your domain. No company login or Trigger key is used.

You should see **AI provider** in the account sidebar, a masked **OpenAI API key**
field and **Test & save**. Successful validation displays “Key and model access
checked. Saved for your account.” If the menu is missing, check your clone's
revision and which installation owns the browser's port; do not enter a key into
an unrelated instance. The first run in a new folder has its own account/storage.

The check verifies authentication and access to `gpt-5.6-luna`, `gpt-5.4-mini`, and
`text-embedding-3-small` through OpenAI's model metadata endpoints. It does not
generate a report or verify billing credit, write permissions, or inference.
The key needs Models read access plus Responses and Embeddings access for reports.
If your OpenAI project cannot access these models, the check explains which one
is unavailable; it does not silently select another model.

Keys are encrypted per personal account. Another local account cannot use yours.
Test & save can replace an existing key; a failed check leaves the old key intact.
Remove key clears it from this installation, not from OpenAI. Changes apply to
queued and new reports, with no restart. A running report may finish with the key
it already loaded. Never paste a key into chat, an issue, a screenshot or a command.
The worker processes one report at a time. Its emergency execution ceiling matches
the shared Trigger task (14,700 seconds); this is not an expected report duration.
Worker interruption or reaching that ceiling stops the job without a paid retry.

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
| Change/add/remove your provider key | Account → AI provider in the app |
| Apply configuration changes | `docker compose up -d --wait` |
| Check services | `docker compose ps` |
| View worker errors | `docker compose logs --tail 100 worker` |
| Stop without deleting data | `docker compose stop` |
| Start again | `docker compose up -d --wait` |

For a different port on first setup: `docker compose run --rm setup --port 8788`.
If startup says the port is already allocated, the page on that port belongs to
another process, not the installation that just failed. Stop the old installation
from its own folder with `docker compose stop`, or use an unused port. If setup
already created `.env`, change only `TEN_SIGNALS_PORT` there, preserving all other
values, then run `docker compose up -d --wait`. Use the matching `localhost` URL.
Do not copy another installation's `.env`, and do not delete its data or volumes.
Docker Compose normally derives its project name from the folder name. Two
folders with the same normalized name can share containers and volumes, even in
different parent directories. Use a distinct letters/numbers/hyphens folder name
for an independent installation; adding punctuation such as `+` is not sufficient.
For installation-only automation: `docker compose run --rm -T setup --without-provider`.
The account-provider preview does not accept `--key-stdin` or `--set-key`; keys
are configured per signed-in account in the app. Do not share `.env`.
Avoid `docker compose config` in screenshots: its full output includes secrets.

Accounts, reports and queue state live in the installation's `application-data`
Docker volume. The worker's decryption key lives in a separate `provider-private`
volume, not mounted in the web container. Stop containers before backing up both
volumes and `.env`; restore them together. These backups are key-equivalent and
must be protected as credentials. If the private volume is missing or mismatched,
the worker refuses startup. Restore its matching backup; never delete/reinitialize
it to fix an error. `docker compose down --volumes` deletes data: do not use it for
updates. Saved keys are not automatically revoked at OpenAI when backups are removed.

On Linux the generated file has mode 0600 and the installation directory's owner.
On Windows/macOS keep the folder private to your OS user; filesystem protections
depend on Docker Desktop's host file sharing. The web service receives your key
only during a test/save request and seals it for the worker. It cannot retrieve
saved plaintext keys. No account-auth secret enters the worker. A machine/container
administrator can still access process memory and backups: trust your host.

## Updates and existing installations

After owner acceptance, releases pin a multiarchitecture image digest. A new
version requires reviewing release notes, backing up, `git pull --ff-only`,
`docker compose pull`, then `docker compose up -d --wait`. A pinned digest does
not silently advance. Windows/macOS Docker Desktop uses the Linux image matching
Intel/AMD64 or Apple Silicon/ARM64.

The older HTTPS/source-build preview uses `.env.self-host`, a separate Compose
file and separate volumes. Continue using [its guide](self-hosting.md) for that
installation. This quickstart does not migrate or overwrite it. Public-server
hardening, the general local account API and scheduled watches remain separate acceptance gates.

Older clones made with `--branch codex/...` continue tracking that branch; `git
pull` does not switch them to `main`. Keep those installations as they are, or
back up and clone the default branch into a distinct new folder. A new clone is
not an automatic account or report migration.

## Connect your agent

The [MCP connection guide](mcp-connection.md) connects an AI agent to your hosted 10Signals account. It does not require this local installation and cannot read reports stored here. Your local provider key is not an MCP credential.

Earlier quickstarts stored an installation-wide key in `.env`. This candidate
does not use that key. Re-enter your own key in Account → AI provider; no automatic
credential migration is performed. Do not add `OPENAI_API_KEY` to the worker in
account-provider mode: mixed credential modes are rejected at startup.
