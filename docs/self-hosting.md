# Self-host 10Signals — candidate

This is the legacy HTTPS/source-build path. The simpler prebuilt-container
[local quickstart](local-quickstart.md) is the default public local preview; existing
installations should keep using this guide until a migration is explicitly tested.

This installs the UI, accounts, private reports, SQLite storage and local report
worker. It does not connect to our company Trigger account or VPS. AI/search still
uses **your own provider account** and can incur charges. This is not an offline AI.

Status: public source-build preview, not a production-ready release. API/MCP and scheduled price
watches are not enabled on independent installations yet. No parity claim until
the real-report, sharing, monitoring and restart acceptance checklist passes.

## 1. Clone 10Signals

Install Git, Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux),
and Node.js 22.18+ for this source-build candidate. No Go installation is needed.
The npm `@10signals/cli` package contains the client, **not** the full project.

Run this in the parent folder where you want to install 10Signals. The destination
must be a new folder; Git will not replace an existing installation.

```text
git clone https://github.com/10claws/10signals-self-host.git 10signals
```

```text
cd 10signals
```

The public source repository contains the self-hosting candidate, not just the
CLI. No GitHub login is required. It has separate public-only history and no
company deployment credentials or runner. It does not configure or connect to
the company's infrastructure. Use your own provider credentials below.

The following commands work
in Windows PowerShell, macOS Terminal and Linux shells without line continuations.

## 2. Create instance configuration

```text
node scripts/setup-self-host.mjs
```

Provide your own provider key at the hidden prompt. The setup writes a fresh
authentication secret into `.env.self-host` and refuses to overwrite an existing
file. Restrict this file to your OS user; never commit or send it to someone else.
To test installation without paid research, use `--without-provider` instead.

## 3. Build and start

```text
docker compose --env-file .env.self-host -f compose.self-host.yaml --profile research up --build -d
```

Omit `--profile research` if you skipped the provider key. The first build downloads
locked dependencies and can take several minutes; later starts reuse the image.
Application data lives in a dedicated named volume, not a company server path.

## 4. Trust your local HTTPS certificate

This candidate listens only on your own computer at `https://localhost:8443`.
Caddy creates an installation-specific development CA. Export its public certificate:

```text
docker compose --env-file .env.self-host -f compose.self-host.yaml cp gateway:/data/caddy/pki/authorities/local/root.crt ./10signals-local-root.crt
```

Inspect the certificate and trust it only on your test computer. Do not copy any
private key from the container. Windows (current user):

```powershell
certutil -user -addstore Root .\10signals-local-root.crt
```

macOS: open the `.crt` in Keychain Access, add it to your login keychain, and mark
this local CA trusted. Linux: use your distribution/browser's certificate store.
Never globally disable TLS verification or bypass certificate errors for remote sites.

## 5. Test as a new user

Open your local 10Signals instance, create a fresh account, and submit your own domain with
20 comparisons. The local worker runs the same comparison and quality-gate engine
as the direct CLI. Reports belong to your account. Missing provider configuration
must fail clearly without a paid request. Check original/rival links and prices.

```text
docker compose --env-file .env.self-host -f compose.self-host.yaml logs --tail 50 worker
docker compose --env-file .env.self-host -f compose.self-host.yaml restart web
```

Sign in again after restart and verify your reports remain. A crashed research job
is marked interrupted, not automatically re-run and billed. Inspect before a fresh
submission. Exactly one report runs at a time on this candidate.

## Stop, backup and future server installation

`docker compose --env-file .env.self-host -f compose.self-host.yaml down` stops the
services and preserves named volumes. **Do not add `--volumes`** unless intentionally
destroying the installation's accounts, reports and certificates.

For an offline backup, stop web/worker, then back up the complete application-data
volume (including both the report DB and queue DB) and private environment file.
Test restore into a different Compose project before relying on it. No in-place
automatic upgrade is enabled in the candidate.

This loopback preview is not the public-server recipe. A server release requires
your own DNS/valid public TLS, closed signup or invitations, backup/restore tests,
rate limits and the completed API/MCP/monitoring work. Do not expose this candidate
to the internet by simply changing the bind address.
