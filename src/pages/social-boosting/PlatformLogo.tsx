import { useState } from "react";
import { iconUrl, type PlatformDef } from "@/lib/platforms";

export function PlatformLogo({ platform, size = 22 }: { platform?: PlatformDef; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!platform || broken) return null;
  return (
    <img
      src={iconUrl(platform.slug)}
      alt=""
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
  );
}
