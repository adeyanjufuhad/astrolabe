import { C, Code, DocHeader, H2, H3, Note, Table, Toc } from "../../../components/docs/Doc";

export const metadata = { title: "Reports" };

export default function Reports() {
  return (
    <>
      <DocHeader eyebrow="Using Astrolabe" title="Reports">
        Every scan can be written in four formats: a terminal summary, JSON for tools, Markdown for pull request
        comments, and a self-contained HTML page. This page shows each one and documents the JSON schema field by field.
      </DocHeader>

      <Toc
        items={[
          ["choosing", "Choosing formats"],
          ["text", "Terminal (text)"],
          ["json", "JSON"],
          ["markdown", "Markdown"],
          ["html", "HTML"],
        ]}
      />

      <H2 id="choosing">Choosing formats</H2>
      <p>
        <C>--format</C> sets what goes to standard output (<C>text</C>, <C>json</C>, <C>markdown</C> or <C>html</C>;
        default <C>text</C>). <C>--out file</C> writes that output to a file instead. Independently, <C>--json</C>,{" "}
        <C>--html</C> and <C>--markdown</C> each write one more format to a file. You can combine them freely:
      </p>
      <Code title="Terminal">{`
# terminal summary, plus all three files
astrolabe check localhost:3000 --json report.json --html report.html --markdown report.md

# JSON on stdout, for piping into another tool
astrolabe check localhost:3000 --format json | jq '.score'
`}</Code>

      <H2 id="text">Terminal (text)</H2>
      <Code title="Output" copy={false}>{`
Astrolabe  http://localhost:3000/checkout
Fidelity 94%  ·  189 of 201 values on-token  ·  7 off-token values

  near-miss   color        #3b82f7  ×1  → color.blue.500 (#3b82f6) ΔE 0.1   button.pay-button
  off-system  font-family  arial    ×1  → font.family.sans (inter)          button.pay-button
`}</Code>
      <p>
        One block per page, then <C>Overall fidelity … across N pages</C> when you scanned more than one. With a{" "}
        <a href="/docs/pull-requests">baseline</a>, each finding gets a status column (<C>new</C>, <C>×1→3</C> or{" "}
        <C>·</C> for unchanged), fixed values are listed as <C>fixed</C>, and a last line summarizes the comparison.
      </p>
      <p>
        Colors are used only when standard output is a terminal. They&apos;re turned off by <C>--no-color</C>, by the{" "}
        <C>NO_COLOR</C> environment variable, and whenever output goes to a file or a pipe. The score is green from 95%,
        yellow from 80% and red below.
      </p>

      <H2 id="json">JSON</H2>
      <p>
        The complete result, for scripts, dashboards and <a href="/docs/pull-requests">baselines</a>. The shape is
        versioned by <C>schema</C>: fields may be added in a release, but existing ones only change with a new schema
        number. The current schema is <C>1</C>.
      </p>
      <Code title="report.json (shortened)" copy={false}>{`
{
  "schema": 1,
  "tool": "astrolabe",
  "version": "v0.2.0",
  "generatedAt": "2026-10-24T09:12:03Z",
  "tokensFile": "tokens.json",
  "tokenCounts": { "color": 11, "spacing": 7, "radius": 4, "font-size": 5, "font-family": 1, "font-weight": 3 },
  "gitSha": "ae398b34c036",
  "gitRef": "main",
  "score": 94,
  "checked": 201,
  "matched": 189,
  "pages": [
    {
      "url": "http://localhost:3000/checkout",
      "title": "Checkout · Demo Shop",
      "score": 94,
      "checked": 201,
      "matched": 189,
      "elements": 34,
      "categories": { "color": { "checked": 51, "matched": 49 } },
      "findings": [
        {
          "category": "color",
          "value": "#3b82f7",
          "severity": "near-miss",
          "occurrences": 1,
          "properties": ["background-color"],
          "selectors": ["main.shell > aside.card.order-summary > button.pay-button"],
          "nearest": { "token": "color.blue.500", "value": "#3b82f6", "distance": 0.15 }
        }
      ]
    }
  ]
}
`}</Code>

      <H3 id="json-report">Report fields</H3>
      <Table
        columns={["Field", "Type", "Meaning"]}
        rows={[
          [<C>schema</C>, "number", "Version of this JSON shape. Currently 1."],
          [<C>tool</C>, "string", <>
            Always <C>astrolabe</C>.
          </>],
          [<C>version</C>, "string", "The Astrolabe version that made the report."],
          [<C>generatedAt</C>, "string", "UTC time of the scan (RFC 3339)."],
          [<C>tokensFile</C>, "string", "The token file that was used."],
          [<C>tokenCounts</C>, "object", "Tokens loaded per category."],
          [<C>gitSha</C>, "string", <>
            Commit, shortened to 12 characters, from <C>--git-sha</C> or <C>GITHUB_SHA</C>. Omitted when unknown.
          </>],
          [<C>gitRef</C>, "string", <>
            Branch, from <C>--git-ref</C>, <C>GITHUB_HEAD_REF</C> or <C>GITHUB_REF_NAME</C>. Omitted when unknown.
          </>],
          [<C>score</C>, "number", "Overall fidelity in percent, one decimal."],
          [<>
            <C>checked</C>, <C>matched</C>
          </>, "number", "Values audited and values on-token, across all pages."],
          [<C>pages</C>, "array", "One entry per scanned page (below)."],
          [<C>baseline</C>, "object", <>
            Only with <C>--baseline</C> (below).
          </>],
        ]}
      />

      <H3 id="json-page">Page fields</H3>
      <Table
        columns={["Field", "Type", "Meaning"]}
        rows={[
          [<C>url</C>, "string", "The page, as you passed it for local files, otherwise the full URL."],
          [<C>title</C>, "string", <>
            The page&apos;s <C>&lt;title&gt;</C>.
          </>],
          [<>
            <C>score</C>, <C>checked</C>, <C>matched</C>
          </>, "number", "Fidelity for this page."],
          [<C>elements</C>, "number", "Visible elements found on the page."],
          [<C>categories</C>, "object", <>
            <C>checked</C> and <C>matched</C> per audited category.
          </>],
          [<C>findings</C>, "array", "Off-token values (below), sorted near-misses first."],
          [<C>fixed</C>, "array", "With a baseline: findings the baseline had that are gone. Same shape as findings."],
        ]}
      />

      <H3 id="json-finding">Finding fields</H3>
      <Table
        columns={["Field", "Type", "Meaning"]}
        rows={[
          [<C>category</C>, "string", <>
            <C>color</C>, <C>spacing</C>, <C>radius</C>, <C>font-size</C>, <C>font-family</C> or <C>font-weight</C>.
          </>],
          [<C>value</C>, "string", <>
            Normalized value: lowercase hex for colors (8 digits when not opaque), px for lengths, the lowercase first
            family, or the numeric weight.
          </>],
          [<C>severity</C>, "string", <>
            <C>near-miss</C> or <C>off-system</C>.
          </>],
          [<C>occurrences</C>, "number", "Elements that use this value."],
          [<C>properties</C>, "array", <>
            Properties involved, sides folded (<C>padding</C>, <C>border-color</C>).
          </>],
          [<C>selectors</C>, "array", "Up to five sample elements."],
          [<C>nearest</C>, "object", <>
            The closest token: <C>token</C> (name), <C>value</C> and <C>distance</C> (ΔE for colors, px for lengths,
            weight units for weights, 0 for families).
          </>],
          [<C>status</C>, "string", <>
            With a baseline: <C>new</C>, <C>increased</C> or <C>existing</C>.
          </>],
          [<C>baselineOccurrences</C>, "number", "With a baseline: how many elements used it before."],
        ]}
      />

      <H3 id="json-baseline">Baseline fields</H3>
      <Table
        columns={["Field", "Meaning"]}
        rows={[
          [<C>source</C>, "The baseline report file."],
          [<>
            <C>gitSha</C>, <C>gitRef</C>
          </>, "The commit and branch recorded in the baseline, when present."],
          [<C>score</C>, "The baseline's overall fidelity."],
          [<C>new</C>, "Off-token values the baseline didn't have."],
          [<C>increased</C>, "Values now used on more elements than before."],
          [<C>existing</C>, "Values that were already there."],
          [<C>fixed</C>, "Baseline values that are gone."],
        ]}
      />

      <H2 id="markdown">Markdown</H2>
      <p>
        A compact summary meant for pull request comments and CI job summaries. It starts with the invisible marker{" "}
        <C>&lt;!-- astrolabe-report --&gt;</C>, which the GitHub Action uses to find and update its earlier comment
        instead of posting a new one on every push. Then come the score, a line per page, and a table of up to 25
        findings per page (with &quot;…and N more&quot; after that), using 🟡 for near-misses and 🔴 for off-system
        values.
      </p>
      <p>With a baseline, the layout changes to lead with what the change did:</p>
      <Code title="report.md, rendered" copy={false}>{`
🔭 Astrolabe · fidelity 92.7% (−1.3 pts vs main@ae398b34c036)

1 new off-token value in this change · 1 fixed · 6 already there

| | Change | Value | Used | Nearest token | Where |
| 🔴 color | new | #7c3aed border-color | ×1 | color.blue.600 (#2563eb) | … button.pay-button |

✅ Fixed: #ea580c color

▸ 6 off-token values already on the base branch   (collapsed)
`}</Code>

      <H2 id="html">HTML</H2>
      <p>
        A single file with no external requests: styles and swatches are inline and text uses the system&apos;s fonts,
        so it opens offline and can be attached to a ticket or kept as a CI artifact. For each page it shows a score ring, counts of near-misses and
        off-system values, a bar per category, and a table of findings with color swatches (rendered next to the
        nearest token&apos;s swatch), length bars, the nearest token and every sample selector. With a baseline, new and
        increased findings carry a badge and fixed values are listed.
      </p>
      <p>
        <a href="/demo-report.html">Open a sample HTML report</a>
      </p>
      <Note title="Values are escaped">
        <p>
          Page titles, selectors and values come from the page being scanned, so the HTML report escapes all of them,
          and swatch colors only pass through if they&apos;re plain color literals.
        </p>
      </Note>
    </>
  );
}
