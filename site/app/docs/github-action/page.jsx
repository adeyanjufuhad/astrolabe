import { C, Code, DocHeader, H2, H3, Note, Table, Toc } from "../../../components/docs/Doc";
import { TAG } from "../../../lib/docs";

export const metadata = { title: "GitHub Action" };

export default function GithubAction() {
  return (
    <>
      <DocHeader eyebrow="Automation" title="GitHub Action">
        The Astrolabe Action scans your pages on every pull request, posts one comment that it keeps up to date,
        compares with your main branch, uploads the reports, and can fail the check.
      </DocHeader>

      <Toc
        items={[
          ["setup", "Set it up"],
          ["what-it-does", "What it does"],
          ["inputs", "Inputs"],
          ["outputs", "Outputs and artifacts"],
          ["permissions", "Permissions"],
          ["examples", "Examples"],
          ["notes", "Good to know"],
        ]}
      />

      <H2 id="setup">Set it up</H2>
      <p>
        Add a workflow file to your repository. It needs your app running somewhere the runner can reach; the example
        builds and starts it on the runner. It also runs on pushes to <C>main</C>, because those runs produce the
        baseline that pull requests are compared with.
      </p>
      <Code title=".github/workflows/design-drift.yml">{`
name: Design drift

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write # post the comment
  actions: read        # download main's report for comparison

jobs:
  astrolabe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      # Start your app. Replace with your own build and start commands.
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci && npm run build
      - run: npm start &
      - run: for i in $(seq 1 60); do curl -sf http://localhost:3000 > /dev/null && break; sleep 1; done

      - uses: adeyanjufuhad/astrolabe@${TAG}
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/checkout
          tokens: tokens.json
          fail-on-new: true
`}</Code>
      <p>
        Pin the Action to a release tag such as <C>@{TAG}</C>, so updates only reach you when you choose. The first pull
        request after you add the workflow lists all drift (there&apos;s no baseline yet); once a run on <C>main</C> has
        finished, pull requests show only what they add.
      </p>

      <H2 id="what-it-does">What it does</H2>
      <ol className="doc-list">
        <li>Builds the Astrolabe CLI from the Action&apos;s own source with Go 1.24 (no prebuilt download).</li>
        <li>
          On pull requests, with <C>baseline: auto</C>, finds the newest finished push run of the same workflow on the
          pull request&apos;s base branch and downloads its report. If there isn&apos;t one, it says so in a notice and
          lists everything.
        </li>
        <li>Scans your pages with the browser already installed on the runner (Chrome on Ubuntu).</li>
        <li>Writes the Markdown summary to the job summary, and sets the score as an output.</li>
        <li>Uploads the HTML and JSON reports as one artifact (the JSON becomes the next baseline).</li>
        <li>
          On pull requests, posts the summary as a comment, or edits the comment it posted before, so there&apos;s always
          exactly one.
        </li>
        <li>
          Fails the step if a gate failed (<C>fail-under</C> or <C>fail-on-new</C>). This happens last, so the comment
          and reports are always there.
        </li>
      </ol>

      <H2 id="inputs">Inputs</H2>
      <Table
        columns={["Input", "Default", "Description"]}
        rows={[
          [<C>urls</C>, "required", "Pages to scan: URLs or HTML file paths, separated by spaces or new lines."],
          [<C>tokens</C>, <C>tokens.json</C>, "Path to your token file."],
          [<C>fail-under</C>, <C>0</C>, "Fail when overall fidelity is below this percentage. 0 never fails."],
          [<C>fail-on-new</C>, <C>false</C>, <>
            Fail when the change adds an off-token value or uses one on more elements. Needs a baseline; without one
            it&apos;s skipped with a warning.
          </>],
          [<C>baseline</C>, <C>auto</C>, <>
            <C>auto</C> compares pull requests with the base branch&apos;s latest report; a file path uses that report;{" "}
            <C>none</C> turns comparison off.
          </>],
          [<C>ignore</C>, "", <>
            Comma-separated CSS selectors to skip, e.g. <C>.ads,#cookie-banner</C>.
          </>],
          [<C>viewport</C>, <C>1280x800</C>, "Viewport size as WIDTHxHEIGHT."],
          [<C>comment</C>, <C>true</C>, "Post and keep updating a summary comment on the pull request."],
          [<C>artifact-name</C>, <C>astrolabe-report</C>, <>
            Name of the uploaded artifact. <C>baseline: auto</C> looks for this name in the base branch&apos;s runs.
          </>],
          [<C>server</C>, "", <>
            Optional <a href="/docs/history-server">history server</a> URL to store each scan in.
          </>],
          [<C>api-key</C>, "", "Key for the history server. Pass it from a secret."],
          [<C>project</C>, "repository name", "Project name on the history server."],
          [<C>github-token</C>, <C>github.token</C>, "Token used to comment and to download the baseline."],
        ]}
      />

      <H2 id="outputs">Outputs and artifacts</H2>
      <Table
        columns={["Output", "Description"]}
        rows={[[<C>score</C>, <>
          Overall fidelity, e.g. <C>94</C>. Read it as <C>{"${{ steps.<id>.outputs.score }}"}</C>.
        </>]]}
      />
      <p>
        The artifact (default name <C>astrolabe-report</C>) contains <C>astrolabe-report.html</C> and{" "}
        <C>astrolabe.json</C>. The comment links to the run where you can download it. Artifacts follow your
        repository&apos;s retention setting (90 days by default); baselines older than that are no longer found.
      </p>

      <H2 id="permissions">Permissions</H2>
      <Table
        columns={["Permission", "Needed for"]}
        rows={[
          [<C>contents: read</C>, "Checking out your code."],
          [<C>pull-requests: write</C>, <>
            Posting and updating the comment. Not needed with <C>comment: false</C>.
          </>],
          [<C>actions: read</C>, <>
            Downloading the base branch&apos;s report for <C>baseline: auto</C>.
          </>],
        ]}
      />

      <H2 id="examples">Examples</H2>
      <H3 id="ex-static">A static site or a built folder</H3>
      <Code title="Workflow step">{`
- run: npm ci && npm run build   # writes ./dist
- uses: adeyanjufuhad/astrolabe@${TAG}
  with:
    urls: dist/index.html dist/pricing/index.html
    tokens: design/tokens.json
`}</Code>
      <p>
        HTML files are opened directly. Pages that load assets with root-relative paths (<C>/assets/app.css</C>) need a
        local server instead; for example run <C>npx serve dist -l 3000 &amp;</C> first and scan{" "}
        <C>http://localhost:3000</C>.
      </p>

      <H3 id="ex-mobile">Desktop and mobile in one workflow</H3>
      <p>
        Use two jobs (or a matrix), each with its own artifact name. Keep <C>comment: true</C> on one of them only:
        both comments carry the same marker, so the second would overwrite the first.
      </p>
      <Code title="Workflow steps">{`
- uses: adeyanjufuhad/astrolabe@${TAG}
  with:
    urls: http://localhost:3000
    viewport: 390x844
    artifact-name: astrolabe-mobile
    comment: false
`}</Code>

      <H3 id="ex-threshold">A score floor as well as no new drift</H3>
      <Code title="Workflow step">{`
- uses: adeyanjufuhad/astrolabe@${TAG}
  with:
    urls: http://localhost:3000
    fail-on-new: true
    fail-under: 90
`}</Code>

      <H3 id="ex-history">Keep a history of every scan</H3>
      <Code title="Workflow step">{`
- uses: adeyanjufuhad/astrolabe@${TAG}
  with:
    urls: http://localhost:3000
    server: https://astrolabe-history.example.com
    api-key: \${{ secrets.ASTROLABE_API_KEY }}
`}</Code>

      <H3 id="ex-score">Use the score in a later step</H3>
      <Code title="Workflow steps">{`
- id: drift
  uses: adeyanjufuhad/astrolabe@${TAG}
  with:
    urls: http://localhost:3000
- run: echo "Fidelity is \${{ steps.drift.outputs.score }}%"
`}</Code>

      <H2 id="notes">Good to know</H2>
      <ul className="doc-list">
        <li>
          <strong>Forks.</strong> Pull requests from forks get a read-only token, so the comment can&apos;t be posted.
          Set <C>comment: {"${{ github.event.pull_request.head.repo.full_name == github.repository }}"}</C> to skip it for
          forks; the job summary still has the report.
        </li>
        <li>
          <strong>Deployed previews.</strong> You can scan a preview URL instead of starting the app, as long as the
          runner can open it without signing in. Many hosts protect previews by default; Astrolabe can&apos;t log in.
        </li>
        <li>
          <strong>Other runners.</strong> On self-hosted or non-Ubuntu runners, make sure Chrome, Chromium, Edge or Brave
          is installed, or point <C>ASTROLABE_CHROME</C> at one.
        </li>
        <li>
          <strong>Run time.</strong> Setting up Go and building the CLI takes well under a minute; each page then
          usually takes a few seconds.
        </li>
      </ul>
      <Note title="Not on GitHub?">
        <p>
          The Action is a thin wrapper around the CLI. <a href="/docs/ci">Other CI systems</a> shows the same setup
          anywhere else.
        </p>
      </Note>
    </>
  );
}
