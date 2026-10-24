"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Clouds from "./Clouds";
import Ring from "./Ring";
import SplitFlapText from "./SplitFlapText";
import TiltCard from "./TiltCard";
import { Arrow, Icon } from "./Icons";
import { finePointer, prefersReduced } from "../lib/hooks";

const LINE1 = ["Ship", "the", "design", "system"];
const LINE2 = ["you", "actually", "designed"];
const BARS = [
  ["color", 96],
  ["spacing", 94],
  ["radius", 100],
  ["size", 94],
  ["family", 83, true],
  ["weight", 89, true],
];
// Real facts about the tool, shown on the split-flap board at the bottom of the hero.
const FACTS = ["OPEN SOURCE", "MIT LICENSE", "NO ACCOUNT", "1 DEPENDENCY", "6 PROPERTIES"];

const PR_ROWS = [
  ["🟡 color", "#3b82f7"],
  ["🟡 spacing", "13px"],
  ["🔴 font-family", "arial"],
];

function Words({ words, offset = 0 }) {
  return words.map((w, i) => (
    <Fragment key={w}>
      {i > 0 && " "}
      <span className="word" style={{ "--i": i + offset }}>
        {w}
      </span>
    </Fragment>
  ));
}

// One position on the 3D ring. The seven cards are rendered three times (21 slots) so
// the turning ring never shows a gap; the copies are hidden from assistive tech.
function Slot({ n, copy, children }) {
  return (
    <div className="ring-slot" style={{ "--i": n - 1 + copy * 7 }} aria-hidden={copy ? true : undefined}>
      {children}
    </div>
  );
}

// The cards on the carousel: every one shows real Astrolabe output.
function CardSet({ go, copy }) {
  return (
    <>
      <Slot copy={copy} n={1}>
        <TiltCard className="glass">
          <span className="k">token</span>
          <div className="swatch demo" style={{ backgroundColor: "#3b82f6", marginTop: 10 }} />
          <p className="mono" style={{ marginTop: 10, fontSize: 11 }}>
            color.blue.500
          </p>
          <p className="k">#3b82f6</p>
        </TiltCard>
      </Slot>

      <Slot copy={copy} n={2}>
        <TiltCard className="glass">
          <div className="pill-head">
            <span>Fidelity</span>
          </div>
          <Ring value={94} delay={900} />
          <p className="k" style={{ textAlign: "center" }}>
            189 / 201 on-token
          </p>
        </TiltCard>
      </Slot>

      <Slot copy={copy} n={3}>
        <TiltCard className="glass">
          <span className="tag near">near-miss</span>
          <div className="demo" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <div className="swatch" style={{ backgroundColor: "#3b82f7" }} />
            <div className="swatch" style={{ backgroundColor: "#3b82f6" }} />
          </div>
          <p className="mono" style={{ marginTop: 12, fontSize: 12 }}>
            #3b82f7 → <b style={{ fontWeight: 500 }}>color.blue.500</b>
          </p>
          <p className="k">ΔE 0.1 · button.pay-button</p>
        </TiltCard>
      </Slot>

      <Slot copy={copy} n={4}>
        <TiltCard className="glass" style={{ textAlign: "center" }}>
          <div className="plus">
            <Icon name="terminal" size={22} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-.02em" }}>One command</p>
          <p className="k" style={{ marginTop: 4 }}>
            any URL, localhost or HTML file
          </p>
          <div className="term-mini" translate="no">
            <span className="p">$</span> astrolabe check localhost:3000
          </div>
        </TiltCard>
      </Slot>

      <Slot copy={copy} n={5}>
        <TiltCard className="glass dark">
          <p style={{ fontSize: 13, fontWeight: 600 }}>🔭 Astrolabe · fidelity 94%</p>
          <p className="k" style={{ marginTop: 4, marginBottom: 8 }}>
            PR comment · updated on push
          </p>
          {PR_ROWS.map(([k, v]) => (
            <div key={k + v} className="pr-row">
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </TiltCard>
      </Slot>

      <Slot copy={copy} n={6}>
        <TiltCard className="glass">
          <span className="k">by category</span>
          <div className={go ? "bars go" : "bars"}>
            {BARS.map(([name, v, lo], i) => (
              <div key={name} className="row">
                <span>{name}</span>
                <div className="track">
                  <div className={lo ? "fill lo" : "fill"} style={{ "--w": v + "%", "--i": i }} />
                </div>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
        </TiltCard>
      </Slot>

      <Slot copy={copy} n={7}>
        <TiltCard className="glass">
          <span className="tag off">off-system</span>
          <p style={{ marginTop: 12, fontSize: 18 }} className="strike">
            arial
          </p>
          <p style={{ fontSize: 18, fontWeight: 500 }}>Inter</p>
          <p className="k" style={{ marginTop: 4 }}>
            font.family.sans
          </p>
        </TiltCard>
      </Slot>
    </>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGo(true), prefersReduced() ? 0 : 900);
    return () => clearTimeout(t);
  }, []);

  // Parallax: the pointer tilts the carousel, scroll and pointer move the cloud layers.
  useEffect(() => {
    if (prefersReduced()) return;
    const hero = ref.current;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    let visible = true;
    const tick = () => {
      tx += (mx - tx) * 0.06;
      ty += (my - ty) * 0.06;
      hero.style.setProperty("--px", tx.toFixed(4));
      hero.style.setProperty("--py", ty.toFixed(4));
      hero.style.setProperty("--sy", Math.min(window.scrollY, 1200).toFixed(1));
      raf = Math.abs(mx - tx) > 0.0005 || Math.abs(my - ty) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (visible && !raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
      kick();
    };
    const fine = finePointer();
    if (fine) {
      hero.addEventListener("pointermove", onMove);
      hero.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("scroll", kick, { passive: true });
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(hero);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", kick);
      if (fine) {
        hero.removeEventListener("pointermove", onMove);
        hero.removeEventListener("pointerleave", onLeave);
      }
    };
  }, []);

  return (
    <section className="hero" id="hero" data-pause ref={ref}>
      <div className="sun" aria-hidden="true" />
      <Clouds layer="far" />
      <Clouds layer="mid" />
      <Clouds layer="near" />
      <Clouds layer="front" />

      <div className="hero-copy">
        <h1>
          <Words words={LINE1} />{" "}
          <span className="soft">
            <Words words={LINE2} offset={LINE1.length} />
          </span>
        </h1>
        <p className="hero-sub">
          Astrolabe opens your pages in a real browser and flags every color, spacing, radius and font that isn&apos;t one of
          your design tokens, with the nearest token to use instead.
        </p>
        <div className="hero-cta">
          <a className="btn btn-glass" href="/demo-report.html">
            View demo report
          </a>
          <a className="btn btn-lime" href="#start">
            Get started{" "}
            <span className="arrow">
              <Arrow />
            </span>
          </a>
        </div>
      </div>

      <div className="carousel-wrap">
        <div className="carousel" aria-label="Examples of Astrolabe output">
          <div className="carousel-ring">
            <CardSet go={go} copy={0} />
            <CardSet go={go} copy={1} />
            <CardSet go={go} copy={2} />
          </div>
        </div>
      </div>

      <div className="hero-foot">
        <SplitFlapText
          words={FACTS}
          padTo={12}
          align="center"
          fontSize={20}
          tileColor="var(--ink-2)"
          textColor="var(--paper)"
          tileRadius={6}
          gap={4}
          cycleDelay={2600}
          glare={0.6}
          depth={0.55}
          order="center"
        />
      </div>
    </section>
  );
}
