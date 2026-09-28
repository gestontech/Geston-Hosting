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
  showToast: (
    msg: string,
    type?: "success" | "error" | "info",
  ) => void;
}

const TYPE_LABELS: Record<string, string> = {
  deploy: "Déploiement",
  renew: "Renouvellement",
  panel: "Panel",
  boost: "Boost",
  topup: "Ancienne recharge",
  refund: "Ancien remboursement",
  admin_grant: "Ancienne opération admin",
};

const STATUS_LABELS: Record<string, string> = {
  success: "Réussie",
  pending: "En attente",
  failed: "Échouée",
};

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
  const allSelected =
    transactions.length > 0 &&
    selectedTxIds.length === transactions.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
          onClick={async () => {
            try {
              const result = (await resolveStaleTransactions()) as {
                resolved?: number;
                updated?: number;
              };

              const count =
                result.resolved ?? result.updated ?? 0;

              showToast(
                `${count} opération(s) bloquée(s) résolue(s)`,
                "success",
              );

              fetchData("transactions");
            } catch {
              showToast(
                "Échec de la résolution des opérations bloquées",
                "error",
              );
            }
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
            onClick={() => setConfirmBulkDeleteTx(true)}
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
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => {
                      setSelectedTxIds(
                        event.target.checked
                          ? transactions.map(
                              (transaction: Transaction) =>
                                transaction._id,
                            )
                          : [],
                      );
                    }}
                    aria-label="Sélectionner toutes les opérations"
                  />
                </th>

                <th className="text-left p-3 font-medium">
                  Opération
                </th>

                <th className="text-left p-3 font-medium">
                  Utilisateur
                </th>

                <th className="text-left p-3 font-medium">
                  Statut
                </th>

                <th className="text-left p-3 font-medium">
                  Date
                </th>

                <th className="p-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading["transactions"] ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Aucune opération enregistrée.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => {
                  const userId = (
                    transaction as unknown as {
                      userId?: string;
                    }
                  ).userId;

                  const ownerEmail = (
                    transaction as unknown as {
                      ownerEmail?: string;
                    }
                  ).ownerEmail;

                  const isSelected =
                    selectedTxIds.includes(transaction._id);

                  return (
                    <tr
                      key={transaction._id}
                      className="border-b hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => {
                            setSelectedTxIds((previous) =>
                              event.target.checked
                                ? [
                                    ...previous,
                                    transaction._id,
                                  ]
                                : previous.filter(
                                    (id) =>
                                      id !== transaction._id,
                                  ),
                            );
                          }}
                          aria-label={`Sélectionner ${transaction._id}`}
                        />
                      </td>

                      <td className="p-3">
                        <span className="font-medium">
                          {TYPE_LABELS[transaction.type] ||
                            transaction.type.replace("_", " ")}
                        </span>

                        {transaction.type === "topup" ||
                        transaction.type === "refund" ||
                        transaction.type === "admin_grant" ? (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Ancienne opération financière
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Service gratuit
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="text-xs">
                          {ownerEmail || "N/A"}
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            transaction.status === "success"
                              ? "bg-green-400/10 text-green-400"
                              : transaction.status === "pending"
                                ? "bg-yellow-400/10 text-yellow-400"
                                : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {STATUS_LABELS[transaction.status] ||
                            transaction.status}
                        </span>
                      </td>

                      <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(transaction.createdAt)}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {userId && (
                            <button
                              onClick={() => {
                                const user = users.find(
                                  (item: AdminUser) =>
                                    item._id === userId,
                                );

                                if (user) {
                                  openUserPanel(user);
                                  setBanModalOpen(true);
                                }
                              }}
                              className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                              title="Gérer l'utilisateur"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setConfirmDeleteTx({
                                open: true,
                                id: transaction._id,
                              })
                            }
                            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                            title="Supprimer l'opération"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
