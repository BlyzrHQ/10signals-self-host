import { SiteHeader } from "../components/site-header";

export default function CliPage() {
  return <main className="ds-page acct-page cli-page-ds" lang="en" dir="ltr">
    <div className="ds-frame">
      <SiteHeader current="cli" />
      <section className="cli-hero">
        <p className="ds-kicker">Tools for your team</p>
        <h1 className="ds-h1-md">A domain in.<br />Comparison data out.</h1>
        <p>The internal 10Signals CLI calls the tools in your Trigger project directly. Your agents receive structured results, without a website sign-in. This is trusted team access to an existing environment—not a website installer or a customer API connection.</p>
      </section>
      <section className="cli-grid" aria-label="Internal CLI overview">
        <article className="ds-card cli-step"><span>01</span><div><h2 className="ds-h3">Install and configure</h2><p>Use the installation steps in the branch README. Run configure to verify and securely save your Trigger environment key at a hidden prompt. Never put a key in a command or share it in chat.</p><pre className="acct-code"><code>marketsignal-trigger configure</code></pre></div></article>
        <article className="ds-card cli-step"><span>02</span><div><h2 className="ds-h3">Check the tools</h2><p>Confirm the installed tasks and provider configuration before creating a report. This uses the currently promoted worker. If your operator gives you a worker-version pin, use that same pin for doctor and report.</p><pre className="acct-code"><code>marketsignal-trigger doctor</code></pre></div></article>
        <article className="ds-card cli-step"><span>03</span><div><h2 className="ds-h3">Request your comparisons</h2><p>Run report in a terminal for guided domain, count and search-mode questions. Request IDs are generated automatically. Review the cost warning and type yes to start. The command waits and returns results itself; coverage limitations stay visible.</p><pre className="acct-code"><code>marketsignal-trigger report</code></pre><p>For agents, this illustrative syntax submits directly; replace the domain placeholder:</p><pre className="acct-code"><code>{'marketsignal-trigger report "<domain>" --comparisons 20'}</code></pre></div></article>
        <article className="ds-card cli-handoff"><p className="ds-kicker">The complete handoff</p><p>The branch README separates client installation, operator deployment and external account connections. Provider credentials are configured by your operator on Trigger; configure does not install task code or provision providers. External customers must not use our company Trigger key.</p><a className="ds-btn ds-btn-primary ds-btn-pill" href="https://github.com/10claws/market-signal/blob/master/docs/direct-trigger-cli.md" target="_blank" rel="noreferrer">Open installation and first-report instructions ↗</a></article>
      </section>
    </div>
  </main>;
}
