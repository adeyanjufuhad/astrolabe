"use client";

import { usePathname } from "next/navigation";
import { DOCS, DOC_PAGES } from "../../lib/docs";

const clean = (p) => (p || "/docs").replace(/\.html$/, "").replace(/\/$/, "") || "/docs";

// Sidebar: grouped links with the current page highlighted. On small screens it
// collapses into a <details> menu, so it needs no extra JavaScript to open.
export function DocsSidebar() {
  const path = clean(usePathname());
  const current = DOC_PAGES.find((p) => p.href === path);
  const links = (
    <nav aria-label="Documentation">
      {DOCS.map((g) => (
        <div key={g.group} className="docs-group">
          <p className="docs-group-title">{g.group}</p>
          <ul>
            {g.pages.map((p) => (
              <li key={p.href}>
                <a href={p.href} className={p.href === path ? "active" : undefined} aria-current={p.href === path ? "page" : undefined}>
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-desktop">{links}</div>
      <details className="docs-sidebar-mobile">
        <summary>
          <span className="eyebrow">Docs</span> {current ? current.title : "Menu"}
        </summary>
        {links}
      </details>
    </aside>
  );
}

// Previous and next page links at the end of each page.
export function DocsPager() {
  const path = clean(usePathname());
  const i = DOC_PAGES.findIndex((p) => p.href === path);
  if (i < 0) return null;
  const prev = DOC_PAGES[i - 1];
  const next = DOC_PAGES[i + 1];
  return (
    <nav className="docs-pager" aria-label="Previous and next pages">
      {prev ? (
        <a href={prev.href} className="docs-pager-link">
          <span className="eyebrow">Previous</span>
          {prev.title}
        </a>
      ) : (
        <span />
      )}
      {next && (
        <a href={next.href} className="docs-pager-link next">
          <span className="eyebrow">Next</span>
          {next.title}
        </a>
      )}
    </nav>
  );
}
