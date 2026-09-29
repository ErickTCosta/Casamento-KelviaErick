"use client";

import type { CSSProperties } from "react";

const petals = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: `${(index * 29) % 100}%`,
  duration: `${8 + (index % 5)}s`,
  delay: `-${index % 9}s`,
}));

export function PetalBackground() {
  return (
    <div className="petal-background" aria-hidden="true">
      {petals.map((petal) => (
        <span
          className="petal"
          key={petal.id}
          style={
            {
              "--left": petal.left,
              "--duration": petal.duration,
              "--delay": petal.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
