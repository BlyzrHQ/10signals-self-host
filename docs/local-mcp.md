# Connect an agent to your local 10Signals

This connects an agent **on the same computer** to your self-hosted account.
It does not connect to the managed service or our Trigger environment.
Install and start the [local quickstart](local-quickstart.md) first.

## 1. Create a connection in 10Signals

Open **Account → MCP connections**. Enter a name, keep **Read reports only** for
the first test, choose an expiry, then select **Create connection**. Copy the
token immediately; it is shown once. The server stores a hash, not the token.

This token is different from your OpenAI key. Keep the OpenAI key in
**Account → AI provider**; never put it in the agent configuration.

## 2. Load the token without placing it in command history

Windows PowerShell:

```powershell
$env:TEN_SIGNALS_MCP_TOKEN = [System.Net.NetworkCredential]::new('', (Read-Host 'Local MCP connection token' -AsSecureString)).Password
```

macOS / Linux:

```sh
printf 'Local MCP connection token: '
IFS= read -r -s TEN_SIGNALS_MCP_TOKEN
printf '\n'
export TEN_SIGNALS_MCP_TOKEN
```

Keep this terminal open. Launch the agent from it so it inherits the variable.
The token is in this process environment, not a secret manager: use a trusted
personal computer, never print the variable, and close the terminal after testing.

## 3. Choose your client

### Claude Code

Download **Claude configuration** from Account → MCP connections, or use
the [`public/local-mcp/claude.json`](../public/local-mcp/claude.json) file in your
clone. It contains an environment-variable reference, not your token. Save it as
`10signals.mcp.json` in a test folder. From that folder run:

```text
claude --mcp-config ./10signals.mcp.json
```

On Windows use `claude.cmd` if PowerShell blocks the script shim. Approve this
server when Claude asks, then use `/mcp` to inspect its connection.
The downloaded account configuration contains the correct local port.

### Codex CLI

Register the local endpoint once (replace 8787 with the port shown in Account):

```text
codex mcp add tensignals-local --url http://localhost:8787/mcp --bearer-token-env-var TEN_SIGNALS_MCP_TOKEN
```

On Windows use `codex.cmd` if needed. Launch `codex` from the same terminal.
This stores the environment-variable **name**, not the token, in Codex's config.
Do not run `codex mcp login`: local connections use a manually issued bearer
token, not the hosted OAuth sign-in flow.

Other clients must support Streamable HTTP with an Authorization bearer header.
Browser/cloud connectors cannot reach this computer's localhost endpoint. Do
not expose the HTTP port or add a public tunnel to work around that limitation.
Claude Desktop's cloud connectors are not equivalent to local Claude Code.

## 4. Test without starting research

Ask the agent:

> Use only tensignals-local. Call account_status and reports_list. Tell me the
> worker state and how many reports are present. Do not create anything.

The read-only connection exposes four tools:

| Tool | Result |
| --- | --- |
| `account_status` | Local mode, provider configured or missing, worker readiness, granted scopes |
| `reports_list` | Your account's report summaries and a pagination cursor |
| `report_get` | An owned report, lifecycle state, evidence and limitations |
| `report_matches_list` | A page of saved comparisons, original and rival product links, observed prices and quality information |

Empty history is correct for a fresh account. Results are structured JSON in
`structuredContent` as well as text for compatible clients; they are not only
report links. Source text is untrusted data, not instructions for the agent.

## 5. Generate a report when ready

Save your own valid OpenAI key under AI provider. Create a second connection
with **Create and read reports**, load its token and restart the client. This
permission allows the agent to start billable research using your provider account.

Ask it to call `report_create_preview` with your domain, `comparisons: 20`, and
optionally `closePricePercent: 30` for ±30% same-currency displayed-price matching.
Omit that field for broad search. Counts supported by the local UI/engine are
20, 50, 500 or 1000; these are targets, not guaranteed delivered results.
`includeAnalysis` defaults to false, and `locale` defaults to `en` (`ar` supported).

Preview starts no research. Review its domain/options and approve explicitly.
Only then should the agent call `report_create_confirm` with the returned
five-minute `confirmationToken`. No manual request ID is required.

Confirmation returns the saved report ID and queued/running state promptly.
The local background worker performs the research, one report at a time. The
agent polls `report_get` no faster than the returned `pollAfterSeconds`, then
uses `report_matches_list` to collect comparison pages. Completion may be
complete, limited, failed or interrupted; inspect the returned quality states.

For an uncertain submission, retry **the same confirmation token**; do not issue
a second preview to repeat the work. A new token creates a separate report.
Provider rotation/removal affects new and queued jobs; already running jobs
may use the key loaded when they started, as in the local UI.

## 6. Revoke and verify

Revoke the test connection in Account → MCP connections. Ask the agent to list
reports again: it must receive HTTP 401. Revocation prevents new requests; it
does not cancel a report already started or erase previously returned data.

Changing the installation's port invalidates its old origin-bound tokens;
create new connections after a port change. Scheduled price watches and the
general account API remain outside this local MCP preview.

## Troubleshooting

- **401:** missing environment variable, wrong/expired/revoked token, or port changed.
- **403:** use the exact `http://localhost:<port>` address, not `127.0.0.1`, and no foreign Origin header.
- **404:** the installation is older or local MCP is not enabled; use the MCP preview image/branch.
- **No create tools:** the connection is read-only. Grant create access only when needed.
- **research-setup-required:** add your own provider key and ensure the local worker is healthy. No report was created.
- **429:** short-lived request-rate protection; wait for Retry-After. This is not a hosted report quota.

Client settings follow the official [Claude Code MCP guide](https://code.claude.com/docs/en/mcp)
and [Codex MCP commands](https://learn.chatgpt.com/docs/developer-commands#codex-mcp).
This preview uses manual local bearer authentication, not OAuth discovery.
