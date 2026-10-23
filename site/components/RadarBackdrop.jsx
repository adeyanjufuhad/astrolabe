"use client";

import Radar from "./Radar";
import { useMotionPaused } from "../lib/hooks";

// A slow sky-blue radar sweep behind the scan demo. Decorative only.
export default function RadarBackdrop() {
  const paused = useMotionPaused();
  return (
    <div className="radar-bg" aria-hidden="true">
      <Radar
        color="#3a8cf0"
        lightMode
        speed={0.5}
        scale={0.92}
        ringCount={5}
        spokeCount={12}
        targets={4}
        clutter={0.15}
        glow={0.6}
        grain={0}
        opacity={0.55}
        mouseInteraction={false}
        paused={paused}
      />
    </div>
  );
}
