"use client";

import Radar from "./Radar";

// A slow sky-blue radar sweep behind the scan demo. Decorative only.
export default function RadarBackdrop() {
  return (
    <div className="radar-bg" aria-hidden="true">
      <Radar
        color="#1462d6"
        lightMode
        speed={0.5}
        scale={0.92}
        ringCount={5}
        spokeCount={12}
        targets={4}
        clutter={0.15}
        glow={0.9}
        lineWidth={1.4}
        grain={0}
        opacity={1}
        mouseInteraction={false}
      />
    </div>
  );
}
