# Releases and updates

Last checked: 14 September 2026.

## Choose the right distribution

| Distribution | Where to start | What it provides |
| --- | --- | --- |
| 10Signals Cloud | [10signals.xyz](https://10signals.xyz/) | Managed accounts and reports; no local installation. |
| Self-hosted 10Signals | [This repository's `main` branch](https://github.com/10claws/10signals-self-host/tree/main) | Local Docker preview with your own account, data and OpenAI key. |
| Trigger CLI | `@10signals/cli@preview` on npm | A separate client for an existing Trigger environment, not a self-hosting or task-deployment installer. |

The self-hosting preview is **local-only**, not a hardened public-server release.
Hosted API/MCP and scheduled watches are not enabled in this local installation.
Company Trigger access requires team approval; it is not a self-service project
installer. See [team setup](trigger-authentication.md). Adding a key or signing in
does not prove a complete research report has succeeded.

## What updates when you pull?

`git pull --ff-only` updates the checked-out branch's source and documentation;
it does not switch an old experiment branch to `main`, install a newer global
CLI, rebuild an image or migrate existing data.

The default Compose setup runs a **digest-pinned prebuilt image**, not a build of
the current checkout. A documentation update alone does not change that image.
Follow the [update and backup instructions](local-quickstart.md) before changing
an existing installation. Keep the same project name, configuration and volumes.

The image currently uses the existing `ghcr.io/blyzrhq/10signals-self-host`
package. The source repository moved to `10claws`; that does not automatically
move container packages. Do not replace the image namespace or remove its digest.

## Source provenance

This is a reviewed public distribution, not a mirror of private development
history. `PUBLIC_SOURCE.json` records the source revision and file hashes.
Documentation overlays are identified separately, including guide UI and its
tests when present. The team-access update changes the source documentation UI,
not research, authentication or the pinned image. Existing prebuilt containers
retain their bundled docs until a separately approved image release. Public
Actions are currently disabled; maintainer
reviewed publication is separate from contributions or local Git pushes.

Use the [documentation index](README.md) for current installation paths. Older
PRs, screenshots and development previews are not release announcements.
