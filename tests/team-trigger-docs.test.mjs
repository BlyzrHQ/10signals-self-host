import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = file => readFileSync(file, "utf8");
const compiled = ts.transpile(read("app/lib/docs-catalog.ts"), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
const exports = {};
new Function("exports", compiled)(exports);
const { docGuides, docGroups, searchDocGuides } = exports;

test("team Trigger setup is last in navigation, directory and the guide list", () => {
  assert.equal(docGroups.at(-1).title, "Team access");
  assert.deepEqual(docGroups.at(-1).slugs, ["trigger-cli", "trigger-credentials", "team-trigger"]);
  assert.equal(docGuides.at(-1).slug, "team-trigger");
  assert.deepEqual(docGuides.map(guide => guide.slug), docGroups.flatMap(group => group.slugs));
  const directory = read("app/docs/docs-client.tsx").split("export function DocsDirectory")[0];
  assert.ok(directory.lastIndexOf('title: "Team access"') > directory.indexOf('title: "Configuration and help"'));
  assert.match(directory, /slugs: \["trigger-cli", "trigger-credentials", "team-trigger"\]/);
  const headings = [...read("docs/README.md").matchAll(/^## (.+)$/gm)];
  assert.match(headings.at(-1)[1], /Team Trigger access/);
  const readmeHeadings = [...read("README.md").matchAll(/^## (.+)$/gm)];
  assert.match(readmeHeadings.at(-1)[1], /[Tt]eam.*[Tt]rigger|Trigger CLI.*team access/);
});

test("team approval is explicit and happens before CLI configuration", () => {
  const cli = docGuides.find(guide => guide.slug === "trigger-cli");
  const setup = docGuides.find(guide => guide.slug === "team-trigger");
  for (const guide of [cli, setup]) {
    assert.equal(guide.status, "Team access required");
    assert.match(guide.steps[0].title, /Request.*access/);
    assert.ok(!guide.steps[0].command && !guide.steps[0].windows);
    assert.match(guide.needs, /[Tt]eam/);
  }
  assert.match(setup.boundary, /does not grant access/);
  assert.match(JSON.stringify(setup), /dashboard invitation/);
  const install = cli.steps.findIndex(step => step.command?.startsWith("npm install"));
  const configure = cli.steps.findIndex(step => step.command === "marketsignal-trigger configure");
  assert.ok(install > 0 && configure > install);
  assert.equal(cli.steps[configure].windows, "marketsignal-trigger.cmd configure");
  assert.match(cli.steps[configure].body, /supplied securely by the team/);
});

test("team docs do not offer project creation or deployment commands", () => {
  for (const slug of ["team-trigger", "trigger-cli", "trigger-credentials"]) {
    const guide = docGuides.find(item => item.slug === slug);
    const commands = guide.steps.flatMap(step => [step.command || "", step.windows || ""]).join("\n");
    assert.doesNotMatch(commands, /trigger\.dev.*(?:login|deploy)|setup-own-trigger/);
  }
  const reference = read("docs/trigger-authentication.md");
  assert.match(reference, /team's\s+existing|team's\nexisting|team's existing/);
  assert.match(reference, /npm\.cmd install --global @10signals\/cli@preview/);
  assert.match(reference, /npm install --global @10signals\/cli@preview/);
  assert.match(reference, /hidden prompt/);
  assert.match(reference, /overrides the saved key/);
  assert.doesNotMatch(reference, /npx.*trigger\.dev|--profile 10signals-own/);
  assert.ok(searchDocGuides(docGuides, "TRIGGER_ACCESS_TOKEN").some(guide => guide.slug === "trigger-credentials"));
});

test("old own-project links redirect while external accounts remain separate", () => {
  assert.ok(!docGuides.some(guide => guide.slug === "own-trigger"));
  assert.match(read("app/docs/[slug]/page.tsx"), /if \(slug === "own-trigger"\) redirect\("\/docs\/team-trigger"\)/);
  assert.match(docGuides.find(guide => guide.slug === "team-trigger").boundary, /External customers/);
  assert.match(docGuides.find(guide => guide.slug === "mcp").boundary, /No Trigger key is needed/);
  const landing = read("app/cli/page.tsx");
  assert.match(landing, /Request team approval before connecting/);
  assert.match(landing, /href="\/docs\/trigger-cli"/);
  assert.doesNotMatch(landing, /https:\/\/github.com\/10claws\/market-signal/);
});
