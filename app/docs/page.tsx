import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { docGuides } from "../lib/docs-catalog";
import "./docs.css";
export const metadata: Metadata = { title: "Documentation — 10Signals", description: "Choose how to use, connect to, or install 10Signals. Step-by-step guides for the website, CLI, API, MCP and self-hosting." };
export default function DocsPage() {
  return <main className="ds-page docs-page"><div className="ds-frame"><SiteHeader current="docs" />
    <div className="docs-shell"><aside className="docs-sidebar"><Link className="docs-sidebar-title" href="/docs" aria-current="page">Documentation</Link><p>Choose a path</p><nav aria-label="Documentation">{docGuides.map(g => <Link href={`/docs/${g.slug}`} key={g.slug}>{g.title}</Link>)}</nav><div className="docs-sidebar-note">Installing a client is not the same as installing the service.</div></aside>
    <section className="docs-main"><p className="docs-eyebrow">10SIGNALS / DOCUMENTATION</p><h1>Start with what you want to do.</h1><p className="docs-lead">Use our service, connect your tools, or run your own system. Each path explains where work runs, which credentials you need, and what to expect.</p>
      <div className="docs-paths">{docGuides.map(g => <Link className="docs-path" href={`/docs/${g.slug}`} key={g.slug}><div className="docs-path-top"><span>{g.number}</span><span className="docs-badge">{g.status}</span></div><h2>{g.title}</h2><p>{g.summary}</p><span className="docs-path-link">View guide <span aria-hidden="true">↗</span></span></Link>)}</div>
      <section className="docs-distinction"><h2>Three different kinds of access</h2><dl><div><dt>Your customer account</dt><dd>Website, scoped API keys and OAuth MCP. Uses the hosted service and its allowances.</dd></div><div><dt>Your trusted Trigger environment</dt><dd>Direct CLI tools for authorized operators and teammates. Provider and infrastructure costs belong to that environment.</dd></div><div><dt>Your own installation</dt><dd>The application, storage and worker on infrastructure you control. You configure your own providers and credentials.</dd></div></dl></section>
      <p className="docs-footnote">Preview and candidate labels are intentional. An existing interface is not a claim that every client or clean installation has passed acceptance.</p>
    </section></div></div></main>;
}
