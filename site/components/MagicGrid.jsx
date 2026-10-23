"use client";

/* Adapted from the React Bits Magic Bento (reactbits.dev).
   Copyright (c) 2026 David Haz. MIT + Commons Clause, see THIRD_PARTY_NOTICES.md.
   Edge light and spotlight that follow the cursor, a click wave, slight magnetic tilt.
   Cards inside the grid opt in with the "mb" class and a <span className="mb-edge" />. */

import { useEffect, useRef } from "react";
import { finePointer, prefersReduced } from "../lib/hooks";

const TILT = 3;
const MAGNET = 4;
const REACH = 180;
const WAVE = 1.1;

export default function MagicGrid({ className, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!finePointer() || prefersReduced()) return;
    const grid = ref.current;
    const cards = [...grid.querySelectorAll(".mb")];
    const st = new Map(cards.map((c) => [c, { hot: 0, near: 0, rx: 0, ry: 0, vrx: 0, vry: 0, tx: 0, ty: 0, vtx: 0, vty: 0 }]));
    const ptr = { x: -1e5, y: -1e5 };
    const wave = { x: 0, y: 0, t: -1 };
    let raf = 0;
    let last = 0;
    const spring = (s, k, target, dt) => {
      s["v" + k] += (170 * (target - s[k]) - 22 * s["v" + k]) * dt;
      s[k] += s["v" + k] * dt;
    };

    const frame = (now) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let busy = false;
      for (const [c, s] of st) {
        const r = c.getBoundingClientRect();
        if ((r.bottom < 0 || r.top > window.innerHeight) && s.hot < 0.01 && s.near < 0.01 && wave.t < 0) continue;
        const lx = ptr.x - r.left;
        const ly = ptr.y - r.top;
        const inside = lx >= 0 && ly >= 0 && lx <= r.width && ly <= r.height;
        const dist = Math.hypot(Math.max(r.left - ptr.x, 0, ptr.x - r.right), Math.max(r.top - ptr.y, 0, ptr.y - r.bottom));
        const ease = Math.min(1, dt * 10);
        s.hot += ((inside ? 1 : 0) - s.hot) * ease;
        s.near += ((inside ? 1 : Math.max(0, 1 - dist / REACH)) - s.near) * ease;
        const nx = inside ? lx / r.width - 0.5 : 0;
        const ny = inside ? ly / r.height - 0.5 : 0;
        spring(s, "rx", -ny * 2 * TILT, dt);
        spring(s, "ry", nx * 2 * TILT, dt);
        spring(s, "tx", nx * 2 * MAGNET, dt);
        spring(s, "ty", ny * 2 * MAGNET, dt);
        c.style.setProperty("--mb-x", lx.toFixed(1) + "px");
        c.style.setProperty("--mb-y", ly.toFixed(1) + "px");
        c.style.setProperty("--mb-hot", s.hot.toFixed(3));
        c.style.setProperty("--mb-near", s.near.toFixed(3));
        const ang = Math.hypot(s.rx, s.ry);
        c.style.rotate = ang > 0.01 ? `${s.rx.toFixed(3)} ${s.ry.toFixed(3)} 0 ${ang.toFixed(3)}deg` : "";
        c.style.translate = Math.abs(s.tx) + Math.abs(s.ty) > 0.01 ? `${s.tx.toFixed(2)}px ${s.ty.toFixed(2)}px` : "";
        if (wave.t >= 0) {
          const p = wave.t / WAVE;
          c.style.setProperty("--mb-wx", (wave.x - r.left).toFixed(1) + "px");
          c.style.setProperty("--mb-wy", (wave.y - r.top).toFixed(1) + "px");
          c.style.setProperty("--mb-wr", (p * 1600).toFixed(1) + "px");
          c.style.setProperty("--mb-wa", Math.max(0, 1 - p).toFixed(3));
        }
        const moving = Math.abs(s.vrx) + Math.abs(s.vry) + Math.abs(s.vtx) + Math.abs(s.vty) > 0.01;
        const settling = !inside && (s.near > 0.005 || Math.abs(s.rx) + Math.abs(s.tx) > 0.01);
        if (Math.abs(s.hot - (inside ? 1 : 0)) > 0.005 || moving || settling) busy = true;
      }
      if (wave.t >= 0) {
        wave.t += dt;
        busy = true;
        if (wave.t > WAVE) {
          wave.t = -1;
          cards.forEach((c) => c.style.setProperty("--mb-wa", 0));
        }
      }
      if (busy) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const onMove = (e) => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      kick();
    };
    const onLeave = () => {
      ptr.x = ptr.y = -1e5;
      kick();
    };
    const onDown = (e) => {
      wave.x = e.clientX;
      wave.y = e.clientY;
      wave.t = 0;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", kick, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    grid.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", kick);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      grid.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
