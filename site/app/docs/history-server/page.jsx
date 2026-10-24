import { C, Code, DocHeader, H2, H3, Note, Table, Toc } from "../../../components/docs/Doc";

export const metadata = { title: "History server" };

export default function HistoryServer() {
  return (
    <>
      <DocHeader eyebrow="More" title="History server">
        An optional companion service that stores every scan in Postgres, so you can track fidelity over time per
        project, page and branch. Astrolabe works fully without it.
      </DocHeader>

      <Toc
        items={[
          ["overview", "Overview"],
          ["install", "Install"],
          ["database", "Set up the database"],
          ["run", "Run it"],
          ["upload", "Send scans to it"],
          ["api", "API reference"],
          ["schema", "Database tables"],
          ["deploy", "Deploying"],
        ]}
      />

      <H2 id="overview">Overview</H2>
      <p>
        <C>astrolabe-server</C> is a small HTTP API. The CLI and the GitHub Action can upload each JSON report to it
        (<C>--upload</C>), and it stores one row per scanned page plus every finding. Read scores and history back
        through the API to build dashboards or trend charts. It has no web interface of its own.
      </p>

      <H2 id="install">Install</H2>
      <p>The server isn&apos;t part of the release downloads. Build it with Go 1.24 or newer:</p>
      <Code title="Terminal">{`go install github.com/adeyanjufuhad/astrolabe/cmd/astrolabe-server@latest`}</Code>

      <H2 id="database">Set up the database</H2>
      <p>
        Any Postgres works. Neon&apos;s free tier is plenty for scan history:
      </p>
      <ol className="doc-list">
        <li>Create a project in the Neon console.</li>
        <li>
          Open <em>Connect</em> and copy the connection string.
        </li>
        <li>
          Keep <C>sslmode=require</C>. If the string contains <C>channel_binding=require</C>, remove that part: the
          Postgres driver Astrolabe uses doesn&apos;t support it.
        </li>
      </ol>
      <p>
        The server creates its tables on startup (pass <C>-migrate=false</C> to skip that). Running it again is safe;
        existing data is kept.
      </p>

      <H2 id="run">Run it</H2>
      <Code title="Terminal">{`
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
export ASTROLABE_API_KEY="a-long-random-secret"
astrolabe-server
`}</Code>
      <Table
        columns={["Setting", "Default", "Description"]}
        rows={[
          [<C>DATABASE_URL</C>, "required", "Postgres connection string. The server won't start without it."],
          [<C>ASTROLABE_API_KEY</C>, "", <>
            Secret required to upload scans. If unset, the server warns at startup and <strong>anyone can upload</strong>
            . Reading is always open.
          </>],
          [<C>PORT</C>, <C>8080</C>, "Port to listen on."],
          [<C>-addr</C>, <C>:$PORT</C>, <>
            Listen address flag, e.g. <C>-addr 127.0.0.1:9000</C>.
          </>],
          [<C>-migrate</C>, <C>true</C>, "Create tables on startup."],
        ]}
      />
      <p>
        Check it&apos;s up with <C>curl http://localhost:8080/healthz</C>, which returns <C>{'{"status":"ok"}'}</C>.
      </p>

      <H2 id="upload">Send scans to it</H2>
      <Code title="Terminal">{`
astrolabe check https://example.com --upload http://localhost:8080 --project shop --api-key "$ASTROLABE_API_KEY"
`}</Code>
      <p>
        Or set <C>ASTROLABE_SERVER</C> and <C>ASTROLABE_API_KEY</C> once. The project defaults to{" "}
        <C>GITHUB_REPOSITORY</C>, else the current folder&apos;s name. The commit and branch come from{" "}
        <C>--git-sha</C> and <C>--git-ref</C> (filled in automatically on GitHub Actions). A failed upload prints a
        message but doesn&apos;t fail the scan. With the Action, use the <C>server</C> and <C>api-key</C> inputs.
      </p>

      <H2 id="api">API reference</H2>
      <p>
        All responses are JSON. Errors look like <C>{'{"error": "message"}'}</C>. Cross-origin requests are allowed from
        any origin, so a dashboard on another domain can read the API.
      </p>

      <H3 id="api-post">POST /api/scans?project=NAME</H3>
      <p>
        Stores one report. Send the JSON report as the body, with <C>Authorization: Bearer &lt;key&gt;</C>. The project
        name is required (at most 200 characters) and is created on first use. Bodies are limited to 8 MB.
      </p>
      <Code title="Response · 201 Created" copy={false}>{`{ "project": "shop", "scanIds": [41, 42] }`}</Code>
      <p>
        One scan is stored per page in the report. Errors: <C>401</C> without a valid key, <C>400</C> for a missing
        project, invalid JSON, a report that isn&apos;t from Astrolabe or has no pages, or a newer schema than the server
        understands.
      </p>

      <H3 id="api-projects">GET /api/projects</H3>
      <Code title="Response" copy={false}>{`
[
  { "name": "shop", "scans": 128, "lastScore": 96.4, "lastScanAt": "2026-10-24T09:12:03Z" }
]
`}</Code>

      <H3 id="api-scans">GET /api/projects/NAME/scans?limit=50</H3>
      <p>
        The project&apos;s scans, newest first. <C>limit</C> defaults to 50 and is capped at 500. Encode a slash in the
        project name as <C>%2F</C> (for example <C>owner%2Frepo</C>).
      </p>
      <Code title="Response" copy={false}>{`
[
  {
    "id": 42, "url": "https://example.com/checkout", "title": "Checkout",
    "score": 96.4, "checked": 412, "matched": 397, "nearMisses": 9, "offSystem": 6,
    "gitSha": "ae398b34c036", "gitRef": "main", "createdAt": "2026-10-24T09:12:03Z"
  }
]
`}</Code>

      <H3 id="api-scan">GET /api/scans/ID</H3>
      <p>
        The full stored report for one scan, exactly as uploaded. <C>404</C> if it doesn&apos;t exist.
      </p>

      <H3 id="api-health">GET /healthz</H3>
      <p>
        Returns <C>{'{"status":"ok"}'}</C>. Use it for your host&apos;s health check.
      </p>

      <H2 id="schema">Database tables</H2>
      <Table
        columns={["Table", "Columns"]}
        rows={[
          [<C>projects</C>, <>
            <C>id</C>, <C>name</C> (unique), <C>created_at</C>
          </>],
          [<C>scans</C>, <>
            <C>id</C>, <C>project_id</C>, <C>url</C>, <C>title</C>, <C>score</C>, <C>checked</C>, <C>matched</C>,{" "}
            <C>git_sha</C>, <C>git_ref</C>, <C>tool_version</C>, <C>report</C> (the full JSON), <C>created_at</C>
          </>],
          [<C>findings</C>, <>
            <C>id</C>, <C>scan_id</C>, <C>category</C>, <C>value</C>, <C>severity</C>, <C>occurrences</C>,{" "}
            <C>nearest_token</C>, <C>nearest_value</C>, <C>distance</C>
          </>],
        ]}
      />
      <p>
        Deleting a project deletes its scans and their findings. Query the tables directly for anything the API
        doesn&apos;t offer, such as the most common off-token values across all scans.
      </p>

      <H2 id="deploy">Deploying</H2>
      <p>
        The server is one static binary that reads its settings from the environment, so it runs on any host that can
        run a Linux program and give it a port: a small VM, a container platform, or a free tier that runs Go
        services. Set <C>DATABASE_URL</C> and <C>ASTROLABE_API_KEY</C> as secrets, point the health check at{" "}
        <C>/healthz</C>, and use HTTPS so the API key isn&apos;t sent in clear text.
      </p>
      <Note kind="warn" title="Always set an API key on a public server">
        <p>
          Without <C>ASTROLABE_API_KEY</C>, anyone who finds the URL can upload scans. Reads are public either way, so
          don&apos;t upload reports from private pages to a server others can reach.
        </p>
      </Note>
    </>
  );
}
