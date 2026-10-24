import { C, Code, DocHeader, H2, H3, Note, Table, Toc } from "../../../components/docs/Doc";

export const metadata = { title: "CLI reference" };

const flag = (name, def, desc) => [<C>{name}</C>, def ? <C>{def}</C> : "", desc];

export default function Cli() {
  return (
    <>
      <DocHeader eyebrow="Using Astrolabe" title="CLI reference">
        Every command, flag, environment variable and exit code of the <C>astrolabe</C> command.
      </DocHeader>

      <Toc
        items={[
          ["commands", "Commands"],
          ["targets", "Targets"],
          ["check-flags", "check flags"],
          ["env", "Environment variables"],
          ["exit-codes", "Exit codes"],
          ["examples", "Examples"],
        ]}
      />

      <H2 id="commands">Commands</H2>
      <Table
        columns={["Command", "What it does"]}
        rows={[
          [<C>astrolabe check &lt;target&gt;… [flags]</C>, "Scan one or more pages against your tokens and report the drift."],
          [<C>astrolabe tokens [file]</C>, <>
            Show how a token file was understood: every token by category, then what was ignored. Uses the same file
            lookup as <C>check</C> when no file is given.
          </>],
          [<C>astrolabe version</C>, <>
            Print the version. <C>--version</C> and <C>-v</C> do the same.
          </>],
        ]}
      />
      <p>
        Run <C>astrolabe</C> with no arguments for a short usage summary, or <C>astrolabe check -h</C> for every flag.
      </p>

      <H2 id="targets">Targets</H2>
      <p>
        <C>check</C> takes any number of targets, scanned one after another in a single browser:
      </p>
      <Table
        columns={["You type", "Astrolabe opens"]}
        rows={[
          [<C>https://example.com/pricing</C>, "That URL, as is (anything containing ://)."],
          [<C>localhost:3000</C>, <>
            <C>http://localhost:3000</C>: targets without a scheme get <C>http://</C>.
          </>],
          [<C>./dist/index.html</C>, <>
            The local file, through a <C>file://</C> URL. Reports show the path you typed.
          </>],
        ]}
      />
      <p>
        Flags can come before, between or after targets: <C>astrolabe check a.html --tokens t.json b.html</C> works.
      </p>

      <H2 id="check-flags">check flags</H2>
      <H3 id="flags-input">Input and output</H3>
      <Table
        columns={["Flag", "Default", "Description"]}
        rows={[
          flag("--tokens", "", <>
            Token file. Without it: <C>tokens.json</C>, <C>design-tokens.json</C>, <C>tokens/tokens.json</C> or{" "}
            <C>.astrolabe/tokens.json</C>, whichever exists first.
          </>),
          flag("--format", "text", <>
            Standard output format: <C>text</C>, <C>json</C>, <C>markdown</C> (or <C>md</C>) or <C>html</C>.
          </>),
          flag("--out", "", "Write the standard output report to this file instead."),
          flag("--json", "", "Also write a JSON report to this file."),
          flag("--html", "", "Also write an HTML report to this file."),
          flag("--markdown", "", "Also write a Markdown report to this file."),
          flag("--no-color", "false", "Turn off colors in the terminal report."),
        ]}
      />
      <H3 id="flags-gates">Gates and baselines</H3>
      <Table
        columns={["Flag", "Default", "Description"]}
        rows={[
          flag("--fail-under", "0", <>
            Exit with status 1 when overall fidelity is below this percentage. <C>0</C> never fails.
          </>),
          flag("--baseline", "", <>
            JSON report of an earlier scan to compare with. Findings are marked new, increased or existing, and gone
            values are listed as fixed. See <a href="/docs/pull-requests">Pull requests and baselines</a>.
          </>),
          flag("--fail-on-new", "false", <>
            Exit with status 1 when any value is new or used on more elements than in <C>--baseline</C>. Requires{" "}
            <C>--baseline</C>.
          </>),
        ]}
      />
      <H3 id="flags-page">Page loading</H3>
      <Table
        columns={["Flag", "Default", "Description"]}
        rows={[
          flag("--viewport", "1280x800", "Viewport size as WIDTHxHEIGHT. Use 390x844 for a typical phone."),
          flag("--wait", "500ms", <>
            Extra time to wait after the page loads and fonts are ready, for client-rendered content. Accepts Go
            durations such as <C>2s</C> or <C>1500ms</C>.
          </>),
          flag("--timeout", "60s", "Time limit per page."),
          flag("--ignore", "", <>
            Comma-separated CSS selectors to skip, along with everything inside them, e.g.{" "}
            <C>&quot;.ads,#cookie-banner,[data-third-party]&quot;</C>.
          </>),
          flag("--max-elements", "5000", "Most elements audited per page."),
          flag("--chrome", "auto", <>
            Path to Chrome, Chromium, Edge or Brave. Defaults to <C>$ASTROLABE_CHROME</C>, then auto-detection.
          </>),
        ]}
      />
      <H3 id="flags-matching">Matching</H3>
      <Table
        columns={["Flag", "Default", "Description"]}
        rows={[
          flag("--px-tolerance", "0.5", "Lengths within this many pixels of a token count as a match."),
          flag("--color-tolerance", "0", "Colors within this OKLab ΔE of a token count as a match. 0 means exact."),
        ]}
      />
      <H3 id="flags-history">History server</H3>
      <Table
        columns={["Flag", "Default", "Description"]}
        rows={[
          flag("--upload", "$ASTROLABE_SERVER", "History server URL to send this scan to. A failed upload is reported but doesn't change the exit code."),
          flag("--project", "", <>
            Project name for <C>--upload</C>. Defaults to <C>$GITHUB_REPOSITORY</C>, else the current folder&apos;s name.
          </>),
          flag("--api-key", "$ASTROLABE_API_KEY", "Bearer key for the history server."),
          flag("--git-sha", "$GITHUB_SHA", "Commit recorded with the scan (shortened to 12 characters)."),
          flag("--git-ref", "$GITHUB_HEAD_REF or $GITHUB_REF_NAME", "Branch recorded with the scan."),
        ]}
      />

      <H2 id="env">Environment variables</H2>
      <Table
        columns={["Variable", "Used for"]}
        rows={[
          [<C>ASTROLABE_CHROME</C>, <>
            Browser binary, when <C>--chrome</C> isn&apos;t given.
          </>],
          [<C>ASTROLABE_SERVER</C>, <>
            Default for <C>--upload</C>.
          </>],
          [<C>ASTROLABE_API_KEY</C>, <>
            Default for <C>--api-key</C> (and the key the history server expects).
          </>],
          [<C>NO_COLOR</C>, "Any value turns off terminal colors."],
          [<C>GITHUB_SHA</C>, <>
            Default for <C>--git-sha</C>.
          </>],
          [<>
            <C>GITHUB_HEAD_REF</C>, <C>GITHUB_REF_NAME</C>
          </>, <>
            Default for <C>--git-ref</C> (the first one that&apos;s set).
          </>],
          [<C>GITHUB_REPOSITORY</C>, <>
            Default for <C>--project</C>.
          </>],
          [<C>CI</C>, <>
            On Linux, adds Chrome&apos;s <C>--no-sandbox</C> flag (also added when running as root).
          </>],
        ]}
      />
      <p>The <C>GITHUB_*</C> variables are set automatically on GitHub Actions; elsewhere you can set them yourself.</p>

      <H2 id="exit-codes">Exit codes</H2>
      <Table
        columns={["Code", "Meaning"]}
        rows={[
          [<C>0</C>, "The scan ran, and no gate failed."],
          [<C>1</C>, <>
            A gate failed: fidelity is below <C>--fail-under</C>, or <C>--fail-on-new</C> found new drift. Reports are
            still written.
          </>],
          [<C>2</C>, "The scan couldn't run: bad flags, no token file, invalid tokens, no browser, or a page that failed to load."],
        ]}
      />

      <H2 id="examples">Examples</H2>
      <Code title="Terminal">{`
# Scan your dev server with the token file in the current folder
astrolabe check localhost:3000

# Several pages, mobile viewport, wait longer for a client-rendered app
astrolabe check localhost:3000 localhost:3000/checkout --viewport 390x844 --wait 2s

# Skip a cookie banner and an embedded third-party widget
astrolabe check https://staging.example.com --ignore "#cookie-banner,.intercom-launcher"

# Fail CI below 95%, and keep an HTML report as an artifact
astrolabe check https://preview.example.com --fail-under 95 --html report.html

# Compare with a scan of main and fail only on new drift
astrolabe check localhost:3000 --baseline main.json --fail-on-new --markdown comment.md

# Accept colors within ΔE 1 and lengths within 1px
astrolabe check localhost:3000 --color-tolerance 1 --px-tolerance 1

# Send the scan to your history server
ASTROLABE_API_KEY=… astrolabe check https://example.com --upload https://history.example.com --project shop
`}</Code>
      <Note kind="tip" title="Quote selectors in your shell">
        <p>
          Selectors often contain characters your shell treats specially (<C>#</C>, <C>[</C>, <C>*</C>). Wrap the{" "}
          <C>--ignore</C> value in quotes.
        </p>
      </Note>
    </>
  );
}
