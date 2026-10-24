import { C, Code, DocHeader, H2, H3, Note, Table, Toc } from "../../../components/docs/Doc";

export const metadata = { title: "How matching works" };

export default function Matching() {
  return (
    <>
      <DocHeader eyebrow="Using Astrolabe" title="How matching works">
        Exactly what Astrolabe reads from a page, which values it skips, how each value is compared with your tokens,
        and how findings and the fidelity score are put together.
      </DocHeader>

      <Toc
        items={[
          ["elements", "Which elements are audited"],
          ["properties", "Which properties are read"],
          ["skipped", "Values that are skipped"],
          ["colors", "Colors"],
          ["lengths", "Spacing, radius and font size"],
          ["typography", "Font family and weight"],
          ["findings", "Findings and grouping"],
          ["score", "The fidelity score"],
          ["selectors", "Selectors in reports"],
        ]}
      />

      <H2 id="elements">Which elements are audited</H2>
      <p>
        After the page loads, Astrolabe waits for web fonts (<C>document.fonts.ready</C>) and for the extra time set by{" "}
        <C>--wait</C> (default 500ms), then walks every element inside <C>&lt;body&gt;</C>. An element is skipped when:
      </p>
      <ul className="doc-list">
        <li>
          it&apos;s a <C>script</C>, <C>style</C>, <C>noscript</C>, <C>template</C>, <C>meta</C>, <C>link</C>,{" "}
          <C>br</C>, <C>head</C> or <C>title</C> element;
        </li>
        <li>it sits inside an SVG (the SVG element itself is still audited);</li>
        <li>
          it has no size at all, or its computed style is <C>display: none</C>, <C>visibility: hidden</C> or{" "}
          <C>opacity: 0</C>;
        </li>
        <li>
          it matches, or sits inside, a selector passed to <C>--ignore</C>.
        </li>
      </ul>
      <p>
        Elements below the fold are included; the page isn&apos;t scrolled. At most <C>--max-elements</C> elements
        (default 5000) are audited per page; the rest are counted but not checked.
      </p>

      <H2 id="properties">Which properties are read</H2>
      <Table
        columns={["Category", "Computed properties", "Notes"]}
        rows={[
          ["Color", <>
            <C>background-color</C>, <C>border-*-color</C>, <C>color</C>
          </>, <>
            A border color only counts when that border is drawn (width above 0, style not <C>none</C> or{" "}
            <C>hidden</C>). Text <C>color</C> only on elements with their own text.
          </>],
          ["Spacing", <>
            <C>padding-*</C>, <C>margin-*</C>, <C>row-gap</C>, <C>column-gap</C>
          </>, "Gaps only on flex and grid containers."],
          ["Radius", <C>border-*-radius</C>, "Each corner separately; elliptical radii use their first value."],
          ["Font size", <C>font-size</C>, "Only on elements with their own text."],
          ["Font family", <C>font-family</C>, "Only on elements with their own text."],
          ["Font weight", <C>font-weight</C>, "Only on elements with their own text."],
        ]}
      />
      <p>
        &quot;Own text&quot; means the element directly contains non-empty text, not just through a child. That way a
        wrapper <C>div</C> isn&apos;t blamed for the font of the paragraph inside it.
      </p>

      <H2 id="skipped">Values that are skipped</H2>
      <ul className="doc-list">
        <li>Fully transparent colors.</li>
        <li>
          Zero spacing and zero radii, plus <C>auto</C> and <C>normal</C>.
        </li>
        <li>
          <C>margin: auto</C>. Browsers report centering margins as pixel values, so Astrolabe reads the authored keyword
          through <C>computedStyleMap()</C> and skips it.
        </li>
        <li>Categories your token file doesn&apos;t define (see <a href="/docs/tokens#opt-in">Design tokens</a>).</li>
        <li>
          Radii of 500px or more (&quot;pill&quot; shapes) when your file has no radius token of at least 500px.
        </li>
      </ul>

      <H2 id="colors">Colors</H2>
      <p>Each color is parsed and normalized to 8-bit sRGB with alpha, then:</p>
      <ol className="doc-list">
        <li>
          <strong>Match:</strong> identical to a token at 8 bits per channel, alpha included.
        </li>
        <li>
          <strong>Near-miss:</strong> within ΔE 2 of the nearest token.
        </li>
        <li>
          <strong>Off-system:</strong> anything further away.
        </li>
      </ol>
      <p>
        ΔE is the distance between the two colors in the OKLab color space, scaled by 100 so that 1 is roughly the
        smallest difference people notice. Alpha counts too: half the alpha difference is added to the distance, so a
        50% tint never matches a solid token.
      </p>
      <Table
        columns={["Rendered", "Nearest token", "ΔE", "Result"]}
        rows={[
          [<C>#3b82f6</C>, <C>#3b82f6</C>, "0", "match"],
          [<C>#3b82f7</C>, <C>#3b82f6</C>, "0.1", "near-miss"],
          [<C>#6c727f</C>, <C>#6b7280</C>, "0.2", "near-miss"],
          [<C>#ea580c</C>, <C>#6b7280</C>, "23.2", "off-system"],
        ]}
      />
      <p>
        To accept small differences as matches, raise <C>--color-tolerance</C> (for example <C>--color-tolerance 1</C>{" "}
        accepts anything within ΔE 1). The default, 0, means exact.
      </p>

      <H2 id="lengths">Spacing, radius and font size</H2>
      <p>Lengths are compared in pixels:</p>
      <ol className="doc-list">
        <li>
          <strong>Match:</strong> within <C>--px-tolerance</C> of a token (default 0.5px), which absorbs sub-pixel
          rounding.
        </li>
        <li>
          <strong>Near-miss:</strong> within 2px of the nearest token.
        </li>
        <li>
          <strong>Off-system:</strong> further away.
        </li>
      </ol>
      <p>
        Negative margins are checked against the same scale by their absolute value, so <C>-8px</C> matches an{" "}
        <C>8px</C> token. Pill radii (500px and up) match any radius token of 500px or more.
      </p>
      <Table
        columns={["Rendered", "Scale", "Result"]}
        rows={[
          [<C>12px</C>, "4, 8, 12, 16", "match"],
          [<C>12.4px</C>, "4, 8, 12, 16", "match (within 0.5px)"],
          [<C>13px</C>, "4, 8, 12, 16", "near-miss, 1px from 12px"],
          [<C>20px</C>, "4, 8, 12, 16, 24", "off-system, 4px from both 16px and 24px"],
          [<>
            <C>-8px</C> (margin)
          </>, "4, 8, 12, 16", "match"],
        ]}
      />

      <H2 id="typography">Font family and weight</H2>
      <H3 id="family">Family</H3>
      <p>
        Only the first family in the computed <C>font-family</C> list counts, lowercased with quotes removed. It must
        equal the first family of one of your font-family tokens. There&apos;s no &quot;near&quot; for families, so a
        mismatch is always off-system, and the suggestion is your first font-family token.
      </p>
      <Note kind="warn" title="Families are compared as written, not as rendered">
        <p>
          If your CSS says <C>font-family: Inter, sans-serif</C> but Inter fails to load, the computed value is still{" "}
          <C>Inter</C> and it matches. Astrolabe checks what the code asks for, which is what the token governs.
        </p>
      </Note>
      <H3 id="weight">Weight</H3>
      <p>
        Weights must equal a token exactly. A weight within 100 of the nearest token (for example <C>700</C> where your
        scale stops at <C>600</C>) is a near-miss; anything further is off-system.
      </p>

      <H2 id="findings">Findings and grouping</H2>
      <p>
        Every off-token value is grouped by category and normalized value into one <strong>finding</strong>. Each
        finding records:
      </p>
      <ul className="doc-list">
        <li>
          <strong>Occurrences:</strong> the number of elements using it. An element that uses the value in four paddings
          still counts once.
        </li>
        <li>
          <strong>Properties:</strong> the properties involved, with sides folded (<C>padding</C>, not{" "}
          <C>padding-top</C>).
        </li>
        <li>
          <strong>Selectors:</strong> up to five sample elements.
        </li>
        <li>
          <strong>Nearest token:</strong> its name, value and distance.
        </li>
      </ul>
      <p>
        Findings are sorted near-misses first, then by occurrences (most first), then by category and value.
      </p>

      <H2 id="score">The fidelity score</H2>
      <p>
        Every audited value is one check: each property of each element, in the categories your file defines. Fidelity
        is <C>matched ÷ checked × 100</C>, rounded to one decimal. The report also breaks it down per category.
      </p>
      <Code title="Example" copy={false}>{`
201 values checked, 189 matched  →  fidelity 94%
color 96.1% · spacing 93.8% · radius 100% · font-size 94.4% · font-family 83.3% · font-weight 88.9%
`}</Code>
      <p>
        With several pages, the overall score combines all their checks rather than averaging the page scores, so a
        large page weighs more than a small one.
      </p>

      <H2 id="selectors">Selectors in reports</H2>
      <p>
        Each sample element is described by a short CSS selector of up to three levels, for example{" "}
        <C>main.shell &gt; aside.card.order-summary &gt; button.pay-button</C>. An element with an <C>id</C> stops the
        chain (<C>#checkout</C>); otherwise each level uses the tag plus up to two classes, or{" "}
        <C>:nth-of-type()</C> when there are none. The terminal shows only the last level to stay readable; the JSON,
        Markdown and HTML reports show the whole selector.
      </p>
    </>
  );
}
