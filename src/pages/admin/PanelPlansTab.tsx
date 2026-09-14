import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PanelPlan } from "@/types";
import { Plus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { createAdminPanelPlan } from "@/lib/api";

interface PanelPlansTabProps {
  panelPlans: PanelPlan[];
  newPlan: { name: string; description: string; txCost: string; ram: string; disk: string; cpu: string; isBestDeal: boolean };
  setNewPlan: React.Dispatch<React.SetStateAction<{ name: string; description: string; txCost: string; ram: string; disk: string; cpu: string; isBestDeal: boolean }>>;
  addingPlan: boolean;
  setAddingPlan: (v: boolean) => void;
  loading: Record<string, boolean>;
  fetchData: (key: string) => void;
  setDeletePlanModal: (v: { open: boolean; id: string; name: string }) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function PanelPlansTab({
  panelPlans,
  newPlan,
  setNewPlan,
  addingPlan,
  setAddingPlan,
  loading,
  fetchData,
  setDeletePlanModal,
  showToast,
}: PanelPlansTabProps) {
  return (
<div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Panel Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Plan Name</Label>
                    <Input placeholder="e.g. Starter" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Coins Cost</Label>
                    <Input type="number" placeholder="20" value={newPlan.txCost} onChange={e => setNewPlan(p => ({ ...p, txCost: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">RAM</Label>
                    <Input placeholder="512MB" value={newPlan.ram} onChange={e => setNewPlan(p => ({ ...p, ram: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Disk</Label>
                    <Input placeholder="2GB" value={newPlan.disk} onChange={e => setNewPlan(p => ({ ...p, disk: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">CPU</Label>
                    <Input placeholder="1" value={newPlan.cpu} onChange={e => setNewPlan(p => ({ ...p, cpu: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1.5 block">Description</Label>
                    <Input placeholder="Perfect for small projects" value={newPlan.description} onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="unlimited-plan"
                      checked={newPlan.ram.toLowerCase().trim() === "unlimited" && newPlan.disk.toLowerCase().trim() === "unlimited" && newPlan.cpu.toLowerCase().trim() === "unlimited"}
                      onChange={e => setNewPlan(p => (e.target.checked ? { ...p, ram: "Unlimited", disk: "Unlimited", cpu: "Unlimited" } : { ...p, ram: "512MB", disk: "2GB", cpu: "1" }))}
                      className="w-4 h-4 rounded accent-teal-500"
                    />
                    <label htmlFor="unlimited-plan" className="text-sm">Unlimited Plan (no CPU/RAM/Disk limits)</label>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input type="checkbox" id="best-deal" checked={newPlan.isBestDeal} onChange={e => setNewPlan(p => ({ ...p, isBestDeal: e.target.checked }))} className="w-4 h-4 rounded accent-teal-500" />
                    <label htmlFor="best-deal" className="text-sm">Mark as Best Deal</label>
                  </div>
                </div>
                <Button
                  disabled={addingPlan}
                  onClick={async () => {
                    if (!newPlan.name || !newPlan.txCost) { showToast("Fill all required fields", "error"); return; }
                    setAddingPlan(true);
                    try {
                      const res = await createAdminPanelPlan({ name: newPlan.name, description: newPlan.description, txCost: Number(newPlan.txCost), ram: newPlan.ram, disk: newPlan.disk, cpu: newPlan.cpu, isBestDeal: newPlan.isBestDeal }) as { ok?: boolean; error?: string };
                      if (res.error) { showToast(res.error, "error"); } else { showToast("Panel plan added!", "success"); setNewPlan({ name: "", description: "", txCost: "20", ram: "512MB", disk: "2GB", cpu: "1", isBestDeal: false }); fetchData("panel-plans"); }
                    } catch { showToast("Failed to add plan", "error"); }
                    setAddingPlan(false);
                  }}
                  className="gap-2"
                >
                  {addingPlan ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Adding...</> : <><Plus className="w-3.5 h-3.5" />Add Plan</>}
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{panelPlans.length} plans</p>
              <Button variant="outline" size="sm" onClick={() => fetchData("panel-plans")} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </Button>
            </div>

            {loading["panel-plans"] ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : panelPlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No panel plans yet.</div>
            ) : (
              <div className="space-y-3">
                {panelPlans.map(p => (
                  <div key={p._id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.isBestDeal && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-400 font-semibold">Best Deal</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      <p className="text-xs mt-0.5">RAM: {p.ram} · Disk: {p.disk} · CPU: {p.cpu} · <span className="text-teal-400 font-medium">{p.txCost} Coins</span></p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletePlanModal({ open: true, id: p._id, name: p.name })}
                      className="text-red-400 border-red-400/20 hover:bg-red-400/10 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

  );
}
