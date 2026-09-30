import { Modal } from "@/components/Modal";
import { TopUpFlow } from "@/components/TopUpFlow";

interface TxTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTx?: number;
  onSuccess?: () => void;
}

export function TxTopUpModal({
  isOpen,
  onClose,
  onSuccess,
}: TxTopUpModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Services"
      maxWidth="max-w-xl"
    >
      <div className="space-y-3 p-1 max-h-[70vh] overflow-y-auto">
        <TopUpFlow
          compact
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
