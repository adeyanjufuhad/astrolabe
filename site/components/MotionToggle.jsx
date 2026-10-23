"use client";

import { useEffect, useState } from "react";

const KEY = "astrolabe-motion";

// Pause/play for the looping motion (clouds, floating cards, marquee, scan demo).
// The choice is stored per visitor; the layout applies it before first paint.
export default function MotionToggle() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setPaused(document.documentElement.dataset.motion === "paused");
  }, []);

  const toggle = () => {
    const next = !paused;
    setPaused(next);
    if (next) document.documentElement.dataset.motion = "paused";
    else delete document.documentElement.dataset.motion;
    try {
      if (next) localStorage.setItem(KEY, "paused");
      else localStorage.removeItem(KEY);
    } catch {}
    window.dispatchEvent(new Event("motionchange"));
  };

  return (
    <button type="button" className="motion-toggle" onClick={toggle} aria-pressed={paused}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {paused ? <path d="M7 4.5v15l13-7.5z" /> : <path d="M6 4h4v16H6zM14 4h4v16h-4z" />}
      </svg>
      {paused ? "Play motion" : "Pause motion"}
    </button>
  );
}
