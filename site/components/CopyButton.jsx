"use client";

import { useEffect, useState } from "react";

export default function CopyButton({ text }) {
  const [state, setState] = useState("Copy");
  useEffect(() => {
    if (state === "Copy") return;
    const t = setTimeout(() => setState("Copy"), 1600);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("Copied");
    } catch {
      setState("Select");
    }
  };

  return (
    <button type="button" className={state === "Copied" ? "copy ok" : "copy"} onClick={copy}>
      {state}
    </button>
  );
}
