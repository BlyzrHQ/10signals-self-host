# Trigger authentication: choose the right method

Use this when connecting to **your own or an explicitly authorized Trigger
Cloud environment**. It is separate from local Docker and customer API/MCP access.

| Job | Credential | Used by |
| --- | --- | --- |
| Run installed 10Signals tools | Trigger environment secret | `marketsignal-trigger configure` or `TRIGGER_SECRET_KEY` |
| Deploy code interactively | Trigger operator login | A separate named Trigger CLI profile |
| Deploy from CI | Operator personal access token (PAT) | Protected CI `TRIGGER_ACCESS_TOKEN` |
| Power research | Your OpenAI key | Target worker environment's `OPENAI_API_KEY` |

## 1. Connect to tools that are already installed

Get the intended environment's secret from your Trigger project's **API keys**
page or authorized operator. Install the client first:

Windows PowerShell:

```powershell
npm.cmd install --global @10signals/cli@preview
```

macOS / Linux:

```bash
npm install --global @10signals/cli@preview
```

Then run one command at a time (Windows: use `marketsignal-trigger.cmd`):

```text
marketsignal-trigger configure
```

Enter the secret only at the hidden prompt. Expected: verified and stored in
the OS credential store. This does not install tasks or test research.

```text
marketsignal-trigger doctor
```

Expected: COMPLETED, ready, and four Direct tasks. Research also requires
providerConfigured true; that flag is not a billing or inference test. Doctor
starts a capabilities task, with no research calls; Trigger compute can apply.

For a separately approved research run:

```text
marketsignal-trigger report
```

Answer the domain, comparison count and search mode, then confirm. The command
generates its request ID, shows progress and returns structured results.

## 2. Headless agents and credential precedence

Inject `TRIGGER_SECRET_KEY` with your secret manager. It **overrides the saved
key**, even after configure saves a different key. Never print the value or
paste it into command arguments. `configure --stdin` is another supported input
method when an OS credential store is available. Linux interactive storage needs
Secret Service; there is no plaintext fallback.

There is one saved runtime credential, not multiple named runtime profiles.
Separate agent processes and secrets for different environments. This client
uses `https://api.trigger.dev`; custom Trigger endpoints and Postiz-style
device-flow login are not implemented.

## 3. Operator deployment login

Operators can authenticate with a separate profile (no deployment occurs here):

Windows:

```powershell
npx.cmd trigger.dev@4.5.4 login --profile 10signals-own
```

macOS / Linux:

```bash
npx trigger.dev@4.5.4 login --profile 10signals-own
```

The pinned CLI matches this source's SDK. Trigger supports `TRIGGER_ACCESS_TOKEN`
for CI; create a PAT in the operator profile's **Personal Access Tokens** settings
and store it only in a protected CI environment. PATs inherit broader operator
access. Do not give them to report agents or enter them into configure.

**Own-project installer not released:** the public local checkout does not
contain a released isolated Trigger provisioning package. The separate candidate
uses interactive operator login and does not support unattended PAT setup.
Do not use company deployment configuration as a substitute. Empty-project live
deployment, an approved real report and explicit promotion are still gates.

## 4. Configure research in the correct place

For Trigger, the operator sets their own `OPENAI_API_KEY` in the target worker
environment. For local Docker, the user saves their key in **Account → AI provider**.
Neither changes the other. Do not upload a local `.env` or company secrets into
another project.

## 5. Rotation and troubleshooting

- `logout` removes the CLI's saved key; it does not revoke it in Trigger or unset
  `TRIGGER_SECRET_KEY`. Close old agent processes and rotate at the issuer.
- Valid key + missing task: the operator must deploy the tools.
- `PENDING_VERSION`: inspect deployment and promotion. Use the same approved
  worker pin for doctor and report. Reinstalling the CLI cannot deploy a worker.
- Wrong environment after configure: check whether `TRIGGER_SECRET_KEY` is set
  **without displaying its value**. It takes precedence.
- Missing provider: configure the worker's key before a real report. Do not keep
  resubmitting an uncertain run; retrieve the existing run by ID.

## Official references

Checked 13 September 2026: [environment keys](https://trigger.dev/docs/apikeys),
[login profiles](https://trigger.dev/docs/cli-login-commands),
[PAT scope and management authentication](https://trigger.dev/docs/management/authentication),
[CI deployment](https://trigger.dev/docs/github-actions).

Postiz separates [CLI authentication](https://docs.postiz.com/cli/authentication)
from [self-host installation](https://docs.postiz.com/self-host/installation/docker-compose).
We follow that separation; we do not claim its OAuth device flow exists in our CLI.
