"use client";

/* Adapted from the React Bits Counter (reactbits.dev).
   Copyright (c) 2026 David Haz. MIT + Commons Clause, see THIRD_PARTY_NOTICES.md.
   Odometer digits driven by a damped spring, staggered per place. */

import { useEffect, useRef } from "react";
import { prefersReduced, useInView } from "../lib/hooks";

const mod = (v, b) => ((v % b) + b) % b;
const wrap = (o) => mod(o + 5, 10) - 5;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// "13.5px" -> slots keyed by place value, so digits keep their state across updates.
function slotsOf(str) {
  let place = (str.split(".")[0].match(/\d/g) || []).length;
  let f = 0;
  return [...str].map((ch, k) =>
    /\d/.test(ch)
      ? place > 0
        ? { key: "i" + --place, d: +ch }
        : { key: "f" + f++, d: +ch }
      : { key: ch === "." ? "dot" : "s" + k + ch, sym: ch },
  );
}

export default function Counter({
  value,
  decimals = 0,
  suffix = "",
  format,
  intro = false, // start at zero and roll up once scrolled into view
  delay = 0,
  duration = 0.7,
  bounce = 0.2,
  stagger = 0.04,
}) {
  const str = format ? format(value) : value.toFixed(decimals) + suffix;
  const slots = slotsOf(str);
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { threshold: 0.2 });
  const items = useRef(new Map()); // key -> { pos, vel, target, wait, nums }
  const start = useRef(new Map()); // key -> digit the slot was first rendered at
  const mounted = useRef(false);
  const prev = useRef(null);
  const ran = useRef(false);
  const raf = useRef(0);

  for (const s of slots) {
    if (!s.sym && !start.current.has(s.key)) start.current.set(s.key, intro || mounted.current ? 0 : s.d);
  }

  const register = (key) => (el) => {
    if (!el) return;
    let it = items.current.get(key);
    if (!it) {
      const d = start.current.get(key) ?? 0;
      it = { pos: d, vel: 0, target: d, wait: 0, nums: null };
      items.current.set(key, it);
    }
    it.nums = [...el.querySelectorAll(".ctr-n")];
  };

  const paint = (it) =>
    it.nums?.forEach((n, k) => {
      n.style.transform = `translateY(${(wrap(k - it.pos) * 100).toFixed(2)}%)`;
    });

  useEffect(() => {
    mounted.current = true;
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    if (intro && !inView) return;
    const live = new Set(slots.filter((s) => !s.sym).map((s) => s.key));
    for (const k of items.current.keys()) if (!live.has(k)) items.current.delete(k);

    const reduce = prefersReduced();
    const up = prev.current === null || value >= prev.current;
    prev.current = value;
    const wait0 = ran.current ? 0 : delay / 1000;
    ran.current = true;
    let rank = 0;
    for (const s of slots) {
      if (s.sym) continue;
      const it = items.current.get(s.key);
      if (!it) continue;
      const from = mod(Math.round(it.target), 10);
      const fwd = mod(s.d - from, 10);
      const step = up ? fwd : fwd === 0 ? 0 : fwd - 10;
      if (!step) continue;
      it.target += step;
      it.wait = wait0 + rank++ * stagger;
      if (reduce) {
        it.pos = it.target;
        it.vel = 0;
        it.wait = 0;
        paint(it);
      }
    }
    if (reduce) return;

    const omega = (2 * Math.PI) / duration;
    const zeta = 1 - bounce;
    let last = performance.now();
    const frame = (now) => {
      raf.current = 0;
      let busy = false;
      for (const it of items.current.values()) {
        let dt = Math.min(0.05, (now - last) / 1000);
        if (it.wait > 0) {
          const used = Math.min(it.wait, dt);
          it.wait -= used;
          dt -= used;
        }
        const steps = Math.ceil(dt * 240);
        for (let k = 0; k < steps; k++) {
          const h = dt / steps;
          it.vel += (-omega * omega * (it.pos - it.target) - 2 * zeta * omega * it.vel) * h;
          it.pos += it.vel * h;
        }
        if (it.wait > 0 || Math.abs(it.pos - it.target) > 0.002 || Math.abs(it.vel) > 0.02) busy = true;
        else {
          it.target = mod(Math.round(it.target), 10);
          it.pos = it.target;
          it.vel = 0;
        }
        paint(it);
      }
      last = now;
      if (busy) raf.current = requestAnimationFrame(frame);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [str, inView]);

  return (
    <span ref={rootRef} className="ctr">
      <span className="sr-only">{str}</span>
      <span className="ctr-row" aria-hidden="true">
        {slots.map((s) =>
          s.sym ? (
            <span key={s.key}>{s.sym}</span>
          ) : (
            <span key={s.key} className="ctr-d" ref={register(s.key)}>
              <span className="ghost">0</span>
              {DIGITS.map((n) => (
                <span key={n} className="ctr-n" style={{ transform: `translateY(${wrap(n - start.current.get(s.key)) * 100}%)` }}>
                  {n}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
