import { C, Code, DocHeader, H2, Note, Table } from "../../../components/docs/Doc";

export const metadata = { title: "Quick start" };

export default function QuickStart() {
  return (
    <>
      <DocHeader eyebrow="Getting started" title="Quick start">
        Five minutes from an empty folder to your first fidelity score. You need Astrolabe installed (see{" "}
        <a href="/docs/install">Installation</a>) and a page to check: your dev server, a staging site or an HTML file.
      </DocHeader>

      <H2 id="tokens">1. Write a token file</H2>
      <p>
        Astrolabe reads design tokens from JSON. If your team already exports tokens from Figma, Tokens Studio or Style
        Dictionary, use that file. Otherwise, start small: save this as <C>tokens.json</C> next to your project.
      </p>
      <Code title="tokens.json">{`
{
  "color": {
    "$type": "color",
    "brand":   { "$value": "#3b82f6" },
    "text":    { "$value": "#111827" },
    "muted":   { "$value": "#6b7280" },
    "surface": { "$value": "#ffffff" },
    "border":  { "$value": "#e5e7eb" }
  },
  "space": {
    "$type": "dimension",
    "1": { "$value": "4px" },
    "2": { "$value": "8px" },
    "3": { "$value": "12px" },
    "4": { "$value": "16px" },
    "6": { "$value": "24px" },
    "8": { "$value": "32px" }
  },
  "radius": {
    "$type": "dimension",
    "sm": { "$value": "4px" },
    "md": { "$value": "8px" },
    "full": { "$value": "9999px" }
  },
  "font": {
    "size": {
      "$type": "dimension",
      "sm": { "$value": "14px" },
      "base": { "$value": "16px" },
      "lg": { "$value": "18px" },
      "2xl": { "$value": "24px" }
    },
    "family": { "sans": { "$type": "fontFamily", "$value": ["Inter", "system-ui", "sans-serif"] } },
    "weight": {
      "$type": "fontWeight",
      "regular": { "$value": 400 },
      "medium": { "$value": 500 },
      "semibold": { "$value": 600 }
    }
  }
}
`}</Code>
      <p>
        The file format is explained in detail on <a href="/docs/tokens">Design tokens</a>. Plain nested JSON like{" "}
        <C>{'{"colors": {"brand": "#3b82f6"}}'}</C> works too.
      </p>

      <H2 id="check-tokens">2. Check how the tokens were understood</H2>
      <p>
        Before scanning, confirm Astrolabe put each token in the right category:
      </p>
      <Code title="Terminal">{`astrolabe tokens tokens.json`}</Code>
      <Code title="Output" copy={false}>{`
tokens.json: 22 tokens

  color        color.brand        #3b82f6
  color        color.text         #111827
  ...
  spacing      space.3            12px
  radius       radius.full        9999px
  font-size    font.size.base     16px
  font-family  font.family.sans   inter
  font-weight  font.weight.medium 500
`}</Code>
      <p>
        Anything Astrolabe couldn&apos;t place, such as line heights or shadows, is listed at the end under{" "}
        <em>Ignored</em>. That&apos;s expected: only the six audited categories matter.
      </p>

      <H2 id="scan">3. Scan a page</H2>
      <p>Point Astrolabe at any page it can open:</p>
      <Code title="Terminal">{`
# your dev server (http:// is added for you)
astrolabe check localhost:3000 --tokens tokens.json

# several pages in one run
astrolabe check localhost:3000 localhost:3000/pricing localhost:3000/checkout --tokens tokens.json

# a deployed site
astrolabe check https://staging.example.com --tokens tokens.json

# a local HTML file
astrolabe check ./dist/index.html --tokens tokens.json
`}</Code>
      <p>
        If your token file is called <C>tokens.json</C> and sits in the current folder, you can leave out{" "}
        <C>--tokens</C> entirely.
      </p>

      <H2 id="read">4. Read the result</H2>
      <p>A scan of a checkout page with a few planted mistakes prints:</p>
      <Code title="Output" copy={false}>{`
Astrolabe  examples/checkout/index.html
Fidelity 94%  ·  189 of 201 values on-token  ·  7 off-token values

  near-miss   font-weight  700      ×2  → font.weight.semibold (600)        h2.line +1
  near-miss   color        #3b82f7  ×1  → color.blue.500 (#3b82f6) ΔE 0.1   button.pay-button
  near-miss   font-size    15px     ×1  → font.size.base (16px) 1px off     p.promo-note
  near-miss   spacing      13px     ×1  → space.3 (12px) 1px off            aside.order-summary
  off-system  font-family  georgia  ×2  → font.family.sans (inter)          p.legal +1
  off-system  color        #ea580c  ×1  → color.gray.500 (#6b7280) ΔE 23.2  p.promo-note
  off-system  font-family  arial    ×1  → font.family.sans (inter)          button.pay-button
`}</Code>
      <Table
        columns={["Column", "Meaning"]}
        rows={[
          ["near-miss / off-system", <>
            Severity. A near-miss is almost a token; off-system has nothing close. See{" "}
            <a href="/docs/matching">How matching works</a>.
          </>],
          ["font-weight, color…", "The category of the value."],
          [<C>700</C>, "The value the page actually renders, normalized (colors as lowercase hex, lengths in px)."],
          [<C>×2</C>, "How many elements use it."],
          [<C>→ font.weight.semibold (600)</C>, "The nearest token and its value, plus the distance: ΔE for colors, px for lengths."],
          [<C>h2.line +1</C>, "Where: the last part of a CSS selector for one element that uses it, and how many more do."],
        ]}
      />
      <p>
        Fix the near-misses first; they&apos;re usually typos. Off-system values are worth a conversation: either the
        code should use an existing token, or your system is missing one.
      </p>

      <H2 id="save">5. Save a report</H2>
      <Code title="Terminal">{`astrolabe check localhost:3000 --html report.html --json report.json`}</Code>
      <p>
        <C>report.html</C> is a single self-contained file you can open in any browser or attach to a ticket. It has
        a score ring, a breakdown per category, color swatches and every finding with all the places it occurs.{" "}
        <a href="/demo-report.html">Open a sample report</a>. The JSON report is for tools and for{" "}
        <a href="/docs/pull-requests">comparing scans</a>. All formats are covered on <a href="/docs/reports">Reports</a>.
      </p>

      <H2 id="ci">6. Fail a build</H2>
      <p>Make CI fail when fidelity drops below a threshold, or only when a change adds drift:</p>
      <Code title="Terminal">{`
# fail below 95% fidelity
astrolabe check https://preview.example.com --fail-under 95

# fail only on drift the change introduces (compared with a scan of main)
astrolabe check https://preview.example.com --baseline main.json --fail-on-new
`}</Code>
      <p>
        Exit code <C>1</C> means the check failed, <C>2</C> means something went wrong (no browser, bad token file,
        page didn&apos;t load). On GitHub, the <a href="/docs/github-action">GitHub Action</a> does all of this and
        comments on the pull request.
      </p>

      <Note kind="tip" title="Next">
        <p>
          Learn the <a href="/docs/tokens">token file format</a> in depth, or set Astrolabe up on{" "}
          <a href="/docs/pull-requests">every pull request</a>.
        </p>
      </Note>
    </>
  );
}
