# Contributing to 10Signals

This repository is a maintained public source distribution. Open an issue or PR
with a reproducible problem, proposed change, and relevant tests. Do not include
API keys, cookies, private reports, environment files or account records.

Maintainers integrate approved contributions upstream, then synchronize the
reviewed source here. There is no automatic path from public PRs to private CI,
production infrastructure or deployment credentials.

For this preview, install locked dependencies with `npm ci` (`npm.cmd ci` on
Windows), run `npm test`, `npm run lint`, and `npm run build:vps`. These tests do
not launch paid research. Do not claim a real-data test passed using fixtures.

Use your own provider account for explicitly chosen live tests. Respect public
site access rules, rate limits and data-source boundaries. Label observed facts,
inferences, estimates and recommendations distinctly.
