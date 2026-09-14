import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/Modal";
import { Loader2, Check } from "lucide-react";
import type { NigeriaPackage } from "@/components/topup/packages";
import { initiatePaymentNg, verifyPayment } from "@/lib/api";

type Stage = "select" | "pending" | "success" | "failed";

export function NigeriaPaymentModal({
  isOpen, onClose, pkg, userEmail, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  pkg: NigeriaPackage | null;
  userEmail: string;
  onSuccess: () => void;
}) {
  const [stage, setStage] = useState<Stage>("select");
  const [cardEmail, setCardEmail] = useState(userEmail || "");
  const [loading, setLoading] = useState(false);
  const [failReason, setFailReason] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) { setStage("select"); setLoading(false); setFailReason(""); }
  }, [isOpen]);

  useEffect(() => {
    setCardEmail(userEmail || "");
  }, [userEmail]);

  if (!pkg) return null;
  const totalTx = pkg.txAmount + pkg.bonusTx;

  const handlePay = async () => {
    if (!cardEmail.trim() || !cardEmail.includes("@")) { showToast("Saisissez un e-mail valide", "error"); return; }
    setLoading(true);
    try {
      const paystackPop = (window as unknown as { PaystackPop?: new () => {
        resumeTransaction: (accessCode: string, callbacks: Record<string, unknown>) => void;
        newTransaction: (config: Record<string, unknown>) => void;
      } }).PaystackPop;
      if (!paystackPop) { showToast("Système de paiement non chargé. Actualisez et réessayez.", "error"); setLoading(false); return; }

      const initData = await initiatePaymentNg({
        ngnAmount: pkg.ngnPrice,
        txAmount: pkg.txAmount,
        bonusTx: pkg.bonusTx,
        packageName: pkg.name,
      }) as { accessCode?: string; reference?: string; error?: string };

      if (initData.error) { showToast(initData.error, "error"); setLoading(false); return; }
      if (!initData.accessCode || !initData.reference) { showToast("Échec de l'initialisation du paiement", "error"); setLoading(false); return; }

      const ref = initData.reference;
      setLoading(false);
      const instance = new paystackPop();
      instance.resumeTransaction(initData.accessCode, {
        onSuccess: async () => {
          try { await verifyPayment(ref); } catch {}
          setStage("success");
          showToast(`Paiement confirmé ! ${totalTx} Coins ajoutés.`, "success");
          onSuccess();
        },
        onLoad: () => {},
        onCancel: () => { setStage("failed"); setFailReason("Le paiement a été annulé."); },
        onError: () => { setStage("failed"); setFailReason("Le paiement a rencontré une erreur. Veuillez réessayer."); }
      });
    } catch { showToast("Le paiement a échoué", "error"); setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Paiement Nigeria" maxWidth="max-w-lg">
      {stage === "success" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg text-green-400">Paiement confirmé !</p>
            <p className="text-sm text-muted-foreground mt-1">{totalTx} Coins ont été ajoutés à votre compte.</p>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Terminé</button>
        </div>
      ) : stage === "failed" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg text-red-400">Échec du paiement</p>
            <p className="text-sm text-muted-foreground mt-1">{failReason}</p>
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={() => { setStage("select"); setFailReason(""); }} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Réessayer</button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Fermer</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{pkg.name}</span>
              <span className="font-bold text-green-400">{totalTx} Coins</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              🇳🇬 NGN {pkg.ngnPrice.toLocaleString()}
              {pkg.bonusTx > 0 && <span className="ml-1.5 text-green-400">+{pkg.bonusTx} bonus</span>}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">E-mail</label>
            <input type="email" placeholder="your@email.com" value={cardEmail} onChange={e => setCardEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500" />
            <p className="text-xs text-muted-foreground mt-1">Paystack s'ouvrira et affichera les options de paiement disponibles pour le Nigeria (carte, virement, USSD).</p>
          </div>
          <button onClick={handlePay} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Chargement..." : `Payer NGN ${pkg.ngnPrice.toLocaleString()}`}
          </button>
        </div>
      )}
    </Modal>
  );
}
