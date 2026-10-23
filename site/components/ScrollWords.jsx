"use client";

/* Words light up one by one as the heading crosses the middle of the viewport.
   In the spirit of React Bits' ScrollReveal, written without GSAP to keep the bundle small. */

import { Fragment, useEffect, useRef } from "react";
import { prefersReduced } from "../lib/hooks";

// parts: strings (split into words), { soft: "text" } for the muted run, or elements (lit as one unit).
export default function ScrollWords({ parts, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const units = [...el.querySelectorAll(".sw, .chip-inline")];
    if (prefersReduced()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the heading's top reaches 85% of the viewport, 1 when its bottom reaches 45%.
      const start = vh * 0.85;
      const end = vh * 0.45;
      const progress = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      const lit = progress * units.length;
      units.forEach((u, i) => u.style.setProperty("--p", Math.min(1, Math.max(0, lit - i)).toFixed(3)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const words = (text, soft, key) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i) => (
        <Fragment key={`${key}-${i}`}>
          <span className={soft ? "sw h-soft" : "sw"}>{w}</span>{" "}
        </Fragment>
      ));

  return (
    <h2 ref={ref} className={`scroll-words ${className}`.trim()}>
      {parts.map((part, i) => {
        if (typeof part === "string") return words(part, false, i);
        if (part && typeof part === "object" && "soft" in part) return words(part.soft, true, i);
        return (
          <Fragment key={i}>
            {part}{" "}
          </Fragment>
        );
      })}
    </h2>
  );
}
