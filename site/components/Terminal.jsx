"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { prefersReduced, useInView } from "../lib/hooks";

const CMD = "astrolabe check examples/checkout/index.html --tokens tokens.json";

// The real output of the demo scan. Each line is a list of [class, text] runs.
const OUT = [
  [],
  [["b", "Astrolabe"], ["", "  examples/checkout/index.html"]],
  [["", "Fidelity "], ["y b", "94%"], ["", "  ·  189 of 201 values on-token  ·  7 off-token values"]],
  [],
  [["", "  "], ["y", "near-miss "], ["", "  font-weight  "], ["b", "700"], ["", "      ×2  → font.weight.semibold (600)        h2.line "], ["d", "+1"]],
  [["", "  "], ["y", "near-miss "], ["", "  color        "], ["b", "#3b82f7"], ["", "  ×1  → color.blue.500 (#3b82f6) ΔE 0.1   button.pay-button"]],
  [["", "  "], ["y", "near-miss "], ["", "  font-size    "], ["b", "15px"], ["", "     ×1  → font.size.base (16px) 1px off     p.promo-note"]],
  [["", "  "], ["y", "near-miss "], ["", "  spacing      "], ["b", "13px"], ["", "     ×1  → space.3 (12px) 1px off            aside.order-summary"]],
  [["", "  "], ["r", "off-system"], ["", "  font-family  "], ["b", "georgia"], ["", "  ×2  → font.family.sans (inter)          p.legal "], ["d", "+1"]],
  [["", "  "], ["r", "off-system"], ["", "  color        "], ["b", "#ea580c"], ["", "  ×1  → color.gray.500 (#6b7280) ΔE 23.2  p.promo-note"]],
  [["", "  "], ["r", "off-system"], ["", "  font-family  "], ["b", "arial"], ["", "    ×1  → font.family.sans (inter)          button.pay-button"]],
  [],
];

const Prompt = () => <span className="p">~/shop $</span>;

// Types the demo command, then prints its output line by line.
export default function Terminal() {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.4 });
  const [typed, setTyped] = useState(0);
  const [lines, setLines] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced()) {
      setTyped(CMD.length);
      setLines(OUT.length);
      return;
    }
    let t;
    let k = 0;
    let n = 0;
    const print = () => {
      setLines(++n);
      if (n < OUT.length) t = setTimeout(print, n < 3 ? 380 : 120);
    };
    const type = () => {
      setTyped(++k);
      t = k < CMD.length ? setTimeout(type, 28 + Math.random() * 40) : setTimeout(print, 450);
    };
    t = setTimeout(type, 200);
    return () => clearTimeout(t);
  }, [inView]);

  const finished = typed >= CMD.length;
  return (
    <Reveal className="terminal">
      <div className="bar">
        <i />
        <i />
        <i />
        <span>~/shop</span>
      </div>
      <pre ref={ref} aria-label="Example terminal session">
        <Prompt /> {CMD.slice(0, typed)}
        {finished && "\n"}
        {OUT.slice(0, lines).map((line, i) => (
          <Fragment key={i}>
            {line.map(([cls, text], j) => (cls ? <span key={j} className={cls}>{text}</span> : <Fragment key={j}>{text}</Fragment>))}
            {"\n"}
          </Fragment>
        ))}
        {lines >= OUT.length && (
          <>
            <Prompt />{" "}
          </>
        )}
        <span className="cursor" />
      </pre>
    </Reveal>
  );
}
