"use client";

import { useState } from "react";
import Counter from "./Counter";
import Reveal from "./Reveal";

// Same rules as internal/colorx and internal/drift, against the demo token set.
const COLORS = [
  ["color.blue.500", "#3b82f6"],
  ["color.blue.600", "#2563eb"],
  ["color.gray.50", "#f9fafb"],
  ["color.gray.200", "#e5e7eb"],
  ["color.gray.500", "#6b7280"],
  ["color.gray.900", "#111827"],
  ["color.white", "#ffffff"],
  ["color.green", "#16a34a"],
];
const SPACE = [
  ["space.1", 4],
  ["space.2", 8],
  ["space.3", 12],
  ["space.4", 16],
  ["space.6", 24],
  ["space.8", 32],
  ["space.12", 48],
];
const RULER = [0, 4, 8, 12, 16, 24, 32, 48];

const parseHex = (s) => {
  s = s.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/.test(s)) return null;
  return [0, 2, 4].map((k) => parseInt(s.slice(k, k + 2), 16));
};
const toHex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const oklab = (c) => {
  const [r, g, b] = c.map((v) => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const deltaE = (a, b) => {
  const A = oklab(a);
  const B = oklab(b);
  return 100 * Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
};
const r1 = (d) => (Math.round(d * 100) / 100).toFixed(1); // round2 then %.1f, like the CLI
const fmtPx = (v) => String(Math.round(v * 100) / 100);
const pad = (s, n) => s + " ".repeat(Math.max(1, n - s.length));

function CliLine({ sev, cat, value, rest }) {
  const near = sev === "near-miss";
  return (
    <div className="cli-line">
      {"  "}
      <span className={near ? "y" : "r"}>{near ? "near-miss " : "off-system"}</span>
      {"  " + pad(cat, 12) + " "}
      <b>{value}</b>
      {"  ×1  → " + rest}
    </div>
  );
}

function ColorVerdict({ input }) {
  const c = parseHex(input);
  if (!c)
    return (
      <>
        <span className="tag off">not a color</span>
        <p className="de" style={{ marginTop: 8 }}>
          Try a hex value like #3b82f7.
        </p>
      </>
    );
  const val = toHex(c);
  let best = COLORS[0];
  let bd = Infinity;
  for (const t of COLORS) {
    if (t[1] === val) {
      best = t;
      bd = 0;
      break;
    }
    const d = deltaE(c, parseHex(t[1]));
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  if (bd === 0)
    return (
      <>
        <span className="tag ok">on-token</span>
        <div className="cmp">
          <span className="swatch" style={{ backgroundColor: val }} />
          <div>
            <div className="tok">{best[0]}</div>
            <div className="de">exact match</div>
          </div>
        </div>
        <div className="cli-line">
          <span className="g">✓</span> {val} is {best[0]}
        </div>
      </>
    );
  const near = bd <= 2;
  return (
    <>
      <span className={near ? "tag near" : "tag off"}>{near ? "near-miss" : "off-system"}</span>
      <div className="cmp">
        <span className="swatch" style={{ backgroundColor: val }} />
        <span className="arr">→</span>
        <span className="swatch" style={{ backgroundColor: best[1] }} />
        <div>
          <div className="tok">{best[0]}</div>
          <div className="de">
            {best[1]} · ΔE {r1(bd)}
          </div>
        </div>
      </div>
      <CliLine sev={near ? "near-miss" : "off-system"} cat="color" value={val} rest={`${best[0]} (${best[1]}) ΔE ${r1(bd)}`} />
    </>
  );
}

function SpaceVerdict({ px }) {
  if (px === 0)
    return (
      <p className="de" style={{ marginTop: 8 }}>
        Zero spacing isn&apos;t audited.
      </p>
    );
  let best = SPACE[0];
  let bd = Infinity;
  for (const t of SPACE) {
    const d = Math.abs(px - t[1]);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  if (bd <= 0.5)
    return (
      <>
        <div style={{ marginTop: 8 }}>
          <span className="tag ok">on-token</span> <span className="tok mono">{best[0]}</span>
        </div>
        <div className="cli-line">
          <span className="g">✓</span> {fmtPx(px)}px matches {best[0]} ({best[1]}px)
        </div>
      </>
    );
  const near = bd <= 2;
  return (
    <>
      <div style={{ marginTop: 8 }}>
        <span className={near ? "tag near" : "tag off"}>{near ? "near-miss" : "off-system"}</span>{" "}
        <span className="tok mono">→ {best[0]}</span>
      </div>
      <CliLine sev={near ? "near-miss" : "off-system"} cat="spacing" value={fmtPx(px) + "px"} rest={`${best[0]} (${best[1]}px) ${fmtPx(bd)}px off`} />
    </>
  );
}

export default function TryIt() {
  const [hex, setHex] = useState("#3b82f7");
  const [px, setPx] = useState(13);
  const parsed = parseHex(hex);

  return (
    <div className="try">
      <Reveal className="panel">
        <h3>Colors</h3>
        <p>An exact match is on-token. Within ΔE 2 in OKLab is a near-miss. Anything further is off-system.</p>
        <div className="palette demo">
          {COLORS.map(([name, v]) => (
            <button key={name} type="button" onClick={() => setHex(v)}>
              <i style={{ backgroundColor: v }} />
              {name.replace("color.", "")}
            </button>
          ))}
        </div>
        <div className="picker">
          <label className="sr-only" htmlFor="hex">
            Hex color
          </label>
          <input type="text" id="hex" value={hex} onChange={(e) => setHex(e.target.value)} spellCheck={false} autoComplete="off" />
          <label className="sr-only" htmlFor="color">
            Color picker
          </label>
          <input type="color" id="color" value={parsed ? toHex(parsed) : "#000000"} onChange={(e) => setHex(e.target.value)} />
        </div>
        <div className="verdict demo" aria-live="polite">
          <ColorVerdict input={hex} />
        </div>
      </Reveal>

      <Reveal className="panel">
        <h3>Spacing</h3>
        <p>Within 0.5px of a token is a match. Within 2px is a near-miss. Negative margins use the same scale.</p>
        <div className="spacer-vis" aria-hidden="true">
          <span className="box" />
          <span className="gap" style={{ "--g": px + "px" }} />
          <span className="box" />
        </div>
        <div className="range">
          <label className="sr-only" htmlFor="px">
            Spacing in pixels
          </label>
          <input type="range" id="px" min="0" max="56" step="0.5" value={px} onChange={(e) => setPx(parseFloat(e.target.value))} />
          <div className="ruler">
            {RULER.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>
        <div className="verdict">
          <div className="px-big">
            <Counter value={px} format={fmtPx} duration={0.45} stagger={0.02} />
            px
          </div>
          <div aria-live="polite">
            <SpaceVerdict px={px} />
          </div>
        </div>
      </Reveal>
    </div>
  );
}
