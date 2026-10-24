import { C, Code, DocHeader, H2, Note, Toc } from "../../../components/docs/Doc";
import { VERSION, downloadUrl } from "../../../lib/docs";

export const metadata = { title: "Other CI systems" };

export default function OtherCi() {
  const linux = downloadUrl(`astrolabe_${VERSION}_linux_amd64.tar.gz`);
  return (
    <>
      <DocHeader eyebrow="Automation" title="Other CI systems">
        Astrolabe is a single binary that signals failure through its exit code, so it fits any CI: GitLab, Bitbucket,
        CircleCI, Jenkins, Buildkite or a plain shell script.
      </DocHeader>

      <Toc
        items={[
          ["recipe", "The recipe"],
          ["browser", "Getting a browser"],
          ["gitlab", "GitLab CI"],
          ["baseline", "Baselines"],
          ["comments", "Posting results"],
        ]}
      />

      <H2 id="recipe">The recipe</H2>
      <ol className="doc-list">
        <li>Make sure a Chromium-based browser is available.</li>
        <li>Download the Astrolabe binary (or build it with Go).</li>
        <li>Start your app, or use a URL the job can reach.</li>
        <li>
          Run <C>astrolabe check</C> with the gates you want. Exit code <C>1</C> fails the job; <C>2</C> means the scan
          couldn&apos;t run.
        </li>
        <li>Keep the reports as artifacts.</li>
      </ol>
      <Code title="Any Linux job">{`
curl -sSL ${linux} | tar -xz -C /usr/local/bin astrolabe
astrolabe version
astrolabe check http://localhost:3000 --tokens tokens.json \\
  --fail-under 90 --html astrolabe-report.html --json astrolabe.json --markdown astrolabe.md
`}</Code>

      <H2 id="browser">Getting a browser</H2>
      <p>
        Most hosted runners and many images already include Chrome. In a minimal container, install Chromium from the
        distribution:
      </p>
      <Code title="Debian or Ubuntu images">{`apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates curl fonts-dejavu-core`}</Code>
      <p>
        Inside containers, jobs often run as root, which Chrome refuses without its sandbox flag. Astrolabe adds{" "}
        <C>--no-sandbox</C> automatically on Linux when it runs as root or when <C>CI</C> is set, so no extra
        configuration is needed. If the browser lives somewhere unusual, set <C>ASTROLABE_CHROME</C>.
      </p>
      <Note title="Fonts in minimal images">
        <p>
          Astrolabe checks the font families your CSS asks for, not the fonts that end up rendering, so missing system
          fonts don&apos;t change the results. Installing a basic font package just keeps Chrome&apos;s text rendering
          sensible.
        </p>
      </Note>

      <H2 id="gitlab">GitLab CI</H2>
      <Code title=".gitlab-ci.yml">{`
design-drift:
  image: node:22-bookworm
  stage: test
  before_script:
    - apt-get update && apt-get install -y --no-install-recommends chromium
    - curl -sSL ${linux} | tar -xz -C /usr/local/bin astrolabe
  script:
    - npm ci && npm run build
    - npm start &
    - for i in $(seq 1 60); do curl -sf http://localhost:3000 > /dev/null && break; sleep 1; done
    - astrolabe check http://localhost:3000 --tokens tokens.json --fail-under 90
        --html astrolabe-report.html --json astrolabe.json --markdown astrolabe.md
  artifacts:
    when: always
    paths: [astrolabe-report.html, astrolabe.json, astrolabe.md]
`}</Code>

      <H2 id="baseline">Baselines</H2>
      <p>
        To report only what a merge request adds, keep the JSON report from your main branch and pass it to{" "}
        <C>--baseline</C> (see <a href="/docs/pull-requests">Pull requests and baselines</a>). On GitLab, you can fetch
        the latest main-branch artifact through the job artifacts API:
      </p>
      <Code title=".gitlab-ci.yml (merge request jobs)">{`
  script:
    - >
      curl -sSfL -o astrolabe-main.json
      --header "JOB-TOKEN: $CI_JOB_TOKEN"
      "$CI_API_V4_URL/projects/$CI_PROJECT_ID/jobs/artifacts/$CI_DEFAULT_BRANCH/raw/astrolabe.json?job=design-drift"
      || echo "No baseline yet"
    - if [ -f astrolabe-main.json ]; then BASE="--baseline astrolabe-main.json --fail-on-new"; fi
    - astrolabe check http://localhost:3000 --tokens tokens.json $BASE --json astrolabe.json --markdown astrolabe.md
`}</Code>
      <p>
        Other systems have equivalents: a cache keyed on the main branch, an artifact store, or simply committing a
        baseline file and refreshing it now and then.
      </p>

      <H2 id="comments">Posting results</H2>
      <p>
        <C>--markdown file.md</C> produces the same summary the GitHub Action posts. Feed it to your platform&apos;s
        comment API or a merge request note, or show it in the job log with <C>cat</C>. The first line is an HTML
        comment marker (<C>&lt;!-- astrolabe-report --&gt;</C>) you can use to find and update the previous note
        instead of posting a new one each time.
      </p>
    </>
  );
}
