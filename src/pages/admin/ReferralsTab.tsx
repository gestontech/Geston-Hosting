import { Button } from "@/components/ui/button";
import type { Referral } from "@/types";
import { Trash2, Loader2 } from "lucide-react";
import { formatDate } from "./shared";

interface ReferralsTabProps {
  referrals: Referral[];
  loading: Record<string, boolean>;
  setConfirmDeleteAllReferrals: (v: boolean) => void;
}

export function ReferralsTab({
  referrals,
  loading,
  setConfirmDeleteAllReferrals,
}: ReferralsTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="text-red-400 border-red-400/30 hover:bg-red-400/10"
          onClick={async () => {
            setConfirmDeleteAllReferrals(true);
          }}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete All
        </Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Referrer</th>
                <th className="text-left p-3 font-medium">Referred</th>
                <th className="text-left p-3 font-medium">Coins Rewarded</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading["referrals"] ? (
                <tr><td colSpan={4} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : referrals.map(r => (
                <tr key={r._id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium text-xs">{r.referrerUsername ? `@${r.referrerUsername}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{r.referrerEmail}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-xs">{r.referredUsername ? `@${r.referredUsername}` : ""}</div>
                    <div className="text-xs text-muted-foreground">{r.referredEmail}</div>
                  </td>
                  <td className="p-3 text-teal-400 font-medium">{r.txRewarded}</td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
