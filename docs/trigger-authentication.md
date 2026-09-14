# Team Trigger setup

This path is for authorized teammates and agents connecting to the **team's
existing 10Signals Trigger project**. It is not a public self-service installer.
You do not need to create a project or deploy the tools.

Cloud, local self-hosting and external account API/MCP are separate paths.
They do not require our company Trigger credentials.

## 1. Request access from the team

Ask your 10Signals team administrator to approve your access, confirm the
project and environment, and supply the environment key through an approved
secret-sharing channel. Do not post a key in chat, issues or screenshots.

If you also need to inspect runs in Trigger, ask for a dashboard invitation.
Dashboard access and the CLI environment key are different. Installing this
package or creating a Trigger account does not grant access to our project.

## 2. Install the client

Requires 64-bit Node.js 22+ and npm. Run from any folder; no GitHub or npm
sign-in is needed to install the public preview package.

Windows PowerShell:

```powershell
npm.cmd install --global @10signals/cli@preview
```

macOS / Linux:

```sh
npm install --global @10signals/cli@preview
```

This installs the client only. The team manages the already-deployed tools.

## 3. Configure the approved environment

Windows PowerShell:

```powershell
marketsignal-trigger.cmd configure
```

macOS / Linux:

```sh
marketsignal-trigger configure
```

Enter the team-issued key only at the hidden prompt. Expected: key verified and
saved in the OS credential store. This does not deploy code or start research.

## 4. Check the installed tools

Windows PowerShell:

```powershell
marketsignal-trigger.cmd doctor
```

macOS / Linux:

```sh
marketsignal-trigger doctor
```

Expected: COMPLETED, status ready and four Direct tasks. Research also requires
providerConfigured true; that flag is configuration presence, not proof of
billing credit or a completed report. Doctor starts a capabilities task without
AI/search-provider calls; Trigger compute can apply.

If tasks, the promoted worker or provider configuration are missing, stop and
ask the team to repair the existing environment. Do not create another project,
deploy code or change its provider settings yourself.

## 5. Request an approved report

Windows PowerShell:

```powershell
marketsignal-trigger.cmd report
```

macOS / Linux:

```sh
marketsignal-trigger report
```

Answer the domain, comparison count and search mode, then confirm the agreed
research. Request IDs are automatic; progress and structured results appear in
the same command. Keep the run ID if interrupted. Do not submit another report
merely because the first request is still running.

## Agent credentials and access management

- The team can inject `TRIGGER_SECRET_KEY` through an approved secret manager.
  It **overrides the saved key**, even after configure saves another one. Never
  print it or put it in command arguments.
- The CLI has one saved runtime credential, not named runtime profiles. Linux
  interactive storage requires Secret Service; there is no plaintext fallback.
- Report users do not need an operator login, deployment PAT
  (`TRIGGER_ACCESS_TOKEN`) or the team's `OPENAI_API_KEY`. The team keeps task
  deployment, worker promotion and provider configuration.
- `logout` removes the locally saved key only. It does not revoke the Trigger
  key or unset `TRIGGER_SECRET_KEY`. Ask the team to revoke or rotate access
  when no longer needed, update authorized secret stores and close old agents.
- The client connects to `https://api.trigger.dev`. Custom Trigger endpoints
  are not supported. An account API key or OAuth token cannot replace its
  environment key.

Return to [all documentation](README.md) for Cloud, self-hosting, API and MCP.
