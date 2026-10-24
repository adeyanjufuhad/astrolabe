import { C, DocHeader, H2, Note, Table } from "../../components/docs/Doc";

export const metadata = { title: { absolute: "Docs · Astrolabe" } };

export default function Introduction() {
  return (
    <>
      <DocHeader eyebrow="Getting started" title="Astrolabe documentation">
        Astrolabe opens your pages in a real browser, reads the styles that actually render, and checks every color,
        spacing value, radius, font size, font family and font weight against your design tokens. For each value that
        isn&apos;t a token, it tells you the closest one.
      </DocHeader>

      <p>
        Design tokens only help if the shipped interface uses them. Values get hard-coded under deadline pressure, copied
        from old screens, or written by tools that don&apos;t know your system. Screenshot comparisons catch visual
        changes against a baseline image. Astrolabe checks against your <strong>source of truth</strong> instead, so it
        catches drift on day one, with no baseline image needed.
      </p>

      <H2 id="what-it-checks">What it checks</H2>
      <p>Six kinds of value, read from the computed styles of every visible element:</p>
      <Table
        columns={["Category", "CSS properties", "Example finding"]}
        rows={[
          ["Color", <>
            <C>color</C>, <C>background-color</C>, border colors
          </>, <>
            <C>#3b82f7</C> where the token is <C>#3b82f6</C>
          </>],
          ["Spacing", <>
            <C>padding</C>, <C>margin</C>, flex and grid <C>gap</C>
          </>, <>
            <C>13px</C> where the scale has <C>12px</C>
          </>],
          ["Radius", <C>border-radius</C>, <>
            <C>7px</C> where the scale has <C>8px</C>
          </>],
          ["Font size", <C>font-size</C>, <>
            <C>15px</C> where the scale has <C>16px</C>
          </>],
          ["Font family", <C>font-family</C>, <>
            <C>Arial</C> where the token is <C>Inter</C>
          </>],
          ["Font weight", <C>font-weight</C>, <>
            <C>700</C> where the scale stops at <C>600</C>
          </>],
        ]}
      />
      <p>
        A category is only checked when your token file defines tokens for it, so a file with just colors produces a
        color-only audit.
      </p>

      <H2 id="how-it-works">How it works</H2>
      <ol className="doc-list">
        <li>
          <strong>Render.</strong> Astrolabe launches the Chrome, Edge, Chromium or Brave already installed on your machine,
          headless, and drives it over the DevTools protocol with a small built-in client. Nothing extra is downloaded.
        </li>
        <li>
          <strong>Read.</strong> It loads each page, waits for fonts, then reads <C>getComputedStyle</C> for every visible
          element. Hidden elements, transparent colors, zero spacing, <C>margin: auto</C> and borders that aren&apos;t
          drawn are skipped.
        </li>
        <li>
          <strong>Match.</strong> Colors are compared in the perceptual OKLab color space, and lengths in pixels.
        </li>
        <li>
          <strong>Report.</strong> Identical off-token values are grouped and ranked, near-misses first. You get a terminal
          summary and, if you ask, JSON, Markdown and a self-contained HTML report.
        </li>
      </ol>

      <H2 id="near-miss-vs-off-system">Near-miss or off-system</H2>
      <p>Every off-token value gets one of two severities:</p>
      <ul className="doc-list">
        <li>
          <strong>Near-miss:</strong> almost a token. It&apos;s probably a typo or a hand-typed value, like{" "}
          <C>#3b82f7</C> instead of the brand blue <C>#3b82f6</C>, or <C>13px</C> instead of <C>12px</C>. These are
          usually one-line fixes.
        </li>
        <li>
          <strong>Off-system:</strong> nothing in your tokens is close. It&apos;s either a deliberate one-off or a gap in
          your design system worth discussing.
        </li>
      </ul>
      <p>
        The exact thresholds are on <a href="/docs/matching">How matching works</a>.
      </p>

      <H2 id="fidelity">The fidelity score</H2>
      <p>
        Fidelity is the share of audited values that use a token: <C>matched ÷ checked × 100</C>, rounded to one decimal.
        A page where 189 of 201 values are on-token scores <C>94%</C>. An empty audit scores 100. The terminal colors
        the score green from 95%, yellow from 80% and red below that.
      </p>

      <H2 id="where-it-runs">Where it runs</H2>
      <Table
        columns={["Where", "How", "Read more"]}
        rows={[
          ["Your machine", "One binary, no account, no server", <a href="/docs/install">Installation</a>],
          ["Pull requests on GitHub", "The Astrolabe Action comments on every PR", <a href="/docs/github-action">GitHub Action</a>],
          ["Any other CI", "Run the binary and use its exit code", <a href="/docs/ci">Other CI systems</a>],
          ["Over time", "Optional server that stores scan history in Postgres", <a href="/docs/history-server">History server</a>],
        ]}
      />

      <H2 id="limits">What it doesn&apos;t do</H2>
      <ul className="doc-list">
        <li>
          It checks style <strong>values</strong>, not layout or structure. A button in the wrong place won&apos;t be
          flagged.
        </li>
        <li>
          It&apos;s only as good as your token file. Values you intentionally keep outside the system show up as
          off-system; skip those areas with <C>--ignore</C>.
        </li>
        <li>
          <C>rem</C> and <C>em</C> token values are converted assuming a 16px root font size.
        </li>
        <li>
          It audits one viewport per run. Run it again with <C>--viewport 390x844</C> for mobile.
        </li>
        <li>It suggests the nearest token but doesn&apos;t edit your code.</li>
      </ul>

      <Note kind="tip" title="Your data stays with you">
        <p>
          Astrolabe runs entirely on your machine or CI runner. Nothing is sent anywhere unless you pass{" "}
          <C>--upload</C> to a history server you run yourself.
        </p>
      </Note>
    </>
  );
}
