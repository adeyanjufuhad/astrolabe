import Clouds from "../components/Clouds";
import CopyButton from "../components/CopyButton";
import Counter from "../components/Counter";
import Dial from "../components/Dial";
import Hero from "../components/Hero";
import MotionToggle from "../components/MotionToggle";
import MagicGrid from "../components/MagicGrid";
import Nav from "../components/Nav";
import PauseOffscreen from "../components/PauseOffscreen";
import RadarBackdrop from "../components/RadarBackdrop";
import Reveal from "../components/Reveal";
import Ring from "../components/Ring";
import ScanDemo from "../components/ScanDemo";
import ScrollWords from "../components/ScrollWords";
import Terminal from "../components/Terminal";
import TryIt from "../components/TryIt";
import { Arrow, Icon, Logo } from "../components/Icons";

const REPO = "https://github.com/adeyanjufuhad/astrolabe";
const INSTALL = "go install github.com/adeyanjufuhad/astrolabe/cmd/astrolabe@latest";
const CHECK = "astrolabe check localhost:3000 --tokens tokens.json --html report.html";

const MARQUEE = [
  ["W3C Design Tokens", <path key="p" d="M4 7h16M4 12h10M4 17h13" />],
  ["Tokens Studio", <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 12h6" /></>],
  ["Style Dictionary", <path key="p" d="M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5" />],
  ["Tailwind v4 · oklch", <path key="p" d="M4 10c2-4 5-4 8 0s6 4 8 0M4 16c2-4 5-4 8 0s6 4 8 0" />],
  ["Chrome", <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>],
  ["Edge", <path key="p" d="M20 13a8 8 0 1 1-3-7.5M20 13c0 3-3 4-6 4s-5-2-5-4 2-4 6-4" />],
  ["Brave", <path key="p" d="M12 3 5 6l1 9 6 6 6-6 1-9-7-3Z" />],
  ["GitHub Actions", <><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="9" r="2.5" /><path d="M6 8.5v7M18 11.5c0 4-6 3-10 5" /></>],
  ["Postgres · Neon", <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3" /></>],
];

const YAML = `<span class="kk">on</span>: pull_request
<span class="kk">permissions</span>: { <span class="kk">contents</span>: read, <span class="kk">pull-requests</span>: write }
<span class="kk">jobs</span>:
  <span class="kk">astrolabe</span>:
    <span class="kk">runs-on</span>: ubuntu-latest
    <span class="kk">steps</span>:
      - <span class="kk">uses</span>: actions/checkout@v7
      <span class="c"># …start your app or wait for a preview deploy…</span>
      - <span class="kk">uses</span>: <span class="s">adeyanjufuhad/astrolabe@v0.1.1</span>
        <span class="kk">with</span>:
          <span class="kk">urls</span>: http://localhost:3000
          <span class="kk">tokens</span>: tokens.json
          <span class="kk">fail-under</span>: 90`;

function MarqueeItems({ dup }) {
  return MARQUEE.map(([label, icon]) => (
    <span key={label} className={dup ? "marquee-item dup" : "marquee-item"} aria-hidden={dup || undefined}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {icon}
      </svg>
      {label}
    </span>
  ));
}

const Edge = () => <span className="mb-edge" aria-hidden="true" />;

function Head({ eyebrow, children, sub, style, split = false }) {
  if (split)
    return (
      <Reveal className="section-head split" style={style}>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{children}</h2>
        </div>
        {sub && <p>{sub}</p>}
      </Reveal>
    );
  return (
    <Reveal className="section-head" style={style}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{children}</h2>
      {sub && <p>{sub}</p>}
    </Reveal>
  );
}

function CmdCard({ n, title, note, children }) {
  return (
    <Reveal className="cmd-card">
      <div className="top">
        <span className="n">{n}</span>
        <h3>{title}</h3>
      </div>
      <p>{note}</p>
      {children}
    </Reveal>
  );
}

export default function Page() {
  return (
    <>
      <PauseOffscreen />
      <Nav />
      <MotionToggle />
      <main id="top">
        <Hero />

        <div className="marquee-label">
          <span className="eyebrow">Reads your tokens, runs on your browser</span>
        </div>
        <div className="marquee" data-pause aria-label="Supported formats and browsers">
          <div className="marquee-track">
            <MarqueeItems />
            <MarqueeItems dup />
          </div>
        </div>

        {/* ======================= PROBLEM ======================= */}
        <section className="section" id="why">
          <div className="container">
            <Reveal className="section-head">
              <span className="eyebrow">The problem</span>
              <ScrollWords
                parts={[
                  "Design tokens are a promise. Shipped CSS",
                  <span className="chip-inline blue demo" aria-hidden="true">
                    <i style={{ backgroundColor: "#3b82f6" }} />
                    <i style={{ backgroundColor: "#3b82f7" }} />
                  </span>,
                  "breaks it",
                  { soft: "quietly, one" },
                  <span className="chip-inline lime" aria-hidden="true">
                    <Logo size={18} />
                  </span>,
                  { soft: "value at a time." },
                ]}
              />
            </Reveal>

            <MagicGrid className="bento">
              <Reveal as="article" className="b-card b-sky mb">
                <div className="cloudbg" aria-hidden="true">
                  <div className="strip">
                    <img src="/assets/clouds-mid.webp" width="2400" height="520" alt="" loading="lazy" />
                    <img src="/assets/clouds-mid.webp" width="2400" height="520" alt="" loading="lazy" />
                  </div>
                </div>
                <div className="top">
                  <Logo size={32} />
                  <span className="icon-sq" aria-hidden="true">
                    <Icon name="search" />
                  </span>
                </div>
                <div className="pair demo" aria-hidden="true">
                  <span className="dot" style={{ backgroundColor: "#3b82f6" }} />
                  <span className="dot" style={{ backgroundColor: "#3b82f7" }} />
                </div>
                <div className="over">
                  <span className="k">brand blue vs. what shipped</span>
                  <div className="big-num">
                    ΔE <Counter value={0.1} decimals={1} intro />
                  </div>
                  <p>
                    <span className="mono">#3b82f6</span> vs <span className="mono">#3b82f7</span>. Invisible in review. Flagged in CI.
                  </p>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="b-card b-mist mb">
                <span className="k">screenshot baselines needed</span>
                <div className="big-num">
                  <Counter value={0} intro />
                </div>
                <p>
                  Visual diffs only tell you something changed since yesterday. Astrolabe checks against your token file, so it
                  catches drift on day one.
                </p>
                <div className="tokens-row demo" aria-hidden="true">
                  {["#3b82f6", "#2563eb", "#111827", "#6b7280", "#e5e7eb", "#16a34a"].map((c) => (
                    <i key={c} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="vs" style={{ marginTop: 24 }}>
                  <div>
                    <span className="q">Visual diff asks</span>
                    <span>“Did it change?”</span>
                  </div>
                  <div>
                    <span className="q">Astrolabe asks</span>
                    <span>“Is it on-system?”</span>
                  </div>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="b-card b-lime mb">
                <span className="k" style={{ color: "var(--ink-2)" }}>
                  audited on every element
                </span>
                <div className="big-num">
                  <Counter value={6} intro /> properties
                </div>
                <p>Color, spacing, radius, font size, font family and font weight, read from the styles that actually render.</p>
                <Edge />
              </Reveal>

              <Reveal as="article" className="b-card b-ink mb">
                <div>
                  <span className="k">dependencies</span>
                  <p style={{ marginTop: 8 }}>A single Go binary that drives the Chrome or Edge you already have.</p>
                </div>
                <div className="big-num">
                  <Counter value={1} intro />
                </div>
                <Edge />
              </Reveal>
            </MagicGrid>
          </div>
        </section>

        {/* ======================= HOW IT WORKS ======================= */}
        <section className="section how" id="how" data-pause>
          <RadarBackdrop />
          <div className="container">
            <Head
              eyebrow="How it works"
              split
              sub="Astrolabe drives the browser you already have, so it checks exactly what your users see: the computed styles, not the source."
            >
              Real browser. Real styles. <span className="h-soft">Every value checked.</span>
            </Head>
            <div className="how-grid">
              <ScanDemo />
            </div>
          </div>
        </section>

        {/* ======================= TRY IT ======================= */}
        <section className="section" id="try">
          <div className="container">
            <Head eyebrow="Try it" split sub="The same matching rules as the CLI, running in your browser against the demo token set.">
              Pick any value. <span className="h-soft">See what Astrolabe would say.</span>
            </Head>
            <TryIt />
          </div>
        </section>

        {/* ======================= FEATURES ======================= */}
        <section className="section" id="features" style={{ paddingTop: 0 }}>
          <div className="container">
            <Head
              eyebrow="Features"
              split
              sub="One binary, four outputs: terminal, JSON, Markdown for pull requests and a self-contained HTML report."
            >
              From your terminal <span className="h-soft">to every pull request</span>
            </Head>

            <MagicGrid className="features">
              <Reveal as="article" className="f-card f-pr span-2 mb">
                <span className="ico">
                  <Icon name="branch" />
                </span>
                <h3>A comment on every pull request</h3>
                <p>The GitHub Action posts one summary and updates it on every push. The full HTML report is uploaded as a build artifact.</p>
                <div className="gh">
                  <div className="gh-head">
                    <span className="av">
                      <Logo />
                    </span>
                    <b>github-actions</b> commented
                  </div>
                  <div className="gh-body">
                    <h4>🔭 Astrolabe · fidelity 94%</h4>
                    <p>
                      189 of 201 style values use a design token · <b>7 off-token values</b>
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th />
                          <th>Value</th>
                          <th>Used</th>
                          <th>Nearest token</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>🟡 color</td>
                          <td>
                            <code>#3b82f7</code> background-color
                          </td>
                          <td>×1</td>
                          <td>
                            <code>color.blue.500</code> (#3b82f6)
                          </td>
                        </tr>
                        <tr>
                          <td>🟡 spacing</td>
                          <td>
                            <code>13px</code> padding
                          </td>
                          <td>×1</td>
                          <td>
                            <code>space.3</code> (12px)
                          </td>
                        </tr>
                        <tr>
                          <td>🔴 font-family</td>
                          <td>
                            <code>arial</code> font-family
                          </td>
                          <td>×1</td>
                          <td>
                            <code>font.family.sans</code> (inter)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="f-card mb">
                <span className="ico">
                  <Icon name="pair" />
                </span>
                <h3>Near-miss vs off-system</h3>
                <p>A near-miss is almost a token, probably a typo. Off-system means no close token: a one-off, or a gap in your system.</p>
                <div className="chips">
                  <span className="tag near">#3b82f7</span>
                  <span className="tag near">13px</span>
                  <span className="tag off">#ea580c</span>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="f-card f-ink mb">
                <span className="ico">
                  <Icon name="tokens" />
                </span>
                <h3>Your token format</h3>
                <p>
                  Aliases like <code style={{ backgroundColor: "var(--ink-2)" }}>{"{color.blue.500}"}</code> resolve. Hex, rgb, hsl, oklch
                  and oklab all parse.
                </p>
                <div className="chips">
                  <span>DTCG</span>
                  <span>Tokens Studio</span>
                  <span>Style Dictionary</span>
                  <span>plain JSON</span>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="f-card mb">
                <span className="ico">
                  <Icon name="file" />
                </span>
                <h3>Self-contained HTML report</h3>
                <p>One file with a score, category breakdown and every finding. Attach it, archive it, share it.</p>
                <div className="report-mini">
                  <Ring value={94} />
                  <a className="link" href="/demo-report.html">
                    Open the demo <Arrow size={12} />
                  </a>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="f-card f-lime mb">
                <span className="ico">
                  <Icon name="check" />
                </span>
                <h3>A gate for CI</h3>
                <p>
                  Fail the build below a fidelity threshold with <code style={{ backgroundColor: "var(--glass)" }}>--fail-under 95</code>.
                </p>
                <div className="codes">
                  <div>
                    <b>0</b>OK
                  </div>
                  <div>
                    <b>1</b>below threshold
                  </div>
                  <div>
                    <b>2</b>error
                  </div>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="f-card mb">
                <span className="ico">
                  <Icon name="db" />
                </span>
                <h3>History, if you want it</h3>
                <p>An optional server stores every scan in Postgres so you can track fidelity over time. Neon&apos;s free tier is plenty.</p>
                <div className="chips">
                  <span>POST /api/scans</span>
                  <span>GET /api/projects</span>
                </div>
                <Edge />
              </Reveal>

              <Reveal as="article" className="f-card mb">
                <span className="ico">
                  <Icon name="phone" />
                </span>
                <h3>Scoped to what matters</h3>
                <p>
                  Skip areas with <code>--ignore .ads</code>, and audit mobile with <code>--viewport 390x844</code>.
                </p>
                <Edge />
              </Reveal>
            </MagicGrid>
          </div>
        </section>

        {/* ======================= GET STARTED ======================= */}
        <section className="section" id="start" style={{ paddingTop: 0 }}>
          <div className="container">
            <Head eyebrow="Get started" split sub="Install it, point it at a page, then let the Action guard every pull request.">
              Three minutes <span className="h-soft">to your first score</span>
            </Head>

            <div className="start">
              <div className="start-steps">
                <CmdCard
                  n="1"
                  title="Install"
                  note={
                    <>
                      Grab a{" "}
                      <a href={`${REPO}/releases/latest`} style={{ textDecoration: "underline" }}>
                        prebuilt binary
                      </a>{" "}
                      for Linux, macOS or Windows, or build it with Go 1.24 or newer.
                    </>
                  }
                >
                  <div className="cmd">
                    <code>
                      <span className="p">$</span> {INSTALL}
                    </code>
                    <CopyButton text={INSTALL} />
                  </div>
                </CmdCard>
                <CmdCard n="2" title="Check a page" note="A URL, your dev server or a local HTML file. Uses the Chrome or Edge already on your machine.">
                  <div className="cmd">
                    <code>
                      <span className="p">$</span> {CHECK}
                    </code>
                    <CopyButton text={CHECK} />
                  </div>
                </CmdCard>
                <CmdCard n="3" title="Guard every pull request" note="Add the Action. It comments the score and fails below your threshold.">
                  {/* Static, trusted snippet with syntax-highlight spans. */}
                  <pre className="yaml" translate="no" dangerouslySetInnerHTML={{ __html: YAML }} />
                </CmdCard>
              </div>
              <Terminal />
            </div>

            <Reveal className="section-head" style={{ marginTop: 96 }}>
              <span className="eyebrow">On the roadmap</span>
              <div className="roadmap">
                <span>Opt-in AI fix suggestions, bring your own key</span>
                <span>Figma token import</span>
                <span>Hosted history dashboard</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ======================= FINAL CTA ======================= */}
        <section className="final" data-pause>
          <Clouds layer="mid" lazy />
          <Clouds layer="near" lazy />
          <Reveal>
            <Dial />
          </Reveal>
          <Reveal as="h2">
            Hold your UI to its tokens. <span className="soft">Every pixel, every pull request.</span>
          </Reveal>
          <div className="hero-cta">
            <a className="btn btn-glass" href={`${REPO}#readme`}>
              Read the docs
            </a>
            <a className="btn btn-lime" href={REPO}>
              Star on GitHub{" "}
              <span className="arrow">
                <Arrow />
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div className="container foot">
          <a className="brand" href="#top" translate="no">
            <Logo />
            Astrolabe
          </a>
          <nav aria-label="Footer">
            <a href={REPO}>GitHub</a>
            <a href={`${REPO}#readme`}>Docs</a>
            <a href={`${REPO}/blob/main/action.yml`}>Action</a>
            <a href={`${REPO}/blob/main/LICENSE`}>MIT License</a>
          </nav>
          <small>
            v0.1.0 · Interactions adapted from{" "}
            <a href="https://reactbits.dev" style={{ textDecoration: "underline" }}>
              React Bits
            </a>
          </small>
        </div>
      </footer>
    </>
  );
}
