"use client";

import { useEffect, useRef, useState } from "react";
import Counter from "./Counter";
import Reveal from "./Reveal";
import { prefersReduced } from "../lib/hooks";

const STEPS = [
  ["Render", <>Launches your installed Chrome or Edge headless and loads the page, fonts and all.</>],
  ["Read", <>Collects the computed styles of every visible element. Hidden nodes and <code>margin: auto</code> are skipped.</>],
  ["Match", <>Compares colors in perceptual OKLab space and lengths in px against your tokens.</>],
  ["Report", <>Prints near-misses first, then off-system values, each with the nearest token.</>],
];

// The drift planted in examples/checkout, found in the order the beam reaches it.
const FINDINGS = [
  { f: "pay", cls: "near", label: "#3b82f7 → <b>color.blue.500</b>" },
  { f: "sum", cls: "near", label: "padding 13px → <b>space.3</b>", corner: true },
  { f: "total", cls: "near", label: "700 → <b>font.weight.semibold</b>" },
  { f: "promo", cls: "off", label: "#ea580c · 15px → <b>font.size.base</b>" },
  { f: "pay", cls: "off", label: "arial → <b>font.family.sans</b>", below: true },
  { f: "legal", cls: "off", label: "georgia → <b>font.family.sans</b>" },
];

const SCAN_MS = 3600;
const START_MS = 700;

export default function ScanDemo() {
  const browserRef = useRef(null);
  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(browserRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    layer.replaceChildren();
    stage.querySelectorAll(".flagged").forEach((el) => el.classList.remove("flagged", "offsys"));
    setScanning(false);
    setDone(false);
    setStep(0);
    if (!visible) return;

    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const sr = stage.getBoundingClientRect();
    later(() => {
      setScanning(true);
      setStep(1);
    }, START_MS);

    FINDINGS.forEach((fd, k) => {
      const el = stage.querySelector(`[data-f="${fd.f}"]`);
      const r = el.getBoundingClientRect();
      const b = document.createElement("span");
      b.className = "badge " + fd.cls;
      b.innerHTML = `<i></i>${fd.label}`; // constant markup from FINDINGS above
      layer.append(b);
      const bw = b.offsetWidth;
      let left = fd.corner ? r.right - sr.left - bw + 8 : Math.min(r.left - sr.left + 12, sr.width - bw - 12);
      left = Math.max(12, left);
      const top = fd.below ? r.bottom - sr.top + 6 : fd.corner ? r.top - sr.top - 14 : r.top - sr.top - 26;
      b.style.left = left + "px";
      b.style.top = top + "px";
      const y = r.top - sr.top + (fd.corner ? 0 : r.height / 2);
      const at = START_MS + Math.max(0, Math.min(1, y / sr.height)) * SCAN_MS + k * 40;
      later(() => {
        setStep(2);
        el.classList.add("flagged");
        if (fd.cls === "off") el.classList.add("offsys");
        b.classList.add("show");
      }, at);
    });

    later(() => {
      setStep(3);
      setDone(true);
    }, START_MS + SCAN_MS + 200);
    if (!prefersReduced()) later(() => setRun((n) => n + 1), START_MS + SCAN_MS + 4200);
    return () => timers.forEach(clearTimeout);
  }, [visible, run]);

  return (
    <>
      <ol className="steps">
        {STEPS.map(([title, body], i) => (
          <li key={title} className={i === step ? "step active" : "step"}>
            <span className="n">0{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <Reveal>
        <div ref={browserRef} className={scanning ? "browser scanning" : "browser"} style={{ "--scan": SCAN_MS + "ms" }}>
          <div className="browser-bar">
            <span className="lights">
              <i />
              <i />
              <i />
            </span>
            <span className="url">examples/checkout/index.html</span>
            <span className={done ? "score done" : "score"}>{done ? <Counter key={run} value={94} suffix="%" intro /> : "—"}</span>
          </div>
          <div className="stage" ref={stageRef}>
            <div className="beam" aria-hidden="true" />
            {/* Drift here is deliberate; our own CI scan skips it with --ignore .demo */}
            <div className="mock demo" aria-hidden="true">
              <div>
                <h4>Checkout</h4>
                <div className="field" />
                <div className="field" />
                <div className="field short" />
                <div className="field" />
              </div>
              <div className="sum" data-f="sum">
                <div className="line">
                  <span>Wireless headphones</span>
                  <span>$129.00</span>
                </div>
                <div className="line">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="line total" data-f="total">
                  <span>Total</span>
                  <span>$129.00</span>
                </div>
                <p className="promo" data-f="promo">
                  Free returns within 30 days
                </p>
                <button className="pay" data-f="pay" tabIndex={-1} type="button">
                  Pay now
                </button>
              </div>
              <p className="legal" data-f="legal">
                By placing your order you agree to the terms of sale.
              </p>
            </div>
            <div className="badge-layer" ref={layerRef} aria-hidden="true" />
          </div>
        </div>
      </Reveal>
    </>
  );
}
