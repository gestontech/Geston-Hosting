import { Modal } from "@/components/Modal";
import { TopUpFlow } from "@/components/TopUpFlow";

interface TxTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTx?: number;
  onSuccess?: () => void;
}

export function TxTopUpModal({ isOpen, onClose, requiredTx, onSuccess }: TxTopUpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buy Coins without leaving" maxWidth="max-w-xl">
      <div className="space-y-3 p-1 max-h-[70vh] overflow-y-auto">
        <p className="text-xs text-muted-foreground">
          Choose your country and pay. When payment confirms, your Coins balance updates automatically so you can deploy right away.
        </p>
        <TopUpFlow
          compact
          requiredTx={requiredTx}
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
