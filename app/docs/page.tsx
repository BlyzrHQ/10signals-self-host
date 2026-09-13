import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import { docGuides } from "../lib/docs-catalog";
import { DocsSidebar } from "./docs-sidebar";
import { DocsDirectory } from "./docs-client";
import "./docs.css";

export const metadata: Metadata = { title: "Documentation — 10Signals", description: "Product guides, Cloud, self-hosting, CLI, Trigger authentication, API and MCP. Choose your path and follow the steps." };

export default function DocsPage() {
  return <main className="ds-page docs-page"><div className="ds-frame"><SiteHeader current="docs" />
    <div className="docs-shell"><DocsSidebar />
      <section className="docs-main"><p className="docs-eyebrow">10SIGNALS / DOCUMENTATION</p>
        <h1>Your starting point.</h1>
        <p className="docs-lead">Learn the product, use 10Signals Cloud, or run your own installation. Then connect the tools you need.</p>
        <DocsDirectory guides={docGuides} />
        <p className="docs-footnote">Preview labels show what is available for testing. A working connection is not proof of a completed research run. Installation and service credentials are always separate.</p>
      </section>
    </div>
  </div></main>;
}
