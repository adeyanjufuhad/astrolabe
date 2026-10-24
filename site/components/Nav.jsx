"use client";

import { useEffect, useState } from "react";
import { Arrow, Logo } from "./Icons";

const LINKS = [
  ["/#how", "How it works"],
  ["/#try", "Try it"],
  ["/#features", "Features"],
  ["/docs", "Docs"],
];

// Fixed nav that turns to glass once the hero scrolls under it. On pages
// without the sky hero (the docs) it starts in its glass state.
export default function Nav({ solid = false }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={solid || scrolled ? "nav scrolled" : "nav"}>
      <div className="nav-inner">
        <a className="brand" href="/" aria-label="Astrolabe home" translate="no">
          <Logo />
          Astrolabe
        </a>
        <nav className="nav-links" aria-label="Sections">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a className="btn btn-lime" href="https://github.com/adeyanjufuhad/astrolabe">
          GitHub{" "}
          <span className="arrow">
            <Arrow />
          </span>
        </a>
      </div>
    </header>
  );
}
