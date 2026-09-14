import type React from "react";

const CSS = `@keyframes _orb{from{transform:rotate(0deg) translateX(var(--orb-r))}to{transform:rotate(360deg) translateX(var(--orb-r))}}`;

export function OrbitalLoader({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const r = Math.round(size * 0.3);
  const d = Math.round(size * 0.26);
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, "--orb-r": `${r}px` } as React.CSSProperties}
    >
      <style>{CSS}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute rounded-full bg-current"
          style={{
            width: d,
            height: d,
            animation: `_orb 1s linear ${(-i / 3).toFixed(3)}s infinite`,
            opacity: 1 - i * 0.28,
          }}
        />
      ))}
    </span>
  );
}
