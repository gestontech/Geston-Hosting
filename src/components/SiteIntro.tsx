import { useEffect, useState } from "react";

const STORAGE_KEY = "tx_intro_seen_v2";
const HOLD_MS = 2600;
const FADE_MS = 550;

export function SiteIntro() {
  const [phase, setPhase] = useState<"idle" | "show" | "out" | "done">("idle");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setPhase("done");
        return;
      }
    } catch {
      setPhase("done");
      return;
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      setPhase("done");
      return;
    }

    setPhase("show");
    document.body.style.overflow = "hidden";

    const t1 = window.setTimeout(() => setPhase("out"), HOLD_MS);
    const t2 = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      document.body.style.overflow = "";
      setPhase("done");
    }, HOLD_MS + FADE_MS);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.body.style.overflow = "";
    };
  }, []);

  const skip = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    document.body.style.overflow = "";
    setPhase("done");
  };

  useEffect(() => {
    if (phase !== "show" && phase !== "out") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "idle" || phase === "done") return null;

  return (
    <div
      role="dialog"
      aria-label="Welcome"
      onClick={skip}
      className={`tx-intro fixed inset-0 z-[200] flex items-center justify-center cursor-pointer transition-opacity ${
        phase === "out" ? "opacity-0 duration-500" : "opacity-100 duration-200"
      }`}
    >
      <div className="tx-intro-grid" aria-hidden="true" />
      <div className="tx-intro-glow" aria-hidden="true" />

      <div className="relative flex flex-col items-center gap-6 px-6">
        <div className="tx-intro-stage" aria-hidden="true">
          <div className="tx-intro-logo">
            <img
              src="/logo/icon.png"
              alt=""
              width={72}
              height={72}
              className="object-contain relative z-[1]"
              draggable={false}
            />
          </div>
          <div className="tx-intro-ring tx-intro-ring-a" />
          <div className="tx-intro-ring tx-intro-ring-b" />
        </div>

        <div className="text-center space-y-1.5 tx-intro-title">
          <p className="text-xl font-semibold tracking-tight text-white">Geston Hosting</p>
          <p className="text-sm text-white/50 max-w-[260px] leading-snug mx-auto">
            Bots, panels and growth tools, spinning up now
          </p>
        </div>

        <div className="tx-intro-chips">
          <span className="tx-intro-chip" style={{ animationDelay: "120ms" }}>Bots</span>
          <span className="tx-intro-chip" style={{ animationDelay: "260ms" }}>Panels</span>
          <span className="tx-intro-chip" style={{ animationDelay: "400ms" }}>Boosting</span>
          <span className="tx-intro-chip" style={{ animationDelay: "540ms" }}>Dashboard</span>
        </div>
      </div>

      <p className="absolute bottom-10 text-[11px] tracking-wide text-white/35 uppercase">
        Tap to continue
      </p>
    </div>
  );
}
