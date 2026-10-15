import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/types";
import { Shield, Loader2, RefreshCw } from "lucide-react";
import { promoteToModerator } from "@/lib/api";

interface ModeratorsTabProps {
  users: AdminUser[];
  loading: Record<string, boolean>;
  handleAction: (key: string, fn: () => Promise<unknown>, onSuccess?: () => void) => Promise<void>;
  fetchData: (key: string) => void;
}

export function ModeratorsTab({
  users,
  loading,
  handleAction,
  fetchData,
}: ModeratorsTabProps) {
  const mods = users.filter(u => u.isModerator);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold">Moderators</h2>
      </div>
      <p className="text-sm text-muted-foreground">Moderators can bypass maintenance mode and assist with platform management. Promoting a user grants them +100 Coins.</p>
      {loading["moderators"] ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {mods.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No moderators yet. Promote a user from the Users tab.</div>
          )}
          {mods.map(u => (
            <div key={u._id} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-blue-400 uppercase">
                    {(u.username || u.email)[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{u.username ? `@${u.username}` : u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-teal-400">{u.txCoins} Coins</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 shrink-0"
                  onClick={() => handleAction("Demote", () => promoteToModerator(u._id), () => { fetchData("moderators"); })}
                  disabled={loading["Demote"]}
                >
                  {loading["Demote"] ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Shield className="w-3.5 h-3.5 mr-1" />}
                  Demote
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="pt-2">
        <Button size="sm" variant="outline" onClick={() => fetchData("moderators")} disabled={loading["moderators"]}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading["moderators"] ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
