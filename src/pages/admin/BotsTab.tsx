import { Button } from "@/components/ui/button";
import type { AdminBot } from "@/types";
import {
  Search, RefreshCw, Loader2, FileText, Square, Play, RotateCcw, Trash2,
} from "lucide-react";
import { formatDate } from "./shared";
import { getAdminBotLogs, stopAdminBot, startAdminBot, restartAdminBot } from "@/lib/api";

interface BotsTabProps {
  botSearch: string;
  setBotSearch: (v: string) => void;
  bots: AdminBot[];
  loading: Record<string, boolean>;
  fetchData: (key: string) => void;
  handleAction: (key: string, fn: () => Promise<unknown>, onSuccess?: () => void) => Promise<void>;
  setAdminLogsBot: (v: string) => void;
  setAdminLogsRefreshing: (v: boolean) => void;
  setAdminLogsOpen: (v: boolean) => void;
  setAdminLogs: (v: string[]) => void;
  setDeleteBotModal: (v: { open: boolean; id: string; name: string }) => void;
}

export function BotsTab({
  botSearch,
  setBotSearch,
  bots,
  loading,
  fetchData,
  handleAction,
  setAdminLogsBot,
  setAdminLogsRefreshing,
  setAdminLogsOpen,
  setAdminLogs,
  setDeleteBotModal,
}: BotsTabProps) {
  const filtered = bots.filter(b => {
    const q = botSearch.toLowerCase();
    if (!q) return true;
    return (
      b.herokuAppName.toLowerCase().includes(q) ||
      b.phoneNumber.includes(q) ||
      b.ownerEmail.toLowerCase().includes(q) ||
      (b.ownerUsername || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by app name, phone, owner..."
            value={botSearch}
            onChange={e => setBotSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData("bots")} className="gap-1.5 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>
      {loading["bots"] ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.map(b => (
        <div key={b._id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium truncate">{b.herokuAppName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {b.ownerEmail === "unknown" ? "⚠️ Owner account deleted" : `${b.ownerUsername ? `@${b.ownerUsername}` : "N/A"} · ${b.ownerEmail}`}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                    b.status === "running" ? "bg-green-400/10 text-green-400" :
                    b.status === "stopped" ? "bg-yellow-400/10 text-yellow-400" :
                    b.status === "expired" ? "bg-red-400/10 text-red-400" :
                    "bg-gray-400/10 text-gray-400"
                  }`}>{b.status}</span>
                  {(b as unknown as { templateName?: string }).templateName && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/15 text-teal-400 border border-teal-500/20">{(b as unknown as { templateName?: string }).templateName}</span>
                  )}
                  <span className="text-xs text-muted-foreground">Expires: {formatDate(b.expiresAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" title="Logs" onClick={async () => {
                setAdminLogsBot(b.herokuAppName);
                setAdminLogsRefreshing(true);
                setAdminLogsOpen(true);
                try {
                  const r = await getAdminBotLogs(b._id) as { logs?: string[] };
                  setAdminLogs(r.logs || []);
                } catch {}
                setAdminLogsRefreshing(false);
              }}>
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" title="Stop" onClick={() => handleAction(`stop-${b._id}`, () => stopAdminBot(b._id), () => fetchData("bots"))} disabled={loading[`stop-${b._id}`]}>
                {loading[`stop-${b._id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="outline" title="Start" onClick={() => handleAction(`start-${b._id}`, () => startAdminBot(b._id), () => fetchData("bots"))} disabled={loading[`start-${b._id}`]}>
                {loading[`start-${b._id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="outline" title="Restart" onClick={() => handleAction(`restart-${b._id}`, () => restartAdminBot(b._id), () => fetchData("bots"))} disabled={loading[`restart-${b._id}`]}>
                {loading[`restart-${b._id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300 hover:bg-red-400/10" title="Delete" onClick={() => setDeleteBotModal({ open: true, id: b._id, name: b.herokuAppName })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
