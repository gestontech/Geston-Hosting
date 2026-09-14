import { createPortal } from "react-dom";
  import { useNavigate } from "react-router";
  import { X, LogIn, UserPlus, Lock } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { useEffect } from "react";
  import { lockScroll, unlockScroll } from "@/lib/scrollLock";

  interface GuestGuardModalProps {
    open: boolean;
    onClose: () => void;
    message?: string;
  }

  export function GuestGuardModal({ open, onClose, message }: GuestGuardModalProps) {
    const navigate = useNavigate();

    useEffect(() => {
      if (open) {
        lockScroll();
        return () => unlockScroll();
      }
    }, [open]);

    if (!open) return null;

    return createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1.5">Sign In Required</h3>
              <p className="text-sm text-muted-foreground">
                {message || "Please log in or sign up to access this feature."}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button
                className="w-full"
                onClick={() => { onClose(); navigate("/signup"); }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Free Account
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { onClose(); navigate("/login"); }}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Log In
              </Button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }
  