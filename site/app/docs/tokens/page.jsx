import { C, Code, DocHeader, H2, H3, Note, Table, Toc } from "../../../components/docs/Doc";

export const metadata = { title: "Design tokens" };

export default function Tokens() {
  return (
    <>
      <DocHeader eyebrow="Using Astrolabe" title="Design tokens">
        Astrolabe reads your design tokens from a JSON file and sorts each one into a category it can audit. This page
        covers the supported formats, how tokens are classified, which value formats are understood, and how to check
        the result.
      </DocHeader>

      <Toc
        items={[
          ["finding", "Where Astrolabe looks"],
          ["formats", "Supported formats"],
          ["aliases", "Aliases"],
          ["categories", "Categories and classification"],
          ["values", "Value formats"],
          ["opt-in", "Only defined categories are audited"],
          ["inspect", "Inspect a token file"],
          ["tips", "Tips for common setups"],
        ]}
      />

      <H2 id="finding">Where Astrolabe looks</H2>
      <p>
        Pass a file with <C>--tokens path/to/file.json</C>. Without it, Astrolabe uses the first of these that exists in
        the current folder:
      </p>
      <ol className="doc-list">
        <li>
          <C>tokens.json</C>
        </li>
        <li>
          <C>design-tokens.json</C>
        </li>
        <li>
          <C>tokens/tokens.json</C>
        </li>
        <li>
          <C>.astrolabe/tokens.json</C>
        </li>
      </ol>
      <p>If none exists, the command stops with exit code 2 and asks for <C>--tokens</C>.</p>

      <H2 id="formats">Supported formats</H2>
      <p>The three common shapes are detected automatically, and you can mix them in one file.</p>

      <H3 id="dtcg">W3C Design Tokens (DTCG)</H3>
      <p>
        The format from the W3C Design Tokens Community Group, used by Figma Variables exports and most modern tools. A
        token has a <C>$value</C>; its <C>$type</C> can be set on the token or inherited from any parent group.
      </p>
      <Code title="tokens.json">{`
{
  "color": {
    "$type": "color",
    "blue": {
      "500": { "$value": "#3b82f6" },
      "600": { "$value": "#2563eb" }
    },
    "primary": { "$value": "{color.blue.500}" }
  },
  "space": {
    "$type": "dimension",
    "3": { "$value": "12px" },
    "4": { "$value": { "value": 16, "unit": "px" } }
  }
}
`}</Code>

      <H3 id="tokens-studio">Tokens Studio and Style Dictionary</H3>
      <p>The same idea without the dollar signs: <C>value</C> and <C>type</C>.</p>
      <Code title="tokens.json">{`
{
  "color": {
    "primary": { "type": "color", "value": "#3b82f6" }
  },
  "borderRadius": {
    "md": { "type": "borderRadius", "value": "8" }
  },
  "fontWeights": {
    "bold": { "type": "fontWeights", "value": "Bold" }
  }
}
`}</Code>
      <p>
        A group that happens to be named <C>value</C> isn&apos;t mistaken for a token, unless it looks like a
        dimension object such as <C>{'{"value": 16, "unit": "px"}'}</C>.
      </p>

      <H3 id="plain">Plain nested JSON</H3>
      <p>
        Any nesting of objects with string or number leaves. Without explicit types, Astrolabe infers the category from
        the value and the path (see <a href="#categories">Categories and classification</a>).
      </p>
      <Code title="tokens.json">{`
{
  "colors":   { "primary": "#3b82f6", "text": "#111827" },
  "spacing":  { "sm": "4px", "md": "8px", "lg": "16px" },
  "rounded":  { "lg": "0.5rem" },
  "fontSize": { "base": 16, "lg": 18 }
}
`}</Code>
      <p>
        Keys that start with <C>$</C>, plus <C>type</C> and <C>description</C>, are metadata and are never treated as
        tokens.
      </p>

      <H2 id="aliases">Aliases</H2>
      <p>
        A value written as <C>{"{path.to.token}"}</C> refers to another token, using dot-separated names. Aliases can
        point at other aliases. Astrolabe follows up to 16 levels; deeper chains and loops are reported as{" "}
        <C>alias loop</C>, and references to tokens that don&apos;t exist as <C>unknown alias</C>. Either way, that one
        token is skipped and listed when you run <C>astrolabe tokens</C>; the rest of the file still loads.
      </p>
      <p>
        An alias inherits the type of the token it points to unless it declares its own. When two tokens have the same
        value, Astrolabe can only report one of them as the nearest match; prefer the semantic name if you want it to
        appear in suggestions.
      </p>

      <H2 id="categories">Categories and classification</H2>
      <p>Each token lands in one of six categories, or is ignored. An explicit type decides it directly:</p>
      <Table
        columns={["Type (case-insensitive)", "Category"]}
        rows={[
          [<C>color</C>, "color"],
          [<>
            <C>spacing</C>
          </>, "spacing"],
          [<C>borderRadius</C>, "radius"],
          [<>
            <C>fontSize</C>, <C>fontSizes</C>
          </>, "font-size"],
          [<>
            <C>fontFamily</C>, <C>fontFamilies</C>
          </>, "font-family"],
          [<>
            <C>fontWeight</C>, <C>fontWeights</C>
          </>, "font-weight"],
          [<>
            <C>dimension</C>, <C>sizing</C>, <C>number</C>, or no type
          </>, "Decided from the path and value (below)"],
          ["Anything else (shadow, duration, typography…)", "Ignored"],
        ]}
      />
      <p>For the last row, Astrolabe looks at the token&apos;s full path, lowercased and joined with dots:</p>
      <ol className="doc-list">
        <li>
          Paths containing <C>line-height</C>, <C>letter-spacing</C>, <C>tracking</C>, <C>leading</C>,{" "}
          <C>border-width</C>, <C>breakpoint</C>, <C>screen</C>, <C>shadow</C>, <C>blur</C>, <C>duration</C>,{" "}
          <C>opacity</C> or <C>z-index</C> (and their camelCase spellings) are ignored.
        </li>
        <li>
          With no type at all, a string that parses as a color is a <strong>color</strong>. A path containing{" "}
          <C>font-family</C>, <C>fontfamily</C>, <C>font.family</C> or <C>families</C> is a{" "}
          <strong>font family</strong>; <C>font-weight</C>, <C>fontweight</C>, <C>font.weight</C> or <C>weights</C> is a{" "}
          <strong>font weight</strong>.
        </li>
        <li>
          <C>radius</C>, <C>radii</C>, <C>rounded</C> or <C>corner</C> in the path means <strong>radius</strong>.
        </li>
        <li>
          <C>font-size</C>, <C>fontsize</C>, <C>font.size</C>, <C>text</C>, <C>type</C> or <C>font</C> means{" "}
          <strong>font size</strong>.
        </li>
        <li>
          <C>space</C>, <C>spacing</C>, <C>gap</C>, <C>padding</C>, <C>margin</C>, <C>inset</C>, <C>gutter</C>,{" "}
          <C>stack</C> or <C>inline</C> means <strong>spacing</strong>.
        </li>
        <li>
          Any other <C>dimension</C> token is treated as <strong>spacing</strong>. Anything left over is ignored.
        </li>
      </ol>
      <Note title="When in doubt, set the type">
        <p>
          Path inference covers the usual naming, but an explicit <C>$type</C> (or <C>type</C>) always wins. If{" "}
          <C>astrolabe tokens</C> shows a token in the wrong category, add one.
        </p>
      </Note>

      <H2 id="values">Value formats</H2>
      <H3 id="color-values">Colors</H3>
      <ul className="doc-list">
        <li>
          Hex: <C>#abc</C>, <C>#abcd</C>, <C>#aabbcc</C>, <C>#aabbccdd</C> (the last digits are alpha)
        </li>
        <li>
          <C>rgb()</C> and <C>rgba()</C>, with commas or spaces, numbers or percentages, and an optional{" "}
          <C>/ alpha</C>
        </li>
        <li>
          <C>hsl()</C> and <C>hsla()</C>
        </li>
        <li>
          <C>oklch()</C> and <C>oklab()</C>, so Tailwind v4 palettes work as-is
        </li>
        <li>
          <C>color(srgb r g b)</C>
        </li>
        <li>
          The names <C>black</C>, <C>white</C>, <C>red</C> and <C>transparent</C>
        </li>
      </ul>
      <p>
        Colors are normalized to 8-bit sRGB and shown as lowercase hex. Alpha is kept: a 50% white token only matches a
        50% white value, never solid white.
      </p>

      <H3 id="length-values">Lengths (spacing, radius, font size)</H3>
      <ul className="doc-list">
        <li>
          A bare number is pixels: <C>12</C>
        </li>
        <li>
          Strings with units: <C>&quot;12px&quot;</C>, <C>&quot;0.75rem&quot;</C>, <C>&quot;0.75em&quot;</C>
        </li>
        <li>
          DTCG dimension objects: <C>{'{"value": 0.75, "unit": "rem"}'}</C>
        </li>
      </ul>
      <p>
        <C>rem</C> and <C>em</C> are converted with a 16px root size, so <C>0.75rem</C> becomes <C>12px</C>. Other
        units (<C>%</C>, <C>vw</C>…) aren&apos;t design-token lengths and are skipped.
      </p>

      <H3 id="family-values">Font families</H3>
      <p>
        A string like <C>&quot;Inter, system-ui, sans-serif&quot;</C> or an array like{" "}
        <C>[&quot;Inter&quot;, &quot;system-ui&quot;]</C>. Only the <strong>first</strong> family counts. It&apos;s compared
        case-insensitively with quotes removed, so <C>&quot;Inter&quot;</C>, <C>&apos;inter&apos;</C> and <C>Inter</C>{" "}
        are the same.
      </p>

      <H3 id="weight-values">Font weights</H3>
      <p>Numbers from 1 to 1000, or one of these names:</p>
      <Table
        columns={["Weight", "Names"]}
        rows={[
          ["100", "thin, hairline"],
          ["200", "extralight, extra-light, ultralight"],
          ["300", "light"],
          ["400", "normal, regular, book"],
          ["500", "medium"],
          ["600", "semibold, semi-bold, demibold"],
          ["700", "bold"],
          ["800", "extrabold, extra-bold, ultrabold"],
          ["900", "black, heavy"],
        ]}
      />

      <H2 id="opt-in">Only defined categories are audited</H2>
      <p>
        A category is checked only if the file has at least one token in it. A file with only colors gives a
        color-only audit: spacing, radii and type aren&apos;t counted for or against you. This makes it safe to adopt
        Astrolabe one category at a time.
      </p>
      <p>
        Radii of 500px or more are treated as &quot;pill&quot; shapes. They match if your file has any radius token of
        500px or more (like <C>9999px</C>), and are skipped otherwise rather than flagged.
      </p>

      <H2 id="inspect">Inspect a token file</H2>
      <Code title="Terminal">{`astrolabe tokens tokens.json`}</Code>
      <p>
        This prints every token by category with its normalized value, then lists anything that was ignored and why
        (for example <C>lineHeight.body</C>, or <C>color.accent (unknown alias {"{color.purple.500}"})</C>). Without a
        path it uses the same lookup as <C>check</C>. Run it whenever you change the file.
      </p>

      <H2 id="tips">Tips for common setups</H2>
      <ul className="doc-list">
        <li>
          <strong>Figma Variables.</strong> Export variables as DTCG JSON with a plugin or your token pipeline, and point{" "}
          <C>--tokens</C> at the export. Figma&apos;s Variables REST API requires an Enterprise plan, so a file export is
          the practical route.
        </li>
        <li>
          <strong>Tokens Studio.</strong> Use the synced JSON file. In a multi-set file the set name becomes part of
          each token&apos;s path, so aliases that leave it out show up as <C>unknown alias</C> in{" "}
          <C>astrolabe tokens</C>. If that happens, export a single set or export with resolved values.
        </li>
        <li>
          <strong>Style Dictionary.</strong> Point Astrolabe at your source token files, or at a JSON output that keeps
          the nested structure.
        </li>
        <li>
          <strong>Tailwind CSS.</strong> Astrolabe reads JSON, not CSS. Export your theme&apos;s colors, spacing scale,
          radii and font sizes to a JSON file in the plain nested shape; <C>oklch()</C> values from Tailwind v4 are
          understood.
        </li>
        <li>
          <strong>Several themes.</strong> Values must match a token in the file you pass. To audit a dark theme, scan
          the dark version of the page with that theme&apos;s token file.
        </li>
      </ul>
    </>
  );
}
