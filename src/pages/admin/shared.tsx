import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard, Users, Bot, CreditCard, Gift, UsersRound, TrendingUp, Code2,
  Server, Youtube, Coins, MessageCircle, Shield, Settings2, Database, Ban, Radio,
  RotateCcw,
} from "lucide-react";

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type TabKey =
  | "overview" | "users" | "bots" | "transactions" | "coupons" | "referrals"
  | "config" | "database" | "bot-templates" | "panel-plans" | "panels"
  | "tutorials" | "revenue" | "notifications" | "moderators" | "smp" | "api"
  | "disable" | "connections" | "tx-retrieval";

export const NAV_ITEMS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { key: "bots", label: "Bots", icon: <Bot className="w-4 h-4" /> },
  { key: "connections", label: "Connections", icon: <Radio className="w-4 h-4" /> },
  { key: "transactions", label: "Transactions", icon: <CreditCard className="w-4 h-4" /> },
  { key: "tx-retrieval", label: "Coins Retrieval", icon: <RotateCcw className="w-4 h-4" /> },
  { key: "coupons", label: "Coupons", icon: <Gift className="w-4 h-4" /> },
  { key: "referrals", label: "Referrals", icon: <UsersRound className="w-4 h-4" /> },
  { key: "bot-templates", label: "Bot Templates", icon: <Bot className="w-4 h-4" /> },
  { key: "smp", label: "SMP", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "api", label: "API", icon: <Code2 className="w-4 h-4" /> },
  { key: "panel-plans", label: "Panel Plans", icon: <Server className="w-4 h-4" /> },
  { key: "panels", label: "Panels", icon: <Server className="w-4 h-4" /> },
  { key: "tutorials", label: "Tutorials", icon: <Youtube className="w-4 h-4" /> },
  { key: "revenue", label: "Revenue", icon: <Coins className="w-4 h-4" /> },
  { key: "notifications", label: "Broadcasts", icon: <MessageCircle className="w-4 h-4" /> },
  { key: "moderators", label: "Moderators", icon: <Shield className="w-4 h-4" /> },
  { key: "config", label: "Config", icon: <Settings2 className="w-4 h-4" /> },
  { key: "disable", label: "Disable", icon: <Ban className="w-4 h-4" /> },
  { key: "database", label: "Database", icon: <Database className="w-4 h-4" /> },
];

export function StatCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</span>
          <div className="text-muted-foreground opacity-60">{icon}</div>
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
