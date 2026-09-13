import { useState, useRef } from "react";
import { Copy, CheckCheck } from "lucide-react";

export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy"}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 ${
        copied
          ? "border-green-500/60 bg-green-500/15 text-green-400 scale-95"
          : "border-border bg-muted/50 text-muted-foreground hover:border-border/80 hover:bg-muted hover:text-foreground active:scale-95"
      } ${className}`}
    >
      {copied
        ? <CheckCheck className="w-3.5 h-3.5" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
