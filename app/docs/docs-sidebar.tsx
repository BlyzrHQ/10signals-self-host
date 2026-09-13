import Link from "next/link";
import { docGroups, docGuides } from "../lib/docs-catalog";

export function DocsSidebar({ current }: { current?: string }) {
  return <aside className="docs-sidebar">
    <Link className="docs-sidebar-title" href="/docs" aria-current={!current ? "page" : undefined}>Documentation</Link>
    <nav aria-label="Documentation">
      {docGroups.map(group => <section className="docs-nav-group" key={group.title}>
        <h2>{group.title}</h2>
        {group.slugs.map(slug => {
          const guide = docGuides.find(item => item.slug === slug)!;
          return <Link key={slug} href={`/docs/${slug}`} aria-current={slug === current ? "page" : undefined}>{guide.title}</Link>;
        })}
      </section>)}
    </nav>
    <div className="docs-sidebar-note">Install your own system, or connect to an existing one. Each guide tells you which.</div>
  </aside>;
}
