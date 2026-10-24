import { C, Code, DocHeader, H2, H3, Note, Table, Toc } from "../../../components/docs/Doc";
import { ASSETS, CHECKSUMS_URL, TAG, VERSION, downloadUrl } from "../../../lib/docs";

export const metadata = { title: "Installation" };

export default function Install() {
  const linuxAmd = downloadUrl(`astrolabe_${VERSION}_linux_amd64.tar.gz`);
  const macArm = downloadUrl(`astrolabe_${VERSION}_darwin_arm64.tar.gz`);
  const winAmd = downloadUrl(`astrolabe_${VERSION}_windows_amd64.zip`);
  return (
    <>
      <DocHeader eyebrow="Getting started" title="Installation">
        Astrolabe is a single binary with no runtime to install. Download it for your platform, or build it with Go.
        It uses a Chromium-based browser you already have.
      </DocHeader>

      <Toc
        items={[
          ["requirements", "Requirements"],
          ["download", "Download a binary"],
          ["macos", "Install on macOS"],
          ["linux", "Install on Linux"],
          ["windows", "Install on Windows"],
          ["verify", "Verify the download"],
          ["go", "Build with Go"],
          ["check", "Check the installation"],
          ["update", "Update or uninstall"],
        ]}
      />

      <H2 id="requirements">Requirements</H2>
      <p>
        Astrolabe needs one Chromium-based browser on the machine: <strong>Chrome</strong>, <strong>Edge</strong>,{" "}
        <strong>Chromium</strong> or <strong>Brave</strong>. It doesn&apos;t download a browser of its own. Edge ships with
        Windows, and Chrome is preinstalled on GitHub&apos;s Ubuntu runners.
      </p>
      <p>It looks for a browser in this order and uses the first one it finds:</p>
      <Table
        columns={["System", "Where it looks"]}
        rows={[
          ["Windows", <>
            Chrome, Edge, Chromium, then Brave under <C>Program Files</C>, <C>Program Files (x86)</C> and{" "}
            <C>%LocalAppData%</C>; then <C>chrome</C>, <C>msedge</C>, <C>chromium</C> or <C>brave</C> on your{" "}
            <C>PATH</C>
          </>],
          ["macOS", <>
            Google Chrome, Chromium, Microsoft Edge, then Brave Browser in <C>/Applications</C>; then{" "}
            <C>google-chrome</C> or <C>chromium</C> on your <C>PATH</C>
          </>],
          ["Linux", <>
            A Playwright Chromium if one is cached; then <C>google-chrome</C>, <C>google-chrome-stable</C>,{" "}
            <C>chromium</C>, <C>chromium-browser</C>, <C>chrome</C>, <C>microsoft-edge</C> or <C>brave-browser</C> on
            your <C>PATH</C>
          </>],
        ]}
      />
      <p>
        To use a specific browser, pass <C>--chrome /path/to/browser</C> or set the <C>ASTROLABE_CHROME</C> environment
        variable. On Linux, Astrolabe adds Chrome&apos;s <C>--no-sandbox</C> flag automatically when it runs as root or
        when the <C>CI</C> variable is set, which is what containers and CI runners need.
      </p>

      <H2 id="download">Download a binary</H2>
      <p>
        The current release is <strong>{TAG}</strong>. Each download is an archive containing the <C>astrolabe</C>{" "}
        binary, the README and the license.
      </p>
      <div className="doc-downloads">
        {ASSETS.map((a) => (
          <a key={a.file} className="doc-download" href={a.url}>
            <span>
              <b>{a.os}</b>
              <small>{a.arch}</small>
            </span>
            <small translate="no">{a.file.endsWith(".zip") ? ".zip" : ".tar.gz"}</small>
          </a>
        ))}
      </div>
      <p>
        Every release also has a <a href={CHECKSUMS_URL}>checksums.txt</a> with the SHA-256 of each archive. See{" "}
        <a href="#verify">Verify the download</a>.
      </p>

      <H2 id="macos">Install on macOS</H2>
      <p>Download and unpack the archive, then move the binary somewhere on your <C>PATH</C>:</p>
      <Code title="Terminal (Apple silicon)">{`
curl -LO ${macArm}
tar -xzf astrolabe_${VERSION}_darwin_arm64.tar.gz astrolabe
sudo mv astrolabe /usr/local/bin/
astrolabe version
`}</Code>
      <p>
        On an Intel Mac, use the <C>darwin_amd64</C> archive instead.
      </p>
      <Note kind="warn" title="“astrolabe can’t be opened because Apple cannot check it”">
        <p>
          The binary isn&apos;t notarized by Apple. If you downloaded the archive with a browser, macOS marks it as
          quarantined. Remove the mark once:
        </p>
        <Code title="Terminal">{`xattr -d com.apple.quarantine /usr/local/bin/astrolabe`}</Code>
        <p>Downloads made with <C>curl</C>, as above, aren&apos;t quarantined.</p>
      </Note>

      <H2 id="linux">Install on Linux</H2>
      <Code title="Terminal (x86-64)">{`
curl -L ${linuxAmd} | tar -xz astrolabe
sudo mv astrolabe /usr/local/bin/
astrolabe version
`}</Code>
      <p>
        On ARM64 machines (for example a Raspberry Pi 4 or an AWS Graviton server), use the <C>linux_arm64</C>{" "}
        archive. If you don&apos;t have a browser yet, install one from your distribution, for example{" "}
        <C>sudo apt install chromium</C> on Debian or <C>sudo apt install chromium-browser</C> on older Ubuntu.
      </p>

      <H2 id="windows">Install on Windows</H2>
      <p>In PowerShell:</p>
      <Code title="PowerShell (x86-64)">{`
Invoke-WebRequest ${winAmd} -OutFile astrolabe.zip
Expand-Archive astrolabe.zip -DestinationPath "$env:LOCALAPPDATA\\Programs\\astrolabe"
$env:Path += ";$env:LOCALAPPDATA\\Programs\\astrolabe"
astrolabe version
`}</Code>
      <p>
        The last-but-one line only adds the folder to the current window&apos;s <C>PATH</C>. To keep it, add{" "}
        <C>%LOCALAPPDATA%\Programs\astrolabe</C> under <em>Settings → System → About → Advanced system settings →
        Environment Variables</em>, or run:
      </p>
      <Code title="PowerShell">{`
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:LOCALAPPDATA\\Programs\\astrolabe", "User")
`}</Code>
      <p>
        Windows SmartScreen may warn the first time you run an unsigned binary. Choose <em>More info → Run anyway</em>{" "}
        if you trust the download (see <a href="#verify">Verify the download</a>). Astrolabe finds Edge automatically,
        so there&apos;s nothing else to install.
      </p>

      <H2 id="verify">Verify the download</H2>
      <p>
        Compare the archive&apos;s SHA-256 with the matching line in <a href={CHECKSUMS_URL}>checksums.txt</a>:
      </p>
      <Code title="macOS">{`shasum -a 256 astrolabe_${VERSION}_darwin_arm64.tar.gz`}</Code>
      <Code title="Linux">{`
curl -LO ${CHECKSUMS_URL}
sha256sum --ignore-missing -c checksums.txt
`}</Code>
      <Code title="PowerShell">{`(Get-FileHash astrolabe.zip -Algorithm SHA256).Hash.ToLower()`}</Code>
      <p>The printed hash must equal the one listed for that file name.</p>

      <H2 id="go">Build with Go</H2>
      <p>
        With Go 1.24 or newer, you can build and install the latest version in one step:
      </p>
      <Code title="Terminal">{`go install github.com/adeyanjufuhad/astrolabe/cmd/astrolabe@latest`}</Code>
      <p>
        Replace <C>@latest</C> with <C>@{TAG}</C> to pin a version. Go puts the binary in <C>$(go env GOPATH)/bin</C>{" "}
        (usually <C>~/go/bin</C>, or <C>%USERPROFILE%\go\bin</C> on Windows); make sure that folder is on your{" "}
        <C>PATH</C>. Astrolabe has a single dependency, a Postgres driver used only by the optional history server, so
        the build downloads very little.
      </p>

      <H2 id="check">Check the installation</H2>
      <Code title="Terminal">{`astrolabe version`}</Code>
      <p>
        This prints <C>astrolabe {TAG}</C>. Builds made with <C>go install</C> print their module version, and local
        development builds print <C>dev</C>. If the command isn&apos;t found, the binary&apos;s folder isn&apos;t on
        your <C>PATH</C>.
      </p>
      <H3 id="first-scan">Your first scan</H3>
      <p>
        Continue with the <a href="/docs/quick-start">Quick start</a> to write a token file and scan a page.
      </p>

      <H2 id="update">Update or uninstall</H2>
      <p>
        To update, download the new archive and replace the binary, or rerun <C>go install …@latest</C>. Astrolabe keeps
        no settings, caches or background services: the browser profile it uses during a scan lives in a temporary
        folder that&apos;s deleted afterwards. To uninstall, delete the <C>astrolabe</C> binary.
      </p>
    </>
  );
}
