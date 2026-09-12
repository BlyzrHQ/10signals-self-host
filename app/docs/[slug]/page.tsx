import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { docGuides } from "../../lib/docs-catalog";
import { GuideSteps } from "../docs-client";
import "../docs.css";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const {slug} = await params; const guide = docGuides.find(g => g.slug === slug); return { title: guide ? `${guide.title} — 10Signals docs` : "Guide not found — 10Signals" }; }
export default async function GuidePage({ params }: Props) {
  const {slug} = await params; const guide = docGuides.find(g => g.slug === slug); if (!guide) notFound();
  return <main className="ds-page docs-page"><div className="ds-frame"><SiteHeader current="docs" /><div className="docs-shell">
    <aside className="docs-sidebar"><Link className="docs-sidebar-title" href="/docs">Documentation</Link><p>Choose a path</p><nav aria-label="Documentation">{docGuides.map(g => <Link href={`/docs/${g.slug}`} key={g.slug} aria-current={g.slug === slug ? "page" : undefined}>{g.title}</Link>)}</nav></aside>
    <article className="docs-main docs-article"><p className="docs-eyebrow"><Link href="/docs">DOCUMENTATION</Link> / {guide.number}</p><span className="docs-badge">{guide.status}</span><h1>{guide.title}</h1><p className="docs-lead">{guide.summary}</p><dl className="docs-prerequisites"><div><dt>Runs on</dt><dd>{guide.runsOn}</dd></div><div><dt>You need</dt><dd>{guide.needs}</dd></div></dl><div className="docs-boundary">{guide.boundary}</div><GuideSteps guide={guide} /><Link className="docs-inline-link" href="/docs">← All connection and installation options</Link></article>
  </div></div></main>;
}
