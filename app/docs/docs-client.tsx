"use client";
import { useState } from "react";
import Link from "next/link";
import { searchDocGuides, type DocGuide } from "../lib/docs-catalog";

const directorySections = [
  { title: "Choose your path", description: "Start with the way you want to use 10Signals.", slugs: ["using-10signals", "hosted", "self-host"] },
  { title: "Connect your account", description: "API and AI-agent access to your own hosted account.", slugs: ["api", "mcp"] },
  { title: "Configuration and help", description: "Provider settings, credentials and troubleshooting.", slugs: ["ai-provider", "credentials", "troubleshooting"] },
  { title: "Team access", description: "For authorized teammates and agents. Request access from the team before connecting to its existing Trigger project.", slugs: ["trigger-cli", "trigger-credentials", "team-trigger"] },
];

export function DocsDirectory({ guides }: { guides: DocGuide[] }) {
  const [query, setQuery] = useState("");
  const matches = searchDocGuides(guides, query);
  return <>
    <div className="docs-search"><label htmlFor="docs-search">Search the guides</label><div>
      <input id="docs-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try API key, Docker, MCP or Trigger…" />
      {query && <button type="button" onClick={() => setQuery("")}>Clear search</button>}
    </div><p role="status" aria-live="polite">{query.trim() ? `${matches.length} ${matches.length === 1 ? "guide" : "guides"} found` : "Find setup instructions, commands and troubleshooting."}</p></div>
    {directorySections.map(section => {
      const visible = section.slugs.map(slug => matches.find(guide => guide.slug === slug)).filter((guide): guide is DocGuide => !!guide);
      if (!visible.length) return null;
      return <section className="docs-directory-section" key={section.title}><h2>{section.title}</h2><p>{section.description}</p><div className="docs-paths">
        {visible.map(guide => <Link className="docs-path" href={`/docs/${guide.slug}`} key={guide.slug}>
          <span className="docs-badge">{guide.status}</span><h3>{guide.title}</h3><p>{guide.summary}</p>
          <span className="docs-path-link">Open guide <span aria-hidden="true">↗</span></span>
        </Link>)}
      </div></section>;
    })}
    {!matches.length && <p className="docs-empty">No guide matches that search. Try a shorter term, or clear the search to see every path.</p>}
  </>;
}

export function GuideSteps({ guide }: { guide: DocGuide }) {
  const [windows, setWindows] = useState(true);
  const [message, setMessage] = useState("");
  return <>
    {guide.steps.some(s => s.windows) && <fieldset className="docs-platform"><legend>Choose your terminal</legend>
      <label><input type="radio" name="platform" checked={windows} onChange={() => setWindows(true)} />Windows PowerShell</label>
      <label><input type="radio" name="platform" checked={!windows} onChange={() => setWindows(false)} />macOS / Linux</label>
    </fieldset>}
    <ol className="docs-steps">{guide.steps.map((step, index) => {
      const command = windows && step.windows ? step.windows : step.command;
      return <li key={step.title} id={`step-${index + 1}`}><span className="docs-step-number" aria-hidden="true">{index + 1}</span><div>
        <h2>{step.title}</h2><p>{step.body}</p>
        {command && <div className="docs-command"><pre><code>{command}</code></pre><button type="button" aria-label={`Copy command for ${step.title}`} onClick={async () => {
          try { await navigator.clipboard.writeText(command); setMessage(`Copied: ${step.title}`); }
          catch { setMessage("Clipboard unavailable. Select and copy the command manually."); }
        }}>Copy</button></div>}
        {step.expected && <p className="docs-expected"><strong>You should see</strong> {step.expected}</p>}
        {step.href && <Link className="docs-inline-link" href={step.href}>{step.link} <span aria-hidden="true">↗</span></Link>}
      </div></li>;
    })}</ol><p className="docs-copy-status" role="status" aria-live="polite">{message}</p>
  </>;
}
