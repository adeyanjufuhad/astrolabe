"use client";

import { useEffect } from "react";

// Pauses the CSS animations inside any [data-pause] section while it is off-screen.
export default function PauseOffscreen() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("offscreen", !e.isIntersecting)),
      { rootMargin: "120px" },
    );
    document.querySelectorAll("[data-pause]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
