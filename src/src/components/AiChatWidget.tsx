import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

type ChatMsg = { role: "user" | "assistant"; text: string };

async function sendAiMessage(message: string): Promise<{ reply: string; requestLiveAgent?: boolean }> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Chat failed");
  return data as { reply: string; requestLiveAgent?: boolean };
}

/**
 * AI agent chat bubble. This is intentionally NOT mounted globally anymore —
 * it only appears on the Tutorials page, styled as a clear "Talk to our AI
 * agent" bot avatar rather than a generic floating chat icon.
 */
export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Hi — I'm the GESTONX AI agent. Ask about panels, bots, boosting, or payments.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const close = () => setOpen(false);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const data = await sendAiMessage(text);
      setMessages((m) => [...m, { role: "assistant", text: data.reply || "No response." }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Sorry, I couldn't reply right now. Try again or open Contact Support.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[115] bg-black/50 backdrop-blur-[2px]"
          onClick={close}
          aria-hidden
        />
      )}
      {open && (
        <div className="fixed bottom-24 right-4 z-[120] w-[min(100vw-2rem,22rem)] h-[min(70vh,28rem)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-count-pop">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/40 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                <img src="/logo/icon.png" alt="" className="w-4 h-4 object-contain" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-card" />
              </div>
              <span className="text-sm font-semibold">AI Agent</span>
            </div>
            <button
              type="button"
              onClick={close}
              className="p-1.5 rounded-lg hover:bg-muted"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 overscroll-contain">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? "ml-6 rounded-xl bg-blue-500/15 border border-blue-500/20 px-3 py-2 text-sm"
                    : "mr-6 rounded-xl bg-muted/60 border border-border/60 px-3 py-2 text-sm text-muted-foreground"
                }
              >
                {msg.text}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-2 border-t border-border flex gap-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask about panels, bots…"
              className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/40"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 z-[120] flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-lg shadow-blue-500/30 pl-2.5 pr-4 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0"
          aria-label="Talk to our AI agent"
        >
          <span className="relative w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <img src="/logo/icon.png" alt="" className="w-5 h-5 object-contain animate-bob" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
          </span>
          <span>Talk to our AI agent</span>
        </button>
      )}
    </>
  );
}
