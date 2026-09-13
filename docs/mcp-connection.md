# Connect an external agent with MCP

Connect an AI agent to your hosted 10Signals account. No local installation, Docker, Trigger key or separate MCP token is needed. This connection does not access reports stored in a self-hosted installation.
The instructions below are only for the hosted service.

This connects a customer's account to the hosted service. It is **not** the
internal Trigger CLI and does not install research tasks. No Trigger key is given
to the agent. Self-hosted OAuth origins are not supported by this candidate.

## 1. Add the server

In a client's remote MCP settings enter `https://10signals.xyz/mcp` and choose
OAuth sign-in. It must support the server's OAuth discovery/CIMD metadata profile;
do not assume all older MCP clients are compatible. Dynamic client registration
is intentionally disabled. Do not paste an account API key as an OAuth token.

### Codex compatibility check — 13 September 2026

Codex CLI `0.144.1` failed before sign-in with “Dynamic client registration not
supported.” Codex CLI `0.154.0` selected the official ChatGPT-hosted client
metadata and generated an authorization request for the hosted MCP endpoint.
Account consent and authenticated tool calls remain an acceptance gate; an
authorization link is not proof of a completed connection.

If Codex is your client, check its version before troubleshooting the server.
For an isolated version check without replacing your global installation:

Windows PowerShell:

```powershell
npx.cmd --yes @openai/codex@0.154.0 --version
```

macOS/Linux:

```sh
npx --yes @openai/codex@0.154.0 --version
```

These commands install/run the **agent client**, not a local 10Signals MCP
server. The server address stays `https://10signals.xyz/mcp`. For an already
configured server named `tensignals`, use `mcp login tensignals --scopes
reports:read` with that client version. Codex also requests `offline_access`;
review its “Stay connected” permission before approving. Open the printed sign-in
link in your normal browser if no browser window opens. Keep the command running
until authorization finishes; do not copy an old link after the command exits.

See the [official Codex MCP guide](https://learn.chatgpt.com/docs/extend/mcp).

## 2. Consent to the minimum scope

Start with `reports:read` and optionally `price_watch:read`. Review the actual
client host on the consent page; a client-provided name is not verified identity.
Only approve `reports:create` or `price_watch:write` when you want paid actions.
`offline_access` allows refresh for longer-lived connections; revoke when unused.

## 3. Test read-only first

Ask: “List my reports with account_status and reports_list. Do not create anything.”
Then use `report_get` with an owned publicReportId and `report_matches_list` to
retrieve comparison pages. These are private owned records; the word publicId
does not make the report public. Empty history is valid for a new account.

## 4. Create a report with confirmation

Use `report_create_preview` with your own primaryDomain and locale. Read the plan
comparison count and report-allowance impact. Preview starts no research. After
your approval, call `report_create_confirm` with that preview's confirmationToken.
Tokens expire after five minutes; repeat the preview when expired or impact changes.
The same confirm token replays the same outcome; do not generate a new preview to
retry an uncertain submission. Poll report_get using the returned publicReportId.

## 5. Watch one product or a competitor

Read existing watches with `price_watch_list`. Use `price_watch_preview` with
an owned publicReportId, a matchId **or** rivalDomain, and cadence. Review the exact
targets, baseline credits and ongoing cadence. After approval use
`price_watch_confirm`. Price checking is recurring paid work: one product check
uses one credit. Use `price_watch_disable` to stop the test; changing cadence or
deleting uses the corresponding preview/confirm tools. Never enable all rivals
just to test connectivity.

## 6. Revoke

Account → Connected apps lists approved connections. Revoke the test connection,
then verify the client can no longer read your reports. Revoking OAuth does not
revoke unrelated API keys; manage those separately in Account → API keys.

## Operator diagnostic (no paid calls)

From this source candidate, Node.js 22+ on Windows/macOS/Linux:

```text
node scripts/check-mcp-connection.mjs
```

This checks public discovery and the unauthenticated 401 challenge only. It
does not sign in, list private reports, run tools or prove client compatibility.
The result explicitly returns `clientLoginTested: false` and `toolsTested: false`.

Automated protocol tests cover scope-filtered tool discovery, owned records,
preview/confirm replay, permission denial, revocation and price-watch controls.
They are not a claim that a particular external client completed live OAuth.
That browser/client acceptance test remains required before release.
