import { Logo } from "./Icons";

/* An astrolabe-style ring around the logo: outer rim, 72 ticks (every 30° major) and lettering
   on a circular path. It turns slowly in CSS. In the spirit of React Bits' CircularText,
   written as plain SVG so it needs no animation library. */

const TEXT = "Astrolabe · design token fidelity · open source · ";

const ticks = Array.from({ length: 72 }, (_, i) => {
  const a = (i * 5 * Math.PI) / 180;
  const major = i % 6 === 0;
  const r1 = major ? 84 : 88;
  const r2 = 93;
  const p = (r) => [(110 + r * Math.sin(a)).toFixed(2), (110 - r * Math.cos(a)).toFixed(2)];
  const [x1, y1] = p(r1);
  const [x2, y2] = p(r2);
  return { x1, y1, x2, y2, major };
});

export default function Dial() {
  return (
    <div className="dial">
      <svg className="dial-ring" viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <path id="dial-text-path" d="M110,110 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" />
        </defs>
        <circle className="ring-line" cx="110" cy="110" r="105" strokeWidth="1.2" />
        <circle className="ring-line" cx="110" cy="110" r="93" strokeWidth=".6" />
        <circle className="ring-line" cx="110" cy="110" r="58" strokeWidth=".6" />
        {/* the rete: an off-center circle, crosshairs and star points, as on a real astrolabe */}
        <circle className="ring-line" cx="110" cy="122" r="44" strokeWidth=".5" />
        <circle className="ring-line" cx="110" cy="96" r="30" strokeWidth=".4" strokeDasharray="1.5 3" />
        <path className="ring-line" d="M110 52V168M52 110H168" strokeWidth=".4" />
        {[
          [110, 52],
          [151, 69],
          [66, 140],
          [137, 158],
          [80, 78],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" fill="currentColor" />
        ))}
        {ticks.map((t, i) => (
          <line key={i} className={t.major ? "tick major" : "tick"} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
        <text>
          <textPath href="#dial-text-path" textLength="430" lengthAdjust="spacing">
            {TEXT}
          </textPath>
        </text>
      </svg>
      <Logo className="mark" />
    </div>
  );
}
