"use client";

import { useEffect, useRef, useState } from "react";
import Counter from "./Counter";
import { useInView } from "../lib/hooks";

const CIRCUMFERENCE = 251.3; // 2π × r40

// Fidelity ring: the arc sweeps and the number rolls once it scrolls into view.
export default function Ring({ value, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.2 });
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);

  return (
    <div ref={ref} className={go ? "ring go" : "ring"}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="track" cx="50" cy="50" r="40" />
        <circle className="bar" cx="50" cy="50" r="40" style={{ "--off": (CIRCUMFERENCE * (1 - value / 100)).toFixed(1) }} />
      </svg>
      <span className="val">
        <Counter value={value} suffix="%" intro delay={delay} />
      </span>
    </div>
  );
}
