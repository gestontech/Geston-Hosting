import { Button } from "@/components/ui/button";
import type { Transaction, AdminUser } from "@/types";
import { Clock, Trash2, Loader2, Ban } from "lucide-react";
import { resolveStaleTransactions } from "@/lib/api";
import { formatDate } from "./shared";

interface TransactionsTabProps {
  transactions: Transaction[];
  selectedTxIds: string[];
  setSelectedTxIds: React.Dispatch<React.SetStateAction<string[]>>;
  loading: Record<string, boolean>;
  fetchData: (key: string) => void;
  setConfirmBulkDeleteTx: (v: boolean) => void;
  setConfirmDeleteTx: (v: { open: boolean; id: string } | null) => void;
  users: AdminUser[];
  openUserPanel: (u: AdminUser) => void;
  setBanModalOpen: (v: boolean) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function TransactionsTab({
  transactions,
  selectedTxIds,
  setSelectedTxIds,
  loading,
  fetchData,
  setConfirmBulkDeleteTx,
  setConfirmDeleteTx,
  users,
  openUserPanel,
  setBanModalOpen,
  showToast,
}: TransactionsTabProps) {
  return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
                  onClick={async () => {
                    try {
                      const r = await resolveStaleTransactions() as { resolved?: number };
                      showToast(`${r.resolved ?? 0} transactions bloquées résolues`, "success");
                      fetchData("transactions");
                    } catch { showToast("Échec de la résolution des transactions bloquées", "error"); }
                  }}
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Résoudre les bloquées
                </Button>
                {selectedTxIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                    onClick={async () => {
                      setConfirmBulkDeleteTx(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Supprimer la sélection ({selectedTxIds.length})
                  </Button>
                )}
              </div>
              <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 w-8">
                        <input type="checkbox" checked={selectedTxIds.length === transactions.length && transactions.length > 0}
                          onChange={e => setSelectedTxIds(e.target.checked ? transactions.map((t: Transaction) => t._id) : [])} />
                      </th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Coins</th>
                      <th className="text-left p-3 font-medium">Montant</th>
                      <th className="text-left p-3 font-medium">Pays</th>
                      <th className="text-left p-3 font-medium">Utilisateur</th>
                      <th className="text-left p-3 font-medium">Statut</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="p-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading["transactions"] ? (
                      <tr><td colSpan={9} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                    ) : transactions.map(t => {
                      const isCredit = t.type === "admin_grant" || t.type === "topup" || t.type === "refund" || t.type === "panel";
                      return (
                        <tr key={t._id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <input type="checkbox" checked={selectedTxIds.includes(t._id)}
                              onChange={e => setSelectedTxIds(prev => e.target.checked ? [...prev, t._id] : prev.filter(id => id !== t._id))} />
                          </td>
                          <td className="p-3 capitalize">{({ topup: "Recharge", deploy: "Déploiement", panel: "Panel", renew: "Renouvellement", refund: "Remboursement", admin_grant: "Crédit admin", boost: "Boost" } as Record<string, string>)[t.type] || t.type.replace("_", " ")}</td>
                          <td className="p-3 font-medium">
                            {t.status === "failed" ? <span className="text-red-400">Échouée</span>
                             : t.status === "pending" ? <span className="text-yellow-400">En attente</span>
                             : <span className={isCredit ? "text-green-400" : "text-red-400"}>{(isCredit ? "+" : "-") + Math.abs(t.txAmount)}</span>}
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-medium">
                              {(t as unknown as { localCurrency?: string }).localCurrency || "KES"}{" "}
                              {((t as unknown as { localAmount?: number }).localAmount ?? t.ksAmount)?.toLocaleString?.() ?? t.ksAmount}
                            </div>
                            <div className="text-[10px] text-muted-foreground">≈ KES {t.ksAmount}</div>
                          </td>
                          <td className="p-3 text-xs capitalize text-muted-foreground">{(t as unknown as { paystackCountry?: string }).paystackCountry || "kenya"}</td>
                          <td className="p-3 text-xs text-muted-foreground">{(t as unknown as { ownerEmail?: string }).ownerEmail || "N/A"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              t.status === "success" ? "bg-green-400/10 text-green-400" :
                              t.status === "pending" ? "bg-yellow-400/10 text-yellow-400" :
                              "bg-red-400/10 text-red-400"
                            }`}>{({ success: "Réussie", pending: "En attente", failed: "Échouée" } as Record<string, string>)[t.status] || t.status}</span>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(t.createdAt)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                {(t as unknown as { userId?: string }).userId && (
                                  <button
                                    onClick={() => {
                                      const u = users.find((u: AdminUser) => u._id === (t as unknown as { userId: string }).userId);
                                      if (u) { openUserPanel(u); setBanModalOpen(true); }
                                    }}
                                    className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                                    title="Bannir l'utilisateur"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirmDeleteTx({ open: true, id: t._id })}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                                  title="Supprimer la transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>

  );
}
