import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { X, BookOpen } from "lucide-react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

interface TutorialOverlayProps {
  userId: string;
  onClose: () => void;
}

export function TutorialOverlay({ userId, onClose }: TutorialOverlayProps) {
  const navigate = useNavigate();

  useEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);

  const handleOpenTutorials = () => {
    markSeen();
    onClose();
    navigate("/tutorials");
  };

  const handleSkip = () => {
    markSeen();
    onClose();
  };

  function markSeen() {
    try { localStorage.setItem(`tutorialSeen_${userId}`, "1"); } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-base">Welcome to GESTONX! 🎉</h3>
          <button onClick={handleSkip} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get the most out of the platform by watching our quick setup tutorials. They cover bot deployment, session setup, top-ups, and more.
          </p>
        </div>

        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleOpenTutorials}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            Open Tutorials
          </button>
        </div>
      </div>
    </div>
  );
}

export function useTutorialOverlay(userId: string | undefined) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      const seen = localStorage.getItem(`tutorialSeen_${userId}`);
      if (!seen) setShow(true);
    } catch {}
  }, [userId]);

  const close = () => setShow(false);
  return { show, close };
}
