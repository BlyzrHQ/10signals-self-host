# 10Signals documentation

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

## CLI and Trigger

- [Trigger authentication](trigger-authentication.md): runtime key, operator
  login, CI PAT and worker-provider setup are different things.
- **Connect the Trigger CLI** in the docs hub: install the public npm client,
  configure an existing environment, run doctor, then request a report.
- **Set up your own Trigger project** in the docs hub: release status and
  acceptance requirements. The isolated installer is **not released** in this
  public checkout; the npm client does not deploy tasks.

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
