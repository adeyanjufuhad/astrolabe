"use client";

import { useRef } from "react";
import { useInView } from "../lib/hooks";

// Fades and de-blurs its element in the first time it scrolls into view.
export default function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <Tag ref={ref} className={`reveal${inView ? " in" : ""}${className ? " " + className : ""}`} {...rest}>
      {children}
    </Tag>
  );
}
