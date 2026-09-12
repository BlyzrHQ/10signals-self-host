"use client";
import { useState } from "react";
import Link from "next/link";
import type { DocGuide } from "../lib/docs-catalog";

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
