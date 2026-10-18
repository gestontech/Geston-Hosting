import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Loader2, RefreshCw } from "lucide-react";

interface RevenueCountry {
  name: string;
  flag: string;
  count: number;
  currency: string;
  amount: number;
  amountKes: number;
  amountUsd: number;
}

interface RevenueData {
  countries: RevenueCountry[];
  totalKes: number;
  totalUsd: number;
}

interface RevenueTabProps {
  revenueData: RevenueData | null;
  loading: Record<string, boolean>;
  fetchData: (key: string) => void;
}

export function RevenueTab({
  revenueData,
  loading,
  fetchData,
}: RevenueTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-bold">Revenue Breakdown</h2>
      </div>
      {loading["revenue"] ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !revenueData ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No revenue data available</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {revenueData.countries.map(c => (
              <Card key={c.name}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{c.flag}</span>
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} transaction{c.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Local ({c.currency})</span>
                      <span className="font-mono text-sm font-semibold">{c.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">In KES</span>
                      <span className="font-mono text-sm text-blue-400">KES {c.amountKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">In USD</span>
                      <span className="font-mono text-sm text-green-400">${c.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Total Revenue (all countries)</p>
              <div className="flex flex-col sm:flex-row gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">KES Equivalent</p>
                  <p className="text-2xl font-bold text-blue-400">KES {revenueData.totalKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">USD Equivalent</p>
                  <p className="text-2xl font-bold text-green-400">${revenueData.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Rates: 1 USD = KES 130 · 1 USD = NGN 1,500 · 1 USD = XAF 600</p>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => fetchData("revenue")} disabled={loading["revenue"]}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading["revenue"] ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
