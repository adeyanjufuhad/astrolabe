"use client";

import { useEffect, useState } from "react";
import { Arrow, Logo } from "./Icons";

const LINKS = [
  ["#how", "How it works"],
  ["#try", "Try it"],
  ["#features", "Features"],
  ["#start", "Get started"],
];

// Fixed nav that turns to glass once the hero scrolls under it.
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "nav scrolled" : "nav"}>
      <div className="nav-inner">
        <a className="brand" href="#top" aria-label="Astrolabe home">
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
