"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function BackgroundLayer() {
  const [gradientBg, setGradientBg] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    // Generate 60 randomized dots for the particle texture on the client
    // to avoid Next.js hydration mismatch errors from Math.random()
    let gradients = [];
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      const size = Math.random() > 0.8 ? 1.5 : 1;
      const opacity = Math.random() > 0.7 ? 0.8 : 0.3;
      gradients.push(`radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${opacity}) 100%, transparent)`);
    }
    setGradientBg(gradients.join(', '));
  }, []);

  if (pathname !== "/sign-in") {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1]" style={{ backgroundColor: '#000000' }}>
      {/* SVG Fractal Noise Filter */}
      <svg className="absolute inset-0 w-full h-full opacity-15" style={{ mixBlendMode: 'overlay' }}>
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      
      {/* Scattered ambient "particle" texture via radial gradients */}
      {gradientBg && (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: gradientBg,
            backgroundSize: '100% 100%',
          }}
        />
      )}
    </div>
  );
}
