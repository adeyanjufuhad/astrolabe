"use client";

import { useEffect, useState } from "react";

export const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

// True while the visitor has paused looping motion with the MotionToggle.
export function useMotionPaused() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const read = () => setPaused(document.documentElement.dataset.motion === "paused");
    read();
    window.addEventListener("motionchange", read);
    return () => window.removeEventListener("motionchange", read);
  }, []);
  return paused;
}

// True once the element has scrolled into view (or while it is, with once: false).
export function useInView(ref, { threshold = 0.15, once = true, rootMargin = "0px" } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, once, rootMargin]);
  return inView;
}
