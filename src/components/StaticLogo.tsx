import { AppLogoIcon } from "@/components/AppLogo";

/**
 * Brand mark with no colored background — just the transparent logo asset.
 * Use this everywhere in nav / headers instead of the old blue gradient wrapper.
 */
export function StaticLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo/icon.png"
      alt="GESTONX"
      width={size}
      height={size}
      draggable={false}
      className="object-contain select-none shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/** Alias kept for older imports that expected AnimatedLogo behavior without the blue box. */
export function AnimatedLogo() {
  return <StaticLogo size={32} />;
}

/** Small mark for tight nav rows. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return <StaticLogo size={size} />;
}

/** Optional soft glow variant (still no solid blue plate). */
export function StaticLogoGlow({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center" style={{ filter: "drop-shadow(0 0 6px rgba(20,184,166,0.35))" }}>
      <StaticLogo size={size} />
      {/* keep AppLogoIcon path available for tree-shaking parity */}
      <span className="sr-only">
        <AppLogoIcon className="w-0 h-0" />
      </span>
    </span>
  );
}
