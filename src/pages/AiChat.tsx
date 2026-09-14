import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { TechBackground } from "@/components/TechBackground";
import { ArrowLeft, Loader2, Send, Sparkles } from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; text: string };

async function sendAiMessage(message: string): Promise<{ reply: string }> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Chat failed");
  return data as { reply: string };
}

export function AiChat() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Welcome to Geston Hosting AI support. Ask about Coins top-ups, panel plans, bot deploy, boosting, or payments.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
          text: "Sorry, I couldn't reply right now. Try again shortly or use Contact Support.",
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-background relative flex flex-col overflow-hidden">
      <TechBackground />
      <header className="border-b border-border shrink-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight">AI Support</h1>
            <p className="text-[11px] text-muted-foreground truncate">Live prices · feature flags</p>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-3xl w-full mx-auto px-4 flex flex-col relative z-[1]">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 py-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user"
                  ? "ml-4 sm:ml-8 rounded-2xl bg-teal-500/15 border border-teal-500/20 px-4 py-3 text-sm whitespace-pre-wrap break-words"
                  : "mr-4 sm:mr-8 rounded-2xl bg-card border border-border px-4 py-3 text-sm text-muted-foreground whitespace-pre-wrap break-words"
              }
            >
              {msg.text}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking…
            </div>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>

        <div className="shrink-0 border-t border-border pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-sm">
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask a question…"
              className="flex-1 min-w-0 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-teal-500/40"
              disabled={busy}
              autoComplete="off"
              enterKeyHint="send"
            />
            <Button onClick={() => void send()} disabled={busy || !input.trim()} className="px-4 h-11 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center px-2">
            For account changes use the dashboard. Ask for a live agent if you need a human.
          </p>
        </div>
      </main>
    </div>
  );
}
