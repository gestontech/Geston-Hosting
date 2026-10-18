import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { LogViewer } from "@/components/LogViewer";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type { AdminUser, AdminBot } from "@/types";
import {
  Ban, CheckCircle, Loader2, Plus, Minus, Shield, Trash2, AlertCircle, Bell, RefreshCw,
} from "lucide-react";
import { formatDate } from "./shared";
import {
  banUser, unbanUser, grantTx, subtractTx, deleteUser, resetPassword,
  deleteAdminBot, deleteCoupon, deleteAdminTeam, deleteBotTemplate,
  deleteAdminTransaction, deleteAdminTransactionsBulk, deleteAllAdminReferrals,
  deleteAdminTutorial, deleteAdminPanelPlan, promoteToModerator,
  sendUserNotification, getAdminBotLogs,
} from "@/lib/api";

export interface AdminModalsProps {
  selectedUser: AdminUser | null;
  setSelectedUser: React.Dispatch<React.SetStateAction<AdminUser | null>>;
  userPanelOpen: boolean;
  closeUserPanel: () => void;
  banModalOpen: boolean;
  setBanModalOpen: (v: boolean) => void;
  banReason: string;
  setBanReason: (v: string) => void;
  txModalOpen: boolean;
  setTxModalOpen: (v: boolean) => void;
  txAmount: string;
  setTxAmount: (v: string) => void;
  subtractTxModalOpen: boolean;
  setSubtractTxModalOpen: (v: boolean) => void;
  subtractTxAmount: string;
  setSubtractTxAmount: (v: string) => void;
  pwModalOpen: boolean;
  setPwModalOpen: (v: boolean) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  deleteUserModalOpen: boolean;
  setDeleteUserModalOpen: (v: boolean) => void;
  notifyModalOpen: boolean;
  setNotifyModalOpen: (v: boolean) => void;
  notifyTitle: string;
  setNotifyTitle: (v: string) => void;
  notifyMessage: string;
  setNotifyMessage: (v: string) => void;
  loading: Record<string, boolean>;
  handleAction: (key: string, fn: () => Promise<unknown>, onSuccess?: () => void) => Promise<void>;
  fetchData: (key: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  deleteBotModal: { open: boolean; id: string; name: string };
  setDeleteBotModal: (v: { open: boolean; id: string; name: string }) => void;
  deleteCouponModal: { open: boolean; id: string; code: string };
  setDeleteCouponModal: (v: { open: boolean; id: string; code: string }) => void;
  deleteTeamModal: { open: boolean; id: string; name: string };
  setDeleteTeamModal: (v: { open: boolean; id: string; name: string }) => void;
  deleteTemplateModal: { open: boolean; id: string; name: string };
  setDeleteTemplateModal: (v: { open: boolean; id: string; name: string }) => void;
  confirmDeleteTx: { open: boolean; id: string } | null;
  setConfirmDeleteTx: (v: { open: boolean; id: string } | null) => void;
  confirmBulkDeleteTx: boolean;
  setConfirmBulkDeleteTx: (v: boolean) => void;
  selectedTxIds: string[];
  setSelectedTxIds: React.Dispatch<React.SetStateAction<string[]>>;
  confirmDeleteAllReferrals: boolean;
  setConfirmDeleteAllReferrals: (v: boolean) => void;
  confirmDeleteTutorial: { open: boolean; id: string } | null;
  setConfirmDeleteTutorial: (v: { open: boolean; id: string } | null) => void;
  setTutorials: React.Dispatch<React.SetStateAction<Array<{ _id: string; title: string; youtubeUrl: string; order: number }>>>;
  deletePlanModal: { open: boolean; id: string; name: string };
  setDeletePlanModal: (v: { open: boolean; id: string; name: string }) => void;
  adminLogsOpen: boolean;
  setAdminLogsOpen: (v: boolean) => void;
  adminLogs: string[];
  setAdminLogs: (v: string[]) => void;
  adminLogsBot: string;
  adminLogsRefreshing: boolean;
  setAdminLogsRefreshing: (v: boolean) => void;
  bots: AdminBot[];
}

export function AdminModals(props: AdminModalsProps) {
  const {
    selectedUser, setSelectedUser, userPanelOpen, closeUserPanel,
    banModalOpen, setBanModalOpen, banReason, setBanReason,
    txModalOpen, setTxModalOpen, txAmount, setTxAmount,
    subtractTxModalOpen, setSubtractTxModalOpen, subtractTxAmount, setSubtractTxAmount,
    pwModalOpen, setPwModalOpen, newPassword, setNewPassword,
    deleteUserModalOpen, setDeleteUserModalOpen,
    notifyModalOpen, setNotifyModalOpen, notifyTitle, setNotifyTitle, notifyMessage, setNotifyMessage,
    loading, handleAction, fetchData, showToast,
    deleteBotModal, setDeleteBotModal,
    deleteCouponModal, setDeleteCouponModal,
    deleteTeamModal, setDeleteTeamModal,
    deleteTemplateModal, setDeleteTemplateModal,
    confirmDeleteTx, setConfirmDeleteTx,
    confirmBulkDeleteTx, setConfirmBulkDeleteTx, selectedTxIds, setSelectedTxIds,
    confirmDeleteAllReferrals, setConfirmDeleteAllReferrals,
    confirmDeleteTutorial, setConfirmDeleteTutorial, setTutorials,
    deletePlanModal, setDeletePlanModal,
    adminLogsOpen, setAdminLogsOpen, adminLogs, setAdminLogs, adminLogsBot,
    adminLogsRefreshing, setAdminLogsRefreshing, bots,
  } = props;

  return (
    <>
      <Modal isOpen={userPanelOpen} onClose={closeUserPanel} title={`Gérer — ${selectedUser?.username ? `@${selectedUser.username}` : selectedUser?.email ?? ""}`} maxWidth="max-w-md">
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail</span>
                <span className="font-medium truncate ml-4">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solde de Coins</span>
                <span className="font-semibold text-teal-400">{selectedUser.txCoins} Coins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bots</span>
                <span>{selectedUser.botCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <span className={selectedUser.isBanned ? "text-red-400" : "text-green-400"}>
                  {selectedUser.isBanned ? "Banni" : "Actif"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inscrit le</span>
                <span className="text-xs">{formatDate(selectedUser.createdAt)}</span>
              </div>
            </div>

            {!banModalOpen && !txModalOpen && !subtractTxModalOpen && !pwModalOpen && !deleteUserModalOpen && !notifyModalOpen && (
              <div className="grid grid-cols-2 gap-2">
                {!selectedUser.isAdmin && (
                  selectedUser.isBanned ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                      onClick={() => handleAction("Unban", () => unbanUser(selectedUser._id), () => { fetchData("users"); setSelectedUser(prev => prev ? { ...prev, isBanned: false } : prev); })}
                      disabled={loading["Unban"]}
                    >
                      {loading["Unban"] ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                      Débannir
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setBanModalOpen(true)}>
                      <Ban className="w-3.5 h-3.5 mr-1" />Bannir l'utilisateur
                    </Button>
                  )
                )}
                <Button variant="outline" size="sm" onClick={() => setTxModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Ajouter des Coins
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSubtractTxModalOpen(true)}>
                  <Minus className="w-3.5 h-3.5 mr-1" />Retirer des Coins
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPwModalOpen(true)}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />Réinit. MDP
                </Button>
                <Button variant="outline" size="sm" onClick={() => setNotifyModalOpen(true)}>
                  <Bell className="w-3.5 h-3.5 mr-1" />Notifier
                </Button>
                {!selectedUser.isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={selectedUser.isModerator ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10" : "text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"}
                    onClick={() => handleAction(
                      selectedUser.isModerator ? "Demote" : "Promote",
                      () => promoteToModerator(selectedUser._id),
                      () => { fetchData("users"); setSelectedUser(prev => prev ? { ...prev, isModerator: !prev.isModerator } : prev); }
                    )}
                    disabled={loading["Demote"] || loading["Promote"]}
                  >
                    {(loading["Demote"] || loading["Promote"]) ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Shield className="w-3.5 h-3.5 mr-1" />}
                    {selectedUser.isModerator ? "Rétrograder" : "Nommer modérateur"}
                  </Button>
                )}
                {!selectedUser.isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 col-span-2"
                    onClick={() => setDeleteUserModalOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />Supprimer l'utilisateur
                  </Button>
                )}
              </div>
            )}

            {banModalOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                {selectedUser.isBanned ? (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400">
                    Cet utilisateur est déjà banni.
                  </div>
                ) : null}
                <p className="text-sm font-medium">Raison du bannissement (facultatif)</p>
                <Input placeholder="Raison du bannissement..." value={banReason} onChange={e => setBanReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setBanModalOpen(false)}>Annuler</Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                    onClick={() => handleAction("Ban", () => banUser(selectedUser._id, banReason), () => { fetchData("users"); setSelectedUser(prev => prev ? { ...prev, isBanned: true } : prev); setBanModalOpen(false); })}
                    disabled={loading["Ban"]}
                  >
                    {loading["Ban"] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer le bannissement"}
                  </Button>
                </div>
              </div>
            )}

            {txModalOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Ajouter des Coins à {selectedUser.username ? `@${selectedUser.username}` : selectedUser.email}</p>
                <Input type="number" placeholder="Montant (min 1)" value={txAmount} onChange={e => setTxAmount(e.target.value)} min={1} />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setTxModalOpen(false)}>Annuler</Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const amt = parseInt(txAmount);
                      if (!amt || amt < 1) { showToast("Saisissez un montant valide", "error"); return; }
                      handleAction("Add Coins", () => grantTx(selectedUser._id, amt), () => {
                        fetchData("users");
                        setSelectedUser(prev => prev ? { ...prev, txCoins: prev.txCoins + amt } : prev);
                        setTxAmount("");
                        setTxModalOpen(false);
                      });
                    }}
                    disabled={loading["Add Coins"]}
                  >
                    {loading["Add Coins"] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter des Coins"}
                  </Button>
                </div>
              </div>
            )}

            {subtractTxModalOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Retirer des Coins de {selectedUser.username ? `@${selectedUser.username}` : selectedUser.email}</p>
                <Input type="number" placeholder="Montant (min 1)" value={subtractTxAmount} onChange={e => setSubtractTxAmount(e.target.value)} min={1} />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSubtractTxModalOpen(false)}>Annuler</Button>
                  <Button
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white border-0"
                    onClick={() => {
                      const amt = parseInt(subtractTxAmount);
                      if (!amt || amt < 1) { showToast("Saisissez un montant valide", "error"); return; }
                      handleAction("Subtract Coins", () => subtractTx(selectedUser._id, amt), () => {
                        fetchData("users");
                        setSelectedUser(prev => prev ? { ...prev, txCoins: Math.max(0, prev.txCoins - amt) } : prev);
                        setSubtractTxAmount("");
                        setSubtractTxModalOpen(false);
                      });
                    }}
                    disabled={loading["Subtract Coins"]}
                  >
                    {loading["Subtract Coins"] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Retirer des Coins"}
                  </Button>
                </div>
              </div>
            )}

            {pwModalOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Nouveau mot de passe pour {selectedUser.username ? `@${selectedUser.username}` : selectedUser.email}</p>
                <Input type="password" placeholder="Min. 6 caractères" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPwModalOpen(false)}>Annuler</Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (!newPassword || newPassword.length < 6) { showToast("Le mot de passe doit contenir au moins 6 caractères", "error"); return; }
                      handleAction("Reset PW", () => resetPassword(selectedUser._id, newPassword), () => {
                        setNewPassword("");
                        setPwModalOpen(false);
                      });
                    }}
                    disabled={loading["Reset PW"]}
                  >
                    {loading["Reset PW"] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Réinitialiser le mot de passe"}
                  </Button>
                </div>
              </div>
            )}

            {notifyModalOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Envoyer une notification à {selectedUser.username ? `@${selectedUser.username}` : selectedUser.email}</p>
                <Input placeholder="Titre" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} maxLength={200} />
                <textarea
                  placeholder="Message"
                  value={notifyMessage}
                  onChange={e => setNotifyMessage(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setNotifyModalOpen(false)}>Annuler</Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (!notifyTitle.trim() || !notifyMessage.trim()) { showToast("Saisissez un titre et un message", "error"); return; }
                      handleAction("Notify", () => sendUserNotification(selectedUser._id, notifyTitle.trim(), notifyMessage.trim()), () => {
                        showToast("Notification envoyée", "success");
                        setNotifyTitle("");
                        setNotifyMessage("");
                        setNotifyModalOpen(false);
                      });
                    }}
                    disabled={loading["Notify"]}
                  >
                    {loading["Notify"] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer la notification"}
                  </Button>
                </div>
              </div>
            )}

            {deleteUserModalOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">Cela supprime définitivement l'utilisateur et tous ses bots. Cette action est irréversible.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setDeleteUserModalOpen(false)}>Annuler</Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                    onClick={() => handleAction("Delete User", () => deleteUser(selectedUser._id), () => {
                      fetchData("users");
                      closeUserPanel();
                    })}
                    disabled={loading["Delete User"]}
                  >
                    {loading["Delete User"] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Supprimer définitivement"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <DeleteConfirmModal
          isOpen={!!confirmDeleteTx?.open}
          onClose={() => setConfirmDeleteTx(null)}
          onConfirm={async () => {
          if (!confirmDeleteTx) return;
          const id = confirmDeleteTx.id;
          try {
            await deleteAdminTransaction(id);
            setConfirmDeleteTx(null);
            fetchData("transactions");
            showToast("Transaction supprimée", "success");
          } catch { showToast("Échec de la suppression de la transaction", "error"); }
        }}
          title="Supprimer la transaction"
          description="Cela supprimera définitivement cet enregistrement de transaction."
        />
        <DeleteConfirmModal
          isOpen={deleteCouponModal.open}
        onClose={() => setDeleteCouponModal({ open: false, id: "", code: "" })}
        onConfirm={() => handleAction("deleteCoupon", () => deleteCoupon(deleteCouponModal.id), () => { fetchData("coupons"); setDeleteCouponModal({ open: false, id: "", code: "" }); })}
        title={`Supprimer le code promo ${deleteCouponModal.code} ?`}
        description="Ce code promo sera définitivement supprimé."
      />

      <DeleteConfirmModal
        isOpen={deleteBotModal.open}
        onClose={() => setDeleteBotModal({ open: false, id: "", name: "" })}
        onConfirm={() => handleAction("deleteBot", () => deleteAdminBot(deleteBotModal.id), () => { fetchData("bots"); setDeleteBotModal({ open: false, id: "", name: "" }); })}
        title={`Supprimer ${deleteBotModal.name} ?`}
        description="Cela supprimera définitivement le bot et cette action est irréversible."
      />

      <DeleteConfirmModal
        isOpen={deleteTeamModal.open}
        onClose={() => setDeleteTeamModal({ open: false, id: "", name: "" })}
        onConfirm={() => handleAction("deleteTeam", () => deleteAdminTeam(deleteTeamModal.id), () => { fetchData("config"); setDeleteTeamModal({ open: false, id: "", name: "" }); })}
        title={`Retirer l'équipe "${deleteTeamModal.name}" ?`}
        description="Cela retire l'équipe de la rotation. Les bots existants sur cette équipe ne seront pas affectés."
      />
      <DeleteConfirmModal
        isOpen={deleteTemplateModal.open}
        onClose={() => setDeleteTemplateModal({ open: false, id: "", name: "" })}
        onConfirm={() => handleAction("deleteTemplate", () => deleteBotTemplate(deleteTemplateModal.id), () => { fetchData("bot-templates"); setDeleteTemplateModal({ open: false, id: "", name: "" }); })}
        title={`Supprimer le modèle de bot "${deleteTemplateModal.name}" ?`}
        description="Cela retire le modèle de bot de la liste. Les bots déjà déployés ne seront pas affectés."
      />
      <DeleteConfirmModal
        isOpen={confirmBulkDeleteTx}
        onClose={() => setConfirmBulkDeleteTx(false)}
        onConfirm={async () => {
          setConfirmBulkDeleteTx(false);
          try {
            await deleteAdminTransactionsBulk(selectedTxIds);
            showToast(`${selectedTxIds.length} transactions supprimées`, "success");
            setSelectedTxIds([]);
            fetchData("transactions");
          } catch { showToast("Échec de la suppression groupée", "error"); }
        }}
        title={`Supprimer ${selectedTxIds.length} transactions ?`}
        description="Cela supprimera définitivement les transactions sélectionnées. Cette action est irréversible."
      />
      <DeleteConfirmModal
        isOpen={confirmDeleteAllReferrals}
        onClose={() => setConfirmDeleteAllReferrals(false)}
        onConfirm={async () => {
          setConfirmDeleteAllReferrals(false);
          try {
            await deleteAllAdminReferrals();
            showToast("Tous les parrainages supprimés", "success");
            fetchData("referrals");
          } catch { showToast("Échec de la suppression des parrainages", "error"); }
        }}
        title="Supprimer tous les parrainages ?"
        description="Cela supprimera définitivement TOUS les enregistrements de parrainage. Cette action est irréversible."
      />
      <DeleteConfirmModal
        isOpen={!!confirmDeleteTutorial?.open}
        onClose={() => setConfirmDeleteTutorial(null)}
        onConfirm={async () => {
          if (!confirmDeleteTutorial) return;
          const id = confirmDeleteTutorial.id;
          setConfirmDeleteTutorial(null);
          try {
            await deleteAdminTutorial(id);
            setTutorials(prev => prev.filter(x => x._id !== id));
            showToast("Tutoriel supprimé", "success");
          } catch { showToast("Échec de la suppression du tutoriel", "error"); }
        }}
        title="Supprimer le tutoriel ?"
        description="Cela supprimera définitivement ce tutoriel."
      />
      <DeleteConfirmModal
        isOpen={deletePlanModal.open}
        onClose={() => setDeletePlanModal({ open: false, id: "", name: "" })}
        onConfirm={() => handleAction("deletePlan", () => deleteAdminPanelPlan(deletePlanModal.id), () => { fetchData("panel-plans"); setDeletePlanModal({ open: false, id: "", name: "" }); })}
        title={`Supprimer le forfait de panel "${deletePlanModal.name}" ?`}
        description="Cela retire le forfait de panel. Les utilisateurs l'ayant déjà acheté ne seront pas affectés."
      />
      <LogViewer
        isOpen={adminLogsOpen}
        onClose={() => setAdminLogsOpen(false)}
        logs={adminLogs}
        botName={adminLogsBot}
        onRefresh={async () => {
          setAdminLogsRefreshing(true);
          try {
            const bot = bots.find(b => b.herokuAppName === adminLogsBot);
            if (bot) { const res = await getAdminBotLogs(bot._id) as { logs?: string[] }; setAdminLogs(res.logs || []); }
          } catch {}
          setAdminLogsRefreshing(false);
        }}
        refreshing={adminLogsRefreshing}
      />

    </>
  );
}
