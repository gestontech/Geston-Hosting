import { LogOut, Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function LogoutConfirmModal({ isOpen, onClose, onConfirm, loading = false }: LogoutConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Se déconnecter ?" maxWidth="max-w-md">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <LogOut className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-center text-muted-foreground">Êtes-vous sûr de vouloir vous déconnecter de votre compte ?</p>
        <div className="flex gap-3 w-full mt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
  className="flex-1 bg-black hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85 text-black dark:text-white"
  onClick={onConfirm}
  disabled={loading}
>
  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
  {loading ? "Déconnexion..." : "Déconnexion"}
</Button>
        </div>
      </div>
    </Modal>
  );
}
