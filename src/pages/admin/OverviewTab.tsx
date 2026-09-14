import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminStats } from "@/types";
import {
  Users, Bot, Coins, CreditCard, ShoppingBag, Play, Gift, UsersRound,
  Server, AlertCircle, Loader2, RefreshCw, Trash2,
} from "lucide-react";
import { StatCard } from "./shared";

interface OverviewTabProps {
  stats: AdminStats | null;
  adminPanelsLength: number;
  orphanApps: string[];
  orphanLoading: boolean;
  orphanFetched: boolean;
  fetchOrphanApps: () => void;
  handleDeleteOrphan: (appName: string) => void;
}

export function OverviewTab({
  stats,
  adminPanelsLength,
  orphanApps,
  orphanLoading,
  orphanFetched,
  fetchOrphanApps,
  handleDeleteOrphan,
}: OverviewTabProps) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Users" value={stats?.totalUsers ?? 0} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Bots" value={stats?.totalBots ?? 0} icon={<Bot className="w-5 h-5" />} />
        <StatCard title="Active Bots" value={stats?.activeBots ?? 0} icon={<Play className="w-5 h-5" />} />
        <StatCard title="Coins Circulation" value={stats?.totalTxInCirculation ?? 0} icon={<Coins className="w-5 h-5" />} />
        <StatCard title="Revenue (KES)" value={stats?.totalRevenue ?? 0} icon={<CreditCard className="w-5 h-5" />} />
        <StatCard title="Transactions" value={stats?.totalTransactions ?? 0} icon={<ShoppingBag className="w-5 h-5" />} />
        <StatCard title="Coupons" value={stats?.totalCoupons ?? 0} icon={<Gift className="w-5 h-5" />} />
        <StatCard title="Referrals" value={stats?.totalReferrals ?? 0} icon={<UsersRound className="w-5 h-5" />} />
        <StatCard title="Panels" value={(stats as { totalPanels?: number })?.totalPanels ?? adminPanelsLength} icon={<Server className="w-5 h-5" />} />
      </div>
      <div className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              Orphan Apps
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Apps deployed externally that don't belong to any user in the database</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={fetchOrphanApps} disabled={orphanLoading} size="sm">
              {orphanLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {orphanFetched ? "Refresh" : "Scan for Orphan Apps"}
            </Button>
            {orphanFetched && (
              orphanApps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orphan apps found.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{orphanApps.length} orphan app{orphanApps.length !== 1 ? "s" : ""} found</p>
                  {orphanApps.map(app => (
                    <div key={app} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                      <span className="font-mono text-sm">{app}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-500/30"
                        onClick={() => handleDeleteOrphan(app)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
