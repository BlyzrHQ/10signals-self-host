import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { docGroups, docGuides } from "../../lib/docs-catalog";
import { GuideSteps } from "../docs-client";
import { DocsSidebar } from "../docs-sidebar";
import "../docs.css";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = docGuides.find(g => g.slug === slug);
  return { title: guide ? `${guide.title} — 10Signals docs` : "Guide not found — 10Signals" };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  if (slug === "local-mcp") redirect("/docs/mcp");
  if (slug === "own-trigger") redirect("/docs/team-trigger");
  const guide = docGuides.find(g => g.slug === slug);
  if (!guide) notFound();
  const group = docGroups.find(g => g.slugs.includes(slug))!;
  const related = (guide.related || [...group.slugs.filter(id => id !== slug), "troubleshooting"])
    .filter((id, index, items) => id !== slug && items.indexOf(id) === index);
  return <main className="ds-page docs-page"><div className="ds-frame"><SiteHeader current="docs" /><div className="docs-shell">
    <DocsSidebar current={slug} />
    <article className="docs-main docs-article">
      <p className="docs-eyebrow"><Link href="/docs">DOCUMENTATION</Link> / {group.title}</p>
      <span className="docs-badge">{guide.status}</span><h1>{guide.title}</h1><p className="docs-lead">{guide.summary}</p>
      <dl className="docs-prerequisites"><div><dt>Runs on</dt><dd>{guide.runsOn}</dd></div><div><dt>Before you start</dt><dd>{guide.needs}</dd></div></dl>
      <p><Link className="docs-inline-link" href="/docs/credentials">Which key do I need?</Link></p>
      <div className="docs-boundary">{guide.boundary}</div>
      <details className="docs-contents"><summary>On this page</summary><nav aria-label="On this page"><ol>
        {guide.steps.map((step, index) => <li key={step.title}><a href={`#step-${index + 1}`}>{step.title}</a></li>)}
        {guide.troubleshooting && <li><a href="#troubleshooting">Troubleshooting</a></li>}
      </ol></nav></details>
      {guide.table && <div className="docs-table-scroll" role="region" aria-label={`${guide.title} reference`} tabIndex={0}><table>
        <thead><tr>{guide.table.headings.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
        <tbody>{guide.table.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody>
      </table></div>}
      <GuideSteps guide={guide} />
      {guide.troubleshooting && <section id="troubleshooting" className="docs-reference-section"><h2>Troubleshooting</h2>
        {guide.troubleshooting.map(item => <details key={item.problem}><summary>{item.problem}</summary><p>{item.resolution}</p></details>)}
      </section>}
      {guide.sources && <section className="docs-reference-section"><h2>Official reference</h2><ul>{guide.sources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}</ul></section>}
      <section className="docs-reference-section"><h2>Next steps</h2><div className="docs-related">{related.map(id => {
        const next = docGuides.find(g => g.slug === id)!;
        return <Link key={id} href={`/docs/${id}`}>{next.title} <span aria-hidden="true">→</span></Link>;
      })}</div></section>
      <Link className="docs-inline-link" href="/docs">← All guides</Link>
    </article>
  </div></div></main>;
}
