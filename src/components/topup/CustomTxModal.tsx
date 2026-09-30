import { Modal } from "@/components/Modal";
import { Check } from "lucide-react";

export function CustomTxModal({
  isOpen,
  onClose,
  userEmail: _userEmail,
  onSuccess: _onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onSuccess: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Services"
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-400" />
        </div>

        <div className="text-center space-y-2">
          <p className="font-semibold text-lg text-green-400">
            Aucun paiement nécessaire
          </p>

          <p className="text-sm text-muted-foreground">
            Geston Hosting fonctionne maintenant gratuitement.
            Les services disponibles ne nécessitent plus de
            recharge ni de Coins.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Fermer
        </button>
      </div>
    </Modal>
  );
}
