import { C, Code, DocHeader, H2, H3, Toc } from "../../../components/docs/Doc";

export const metadata = { title: "Troubleshooting and FAQ" };

export default function Troubleshooting() {
  return (
    <>
      <DocHeader eyebrow="More" title="Troubleshooting and FAQ">
        Fixes for the problems people run into most, and answers to common questions.
      </DocHeader>

      <Toc
        items={[
          ["no-browser", "“no Chrome, Chromium, Edge or Brave found”"],
          ["no-tokens", "“no token file found”"],
          ["timeouts", "Pages time out or look empty"],
          ["too-many", "Too many findings"],
          ["wrong-category", "A token is in the wrong category"],
          ["auth", "Pages behind a login"],
          ["noise", "Third-party widgets and banners"],
          ["mobile", "Mobile layouts and themes"],
          ["faq", "Frequently asked questions"],
        ]}
      />

      <H2 id="no-browser">“no Chrome, Chromium, Edge or Brave found”</H2>
      <p>Astrolabe couldn&apos;t find a browser in the usual places (listed on <a href="/docs/install#requirements">Installation</a>).</p>
      <ul className="doc-list">
        <li>Install one: Edge comes with Windows; on Linux, install Chromium from your package manager.</li>
        <li>
          Or point at it directly:
          <Code title="Terminal">{`astrolabe check localhost:3000 --chrome "/opt/google/chrome/chrome"`}</Code>
          or set <C>ASTROLABE_CHROME</C> once in your shell profile.
        </li>
        <li>
          In a Linux container running as root, Chrome needs <C>--no-sandbox</C>; Astrolabe adds it automatically when
          it runs as root or <C>CI</C> is set.
        </li>
      </ul>

      <H2 id="no-tokens">“no token file found”</H2>
      <p>
        Without <C>--tokens</C>, Astrolabe looks for <C>tokens.json</C>, <C>design-tokens.json</C>,{" "}
        <C>tokens/tokens.json</C> and <C>.astrolabe/tokens.json</C> in the folder you run it from. Pass the path
        explicitly, or run it from your project root. &quot;no tokens found&quot; instead means the file loaded but
        contained nothing Astrolabe could use; check it with <C>astrolabe tokens</C>.
      </p>

      <H2 id="timeouts">Pages time out or look empty</H2>
      <ul className="doc-list">
        <li>
          <strong>Client-rendered apps</strong> may still be fetching data when the scan starts. Raise <C>--wait</C>,
          for example <C>--wait 2s</C>. A very low element count in the HTML report is the telltale sign.
        </li>
        <li>
          <strong>Slow pages</strong>: raise <C>--timeout</C> (default 60 seconds per page).
        </li>
        <li>
          <strong>A dev server that isn&apos;t up yet</strong> in CI: wait for it before scanning, for example{" "}
          <C>for i in $(seq 1 60); do curl -sf http://localhost:3000 &gt; /dev/null &amp;&amp; break; sleep 1; done</C>.
        </li>
        <li>
          <strong>Animations</strong>: elements that are fading in (<C>opacity: 0</C>) at scan time are skipped. A longer{" "}
          <C>--wait</C> lets them finish.
        </li>
      </ul>

      <H2 id="too-many">Too many findings</H2>
      <ul className="doc-list">
        <li>
          On a pull request, compare with your main branch so only new drift is reported (see{" "}
          <a href="/docs/pull-requests">Pull requests and baselines</a>).
        </li>
        <li>
          Adopt one category at a time: a token file with only colors produces a color-only audit.
        </li>
        <li>
          If many values are a hair off because of rounding (for example <C>12.5px</C> from <C>0.78rem</C>), raise{" "}
          <C>--px-tolerance</C>. For nearly identical colors, <C>--color-tolerance 1</C>.
        </li>
        <li>
          Fix near-misses first: they&apos;re typically typos with an obvious replacement.
        </li>
      </ul>

      <H2 id="wrong-category">A token is in the wrong category</H2>
      <p>
        Run <C>astrolabe tokens</C> to see where each token landed. Untyped tokens are classified from their path
        (<a href="/docs/tokens#categories">rules</a>), so a spacing token under <C>layout.text-gap</C> could be read as a
        font size because of <C>text</C>. Give it an explicit type (<C>&quot;$type&quot;: &quot;spacing&quot;</C>) to
        settle it.
      </p>

      <H2 id="auth">Pages behind a login</H2>
      <p>
        Astrolabe opens each page fresh, with no cookies or saved sessions, and doesn&apos;t fill in login forms. Scan
        pages that are reachable without signing in: your local dev server, a preview deployment without protection, or
        a staging build with auth turned off. Local HTML files and storybook-style static builds work well too.
      </p>

      <H2 id="noise">Third-party widgets and banners</H2>
      <p>
        Chat launchers, cookie banners, ads and embedded maps bring their own styles. Skip them with{" "}
        <C>--ignore</C>, which excludes each matching element and everything inside it:
      </p>
      <Code title="Terminal">{`astrolabe check localhost:3000 --ignore "#cookie-banner,.intercom-launcher,iframe,[data-third-party]"`}</Code>
      <p>Content inside iframes isn&apos;t audited in any case; only the iframe element itself is.</p>

      <H2 id="mobile">Mobile layouts and themes</H2>
      <p>
        Each run uses one viewport. Run again with <C>--viewport 390x844</C> to audit the mobile layout. For dark mode
        or other themes, scan the themed version of the page with that theme&apos;s token file; values only match tokens
        in the file you pass.
      </p>

      <H2 id="faq">Frequently asked questions</H2>
      <H3 id="faq-data">Does Astrolabe send my pages or code anywhere?</H3>
      <p>
        No. Everything runs on your machine or CI runner. The only network requests are the ones your pages make
        themselves, plus an upload to a <a href="/docs/history-server">history server</a> if, and only if, you pass{" "}
        <C>--upload</C>. There&apos;s no telemetry.
      </p>
      <H3 id="faq-ai">Does it use AI?</H3>
      <p>No. Matching is deterministic: the same page and tokens always give the same result.</p>
      <H3 id="faq-fix">Can it fix the code for me?</H3>
      <p>
        Not yet. It names the nearest token for every finding, which is usually all you need for a near-miss. It
        doesn&apos;t yet know which file and line set a value.
      </p>
      <H3 id="faq-screenshot">How is this different from visual regression testing?</H3>
      <p>
        Screenshot tools compare a page with an earlier image of itself, so they catch changes but not drift that was
        there from the start, and every intended change needs a new approved image. Astrolabe compares the page with your
        design tokens, so it catches off-system values immediately and doesn&apos;t need approving when the design
        legitimately changes. The two work well together.
      </p>
      <H3 id="faq-frameworks">Does it work with React, Vue, Tailwind, CSS-in-JS…?</H3>
      <p>
        Yes. It reads what the browser computes, so it doesn&apos;t matter how the styles were written: plain CSS, Sass,
        Tailwind, CSS modules, styled-components or inline styles.
      </p>
      <H3 id="faq-rem">Why is my 0.75rem token shown as 12px?</H3>
      <p>
        Browsers compute lengths in pixels, so tokens are converted to pixels too, assuming a 16px root font size. If
        your site changes the root size, write the tokens in pixels.
      </p>
      <H3 id="faq-exact">Why do colors need to match exactly?</H3>
      <p>
        Because a token is a promise of an exact value. That&apos;s also why near-misses exist: <C>#3b82f7</C> is
        reported, but flagged as almost certainly a typo for <C>#3b82f6</C>. Use <C>--color-tolerance</C> if you&apos;d
        rather accept tiny differences.
      </p>
      <H3 id="faq-cost">What does it cost?</H3>
      <p>
        Nothing. Astrolabe is open source under the <a href="/docs/license">MIT license</a>, and it needs no account,
        service or API key.
      </p>
    </>
  );
}
