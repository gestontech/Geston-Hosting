import { Button } from "@/components/ui/button";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Loader2, Trash2 } from "lucide-react";
import { formatDate } from "./shared";
import { deleteAdminPanel } from "@/lib/api";

export interface AdminPanel {
  _id: string;
  planName: string;
  panelUsername: string;
  panelLoginUrl: string;
  purchasedAt: string;
  ownerEmail: string;
  ownerUsername?: string;
  txCost: number;
}

interface PanelsTabProps {
  adminPanels: AdminPanel[];
  loading: Record<string, boolean>;
  deletePanelModal: { open: boolean; id: string; name: string };
  setDeletePanelModal: (v: { open: boolean; id: string; name: string }) => void;
  setAdminPanels: React.Dispatch<React.SetStateAction<AdminPanel[]>>;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function PanelsTab({
  adminPanels,
  loading,
  deletePanelModal,
  setDeletePanelModal,
  setAdminPanels,
  showToast,
}: PanelsTabProps) {
  return (
    <div className="space-y-3">
      {loading["panels"] ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : adminPanels.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No panels found</div>
      ) : (
        <div className="space-y-2">
          {adminPanels.map(p => (
            <div key={p._id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{p.planName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.ownerEmail}{p.ownerUsername ? ` (@${p.ownerUsername})` : ""}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="font-mono text-teal-400">{p.panelUsername}</span>
                    <span>{p.txCost} Coins</span>
                    <span>{formatDate(p.purchasedAt)}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10 shrink-0"
                  onClick={() => setDeletePanelModal({ open: true, id: p._id, name: p.planName })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <DeleteConfirmModal
        isOpen={deletePanelModal.open}
        onClose={() => setDeletePanelModal({ open: false, id: "", name: "" })}
        onConfirm={async () => {
          try {
            await deleteAdminPanel(deletePanelModal.id);
            setAdminPanels(prev => prev.filter(p => p._id !== deletePanelModal.id));
            showToast("Panel deleted", "success");
          } catch { showToast("Failed to delete", "error"); }
          finally { setDeletePanelModal({ open: false, id: "", name: "" }); }
        }}
        title="Delete Panel Record"
        description={`Remove "${deletePanelModal.name}" panel record from DB. Pterodactyl account is NOT deleted.`}
      />
    </div>
  );
}
