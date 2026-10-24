import { C, Code, DocHeader, H2, Note, Table, Toc } from "../../../components/docs/Doc";

export const metadata = { title: "Pull requests and baselines" };

export default function PullRequests() {
  return (
    <>
      <DocHeader eyebrow="Automation" title="Pull requests and baselines">
        On a real codebase, the first scan usually finds drift that&apos;s been there for years. A check that lists all
        of it on every change gets ignored. Compare each scan with a baseline instead, and Astrolabe reports only what
        the change adds.
      </DocHeader>

      <Toc
        items={[
          ["idea", "How it works"],
          ["statuses", "Statuses"],
          ["local", "Comparing locally"],
          ["pages", "How pages are paired"],
          ["gate", "Failing on new drift"],
          ["comment", "Reading the comment"],
          ["ci", "Baselines in CI"],
        ]}
      />

      <H2 id="idea">How it works</H2>
      <ol className="doc-list">
        <li>
          Scan your main branch and save the JSON report. This is the <strong>baseline</strong>.
        </li>
        <li>
          Scan the changed version with <C>--baseline</C> pointing at that report.
        </li>
        <li>
          Astrolabe matches pages and findings between the two and labels every finding. Values the baseline had that are
          now gone are listed as <strong>fixed</strong>.
        </li>
      </ol>
      <p>
        Fidelity is still calculated over the whole page, so the score stays comparable over time. The comparison only
        changes how findings are labeled and presented, and what <C>--fail-on-new</C> looks at.
      </p>

      <H2 id="statuses">Statuses</H2>
      <Table
        columns={["Status", "Meaning", "Example"]}
        rows={[
          [<strong>new</strong>, "The value wasn't on this page in the baseline.", <>
            A button now uses <C>#7c3aed</C>.
          </>],
          [<strong>increased</strong>, "The value was there, but more elements use it now.", <>
            <C>13px</C> padding went from 1 element to 3.
          </>],
          [<strong>existing</strong>, "The value was already there, on the same number of elements or fewer.", "Old drift the change didn't touch."],
          [<strong>fixed</strong>, "The baseline had it; it's gone now.", <>
            <C>#ea580c</C> was replaced with a token.
          </>],
        ]}
      />
      <p>
        A value counts as the same when its category and normalized value match, wherever it appears on the page. New
        and increased findings together are what the change <strong>introduced</strong>.
      </p>

      <H2 id="local">Comparing locally</H2>
      <Code title="Terminal">{`
# on main
astrolabe check localhost:3000 localhost:3000/checkout --json main.json

# on your branch
astrolabe check localhost:3000 localhost:3000/checkout --baseline main.json
`}</Code>
      <Code title="Output" copy={false}>{`
  ·      near-miss       font-weight  700      ×2  → font.weight.semibold (600)        h2.line +1
  ×1→2   near-miss       spacing      13px     ×2  → space.3 (12px) 1px off            h1 +1
  new    off-system      color        #7c3aed  ×1  → color.blue.600 (#2563eb) ΔE 12.4  button.pay-button
  fixed  was off-system  color        #ea580c

Compared with main.json: 1 new · 1 increased · 1 fixed · 5 unchanged (fidelity 94% → 90.9%)
`}</Code>
      <p>
        The baseline must be a JSON report from Astrolabe (any version with schema 1). A missing or invalid file stops
        the scan with exit code 2.
      </p>

      <H2 id="pages">How pages are paired</H2>
      <ul className="doc-list">
        <li>
          For <C>http</C> and <C>https</C> URLs, pages are matched by <strong>path and query</strong>, ignoring the host.
          A scan of <C>preview-a.example.com/checkout</C> lines up with <C>preview-b.example.com/checkout</C>, which is
          what you want when every pull request gets its own preview deployment.
        </li>
        <li>Local files are matched by the path as you typed it.</li>
        <li>
          When both reports contain exactly one page, those two pages are compared whatever their URLs, so{" "}
          <C>before.html</C> and <C>after.html</C> work.
        </li>
        <li>A page the baseline didn&apos;t scan counts as entirely new.</li>
      </ul>
      <Note kind="warn" title="Scan the same pages both times">
        <p>
          With several pages, pass the same list in the same form on both runs. If the baseline scanned{" "}
          <C>localhost:3000/checkout</C> and the change scans <C>localhost:3000/checkout/</C>, the trailing slash makes
          them different pages.
        </p>
      </Note>

      <H2 id="gate">Failing on new drift</H2>
      <Code title="Terminal">{`astrolabe check localhost:3000 --baseline main.json --fail-on-new`}</Code>
      <p>
        <C>--fail-on-new</C> exits with status 1 when anything was introduced, and passes when the change only kept or
        removed existing drift. That lets a team adopt Astrolabe without fixing the backlog first. Combine it with{" "}
        <C>--fail-under</C> to also keep a floor under the overall score.
      </p>

      <H2 id="comment">Reading the comment</H2>
      <p>This is the comment Astrolabe posted on a real test pull request that added one value and fixed another:</p>
      <Code title="Pull request comment" copy={false}>{`
🔭 Astrolabe · fidelity 92.7% (−1.3 pts vs main@ae398b34c036)

1 new off-token value in this change · 1 fixed · 6 already there

190 of 205 style values use a design token

examples/checkout/index.html · 92.7%

| | Change | Value | Used | Nearest token | Where |
| 🔴 color | new | #7c3aed border-color | ×1 | color.blue.600 (#2563eb) | main.shell > aside.card.order-summary > button.pay-button |

✅ Fixed: #ea580c color

▸ 6 off-token values already on the base branch
`}</Code>
      <ul className="doc-list">
        <li>The heading shows the score and how it moved compared with the baseline&apos;s commit.</li>
        <li>The table lists only introduced findings, with a Change column (new, or old → new count).</li>
        <li>Fixed values get a line of their own.</li>
        <li>Existing drift is folded into a collapsed section, so it&apos;s there if you want it.</li>
      </ul>

      <H2 id="ci">Baselines in CI</H2>
      <p>
        On GitHub, the <a href="/docs/github-action">Astrolabe Action</a> handles this for you: runs on your main
        branch upload their JSON report, and pull request runs download the latest one and compare. Elsewhere, the
        pattern is the same: save <C>report.json</C> as an artifact or cache entry on main, fetch it in merge request
        jobs, and pass it to <C>--baseline</C>. See <a href="/docs/ci">Other CI systems</a>.
      </p>
    </>
  );
}
