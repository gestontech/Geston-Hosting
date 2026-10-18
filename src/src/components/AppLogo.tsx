interface AppLogoProps {
  className?: string;
}

/**
 * The real GESTONX mark (the blue "T/H" swoosh), exported on a
 * transparent background. Any size/utility classes (w-*, h-*, drop-shadow-*,
 * etc.) still apply normally since it's rendered as an <img>. Color utility
 * classes like `text-primary` are harmless no-ops kept for backwards
 * compatibility with existing call sites.
 */
export function AppLogoIcon({ className = "w-6 h-6" }: AppLogoProps) {
  return (
    <img
      src="/logo/icon.png"
      alt=""
      draggable={false}
      className={`${className} object-contain select-none`}
      aria-hidden="true"
    />
  );
}

export function AppLogoFull({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <AppLogoIcon className="w-7 h-7" />
      <span className="font-bold tracking-tight text-foreground">
        Geston{" "}
        <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
          Hosting
        </span>
      </span>
    </span>
  );
}

/** The full lockup artwork (icon + "GESTON HOSTING" wordmark) as one image. */
export function AppLogoLockup({ className = "h-16" }: { className?: string }) {
  return (
    <img
      src="/logo/logo-full.png"
      alt="GESTONX"
      draggable={false}
      className={`${className} object-contain select-none`}
    />
  );
}
