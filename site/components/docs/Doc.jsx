import CopyButton from "../CopyButton";

// Building blocks for documentation pages. All styles live in app/globals.css (.doc-*).

export function DocHeader({ eyebrow, title, children }) {
  return (
    <header className="doc-header">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children && <p className="doc-lead">{children}</p>}
    </header>
  );
}

// A section heading with an anchor link.
export function H2({ id, children }) {
  return (
    <h2 id={id} className="doc-h2">
      <a href={`#${id}`} className="doc-anchor" aria-hidden="true" tabIndex={-1}>
        #
      </a>
      {children}
    </h2>
  );
}

export function H3({ id, children }) {
  return (
    <h3 id={id} className="doc-h3">
      {children}
    </h3>
  );
}

// "On this page" list for long pages.
export function Toc({ items }) {
  return (
    <nav className="doc-toc" aria-label="On this page">
      <p className="eyebrow">On this page</p>
      <ol>
        {items.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`}>{label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// A code block with an optional title and a copy button.
export function Code({ title, children, copy = true }) {
  const text = String(children).replace(/^\n/, "").replace(/\n\s*$/, "");
  return (
    <figure className="doc-code">
      <div className="doc-code-bar">
        <span>{title || "Example"}</span>
        {copy && <CopyButton text={text} />}
      </div>
      <pre translate="no">
        <code>{text}</code>
      </pre>
    </figure>
  );
}

export function Note({ kind = "note", title, children }) {
  return (
    <aside className={`doc-note ${kind}`}>
      {title && <p className="doc-note-title">{title}</p>}
      <div>{children}</div>
    </aside>
  );
}

// A simple table: columns is a list of headings, rows a list of cell arrays.
export function Table({ columns, rows }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const C = ({ children }) => <code className="doc-inline">{children}</code>;
