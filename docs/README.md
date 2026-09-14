# 10Signals documentation

See [release status and updates](release-status.md) before switching branches or
assuming a source update changes the running image or installed CLI.

Start with the path that matches what you want to do. The running local preview
has a searchable documentation hub at **http://localhost:8787/docs** (use your
chosen port if different), with Windows and macOS/bash commands and expected outcomes.

## Use the product

- **Using 10Signals** in the docs hub: domains, comparison targets, close-price
  matching, source evidence, report quality and sharing.
- **10Signals Cloud**: the [managed service](https://10signals.xyz/), hosted
  accounts and allowances. No installation or Trigger key needed.

## Self-host

- [Local Docker quickstart](local-quickstart.md): clone, configure and start the
  full project; then add your own OpenAI key in Account → AI provider.
- [Source-build reference](self-hosting.md): for existing source-build/HTTPS
  installations, not the default quickstart.

## API and agents

- **Hosted API** and **Hosted MCP** in the docs hub connect to a customer account
  on the managed service. They do not use company Trigger credentials.
- [Connect an AI agent with MCP](mcp-connection.md): hosted OAuth sign-in and account consent; no local server or separate MCP token.
- General local account API and scheduled watches are not enabled in the local
  preview. Do not infer support from a hosted feature's documentation.

## Configuration and help

Use **Which key do I need?**, **Configure your AI provider**, and
**Troubleshooting** in the hub. Each guide states where it runs, what you need,
how to verify the result and what remains untested.

Preview does not mean production-ready. A connected agent or a valid key does
not prove a real paid report has completed. Never include keys in issues, chat,
screenshots or source control.

## Team Trigger access — approval required

This is the final, separate path for authorized teammates and agents who need
the team's existing Trigger project. It is not a public self-service installation.

1. Ask the 10Signals team administrator to approve your access and confirm the
   project and environment. The team supplies a runtime key securely; request a
   dashboard invitation only if you also need to inspect runs.
2. Follow [team Trigger setup](trigger-authentication.md) to install the CLI on
   Windows or macOS, enter the key at its hidden prompt and run `doctor`.
3. Run only the research approved by your team. Task deployment, worker
   promotion, provider configuration and project access remain with the team.

Installing the npm package or signing in to Trigger does not grant access to
our project. Cloud, self-hosting and external account API/MCP do not require
company Trigger credentials.
