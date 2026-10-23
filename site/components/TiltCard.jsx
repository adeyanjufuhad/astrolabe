"use client";

/* Adapted from the React Bits Tilted Card (reactbits.dev).
   Copyright (c) 2026 David Haz. MIT + Commons Clause, see THIRD_PARTY_NOTICES.md.
   Leans toward the pointer on a spring, with a glare that follows it. */

import { useEffect, useRef } from "react";
import { finePointer, prefersReduced } from "../lib/hooks";

export default function TiltCard({ className, style, amplitude = 12, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!finePointer() || prefersReduced()) return;
    const g = ref.current;
    const s = { rx: 0, ry: 0, sc: 1, vrx: 0, vry: 0, vsc: 0, trx: 0, try: 0, tsc: 1 };
    let raf = 0;
    let last = 0;
    // stiffness 100, damping 30, mass 2: the feel of the original's motion springs
    const step = (k, t, dt) => {
      s["v" + k] += ((100 * (t - s[k]) - 30 * s["v" + k]) / 2) * dt;
      s[k] += s["v" + k] * dt;
    };
    const frame = (now) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (let k = 0; k < 4; k++) {
        step("rx", s.trx, dt / 4);
        step("ry", s.try, dt / 4);
        step("sc", s.tsc, dt / 4);
      }
      const ang = Math.hypot(s.rx, s.ry);
      g.style.rotate = ang > 0.01 ? `${s.rx.toFixed(3)} ${s.ry.toFixed(3)} 0 ${ang.toFixed(3)}deg` : "";
      g.style.scale = s.sc.toFixed(4);
      const left = Math.abs(s.rx - s.trx) + Math.abs(s.ry - s.try) + Math.abs(s.sc - s.tsc);
      if (left + Math.abs(s.vrx) + Math.abs(s.vry) + Math.abs(s.vsc) > 0.002) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const onMove = (e) => {
      const r = g.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      s.trx = (0.5 - py) * 2 * amplitude;
      s.try = (px - 0.5) * 2 * amplitude;
      s.tsc = 1.06;
      g.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
      g.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      kick();
    };
    const onLeave = () => {
      s.trx = s.try = 0;
      s.tsc = 1;
      g.style.removeProperty("--gx");
      g.style.removeProperty("--gy");
      kick();
    };
    g.addEventListener("pointermove", onMove);
    g.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      g.removeEventListener("pointermove", onMove);
      g.removeEventListener("pointerleave", onLeave);
    };
  }, [amplitude]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
