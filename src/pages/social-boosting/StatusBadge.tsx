import type { ReactElement } from "react";
import { CheckCircle2, Loader2, Clock, XCircle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: ReactElement; className: string }> = {
    completed: { icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-green-500/10 text-green-400" },
    processing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, className: "bg-blue-500/10 text-blue-400" },
    pending: { icon: <Clock className="w-3 h-3" />, className: "bg-amber-500/10 text-amber-400" },
    partial: { icon: <Clock className="w-3 h-3" />, className: "bg-amber-500/10 text-amber-400" },
    failed: { icon: <XCircle className="w-3 h-3" />, className: "bg-red-500/10 text-red-400" },
    refunded: { icon: <XCircle className="w-3 h-3" />, className: "bg-red-500/10 text-red-400" },
  };
  const cfg = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${cfg.className}`}>
      {cfg.icon}{status}
    </span>
  );
}

