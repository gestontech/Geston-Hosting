import { Button } from "@/components/ui/button";
import { KeyRound, RefreshCw, Loader2 } from "lucide-react";

interface ApiTabProps {
  apiKeys: Array<Record<string, unknown>>;
  apiKeyStats: {
    totalKeys: number;
    activeKeys: number;
    totalCalls: number;
    totalBoostOrders: number;
  };
  loading: Record<string, boolean>;
  fetchData: (key: string) => void;
}

export function ApiTab({
  apiKeys,
  apiKeyStats,
  loading,
  fetchData,
}: ApiTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-teal-400" />
            Developer API Keys
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Active keys, usage, and boost orders placed via API (Coins)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData("api")} className="gap-2 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total keys", value: apiKeyStats.totalKeys },
          { label: "Active", value: apiKeyStats.activeKeys },
          { label: "Total calls", value: apiKeyStats.totalCalls },
          { label: "API boost orders", value: apiKeyStats.totalBoostOrders },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {loading["api"] ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No API keys generated yet.</div>
      ) : (
        <div className="space-y-2">
          {apiKeys.map((k) => (
            <div key={String(k.id)} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold">{String(k.email)}</p>
                  <p className="text-xs text-muted-foreground">@{String(k.username || "n/a")}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${k.active ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                  {k.active ? "Active" : "Paused"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <p><span className="text-muted-foreground">Prefix:</span> <span className="font-mono">{String(k.prefix || "—")}</span></p>
                <p><span className="text-muted-foreground">Calls:</span> {String(k.callCount)}</p>
                <p><span className="text-muted-foreground">Coins balance:</span> {String(k.txCoins)}</p>
                <p><span className="text-muted-foreground">Boost orders:</span> {String(k.boostOrders)} ({String(k.boostCompleted)} done)</p>
                <p><span className="text-muted-foreground">Created:</span> {k.createdAt ? new Date(String(k.createdAt)).toLocaleString() : "—"}</p>
                <p><span className="text-muted-foreground">Last used:</span> {k.lastUsedAt ? new Date(String(k.lastUsedAt)).toLocaleString() : "Never"}</p>
                {k.isBanned ? <p className="text-red-400 font-medium">Banned</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
