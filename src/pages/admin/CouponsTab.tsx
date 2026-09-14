import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Coupon } from "@/types";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { formatDate } from "./shared";

interface CouponsTabProps {
  couponCode: string;
  setCouponCode: (v: string) => void;
  couponTx: string;
  setCouponTx: (v: string) => void;
  handleCreateCoupon: () => void;
  loading: Record<string, boolean>;
  coupons: Coupon[];
  setDeleteCouponModal: (v: { open: boolean; id: string; code: string }) => void;
}

export function CouponsTab({
  couponCode,
  setCouponCode,
  couponTx,
  setCouponTx,
  handleCreateCoupon,
  loading,
  coupons,
  setDeleteCouponModal,
}: CouponsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Coupon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Code</Label>
              <Input placeholder="e.g., WELCOME2024" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} maxLength={20} />
            </div>
            <div>
              <Label>Coins Amount</Label>
              <Input type="number" placeholder="e.g., 10" value={couponTx} onChange={e => setCouponTx(e.target.value)} min={1} />
            </div>
          </div>
          <Button onClick={handleCreateCoupon} disabled={loading["createCoupon"]}>
            {loading["createCoupon"] ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-1" />}
            Create Coupon
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Coins</th>
                <th className="text-left p-3 font-medium">Claimed By</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading["coupons"] ? (
                <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : coupons.map(c => (
                <tr key={c._id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono font-medium">{c.code}</td>
                  <td className="p-3 text-teal-400 font-medium">{c.txAmount}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.claimedBy || <span className="text-green-400">Available</span>}</td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.createdAt)}</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300 h-7 px-2" onClick={() => setDeleteCouponModal({ open: true, id: c._id, code: c.code })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
