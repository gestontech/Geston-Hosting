import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/Modal";
import { verifyPayment } from "@/lib/api";
import { Loader2, Check } from "lucide-react";
import { type Package, USD_PER_TX } from "@/components/topup/packages";
import { CardLogo, ApplePayLogo } from "@/components/topup/logos";
import type { Stage } from "@/components/topup/types";

export function OtherCountryPaymentModal({
  isOpen, onClose, pkg, userEmail, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
  userEmail: string;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<"card" | "apple_pay">("card");
  const [cardEmail, setCardEmail] = useState(userEmail || "");
  const [stage, setStage] = useState<Stage>("select");
  const [failReason, setFailReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) { setStage("select"); setLoading(false); setFailReason(""); }
  }, [isOpen]);

  useEffect(() => { setCardEmail(userEmail || ""); }, [userEmail]);

  if (!pkg) return null;
  const totalTx = pkg.txAmount + pkg.bonusTx;

  const handlePay = async () => {
    if (method === "apple_pay" && !("ApplePaySession" in window)) {
      showToast("Apple Pay n'est disponible que sur les appareils Apple via Safari.", "error");
      return;
    }
    if (!cardEmail.trim() || !cardEmail.includes("@")) { showToast("Saisissez un e-mail valide", "error"); return; }
    setLoading(true);
    try {
      const paystackPop = (window as unknown as { PaystackPop?: new () => {
        resumeTransaction: (accessCode: string, callbacks: Record<string, unknown>) => void;
        newTransaction: (config: Record<string, unknown>) => void;
      } }).PaystackPop;
      if (!paystackPop) { showToast("Système de paiement non chargé. Actualisez et réessayez.", "error"); setLoading(false); return; }

      const [cardData, configData] = await Promise.all([
        fetch("/api/payments/prepare-card", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          body: JSON.stringify({ packageId: pkg._id })
        }).then(r => r.json()),
        fetch("/api/payments/config").then(r => r.json())
      ]);
      const ref = (cardData as { reference?: string }).reference;
      const publicKey = (configData as { paystackPublicKey?: string }).paystackPublicKey || "";
      if (!ref) { showToast("Échec de l'initialisation du paiement", "error"); setLoading(false); return; }
      setLoading(false);
      const instance = new paystackPop();
      instance.newTransaction({
        key: publicKey,
        email: cardEmail,
        amount: pkg.ksPrice * 100,
        currency: "KES",
        ref,
        channels: [method === "card" ? "card" : "apple_pay"],
        onSuccess: async () => {
          try { await verifyPayment(ref); } catch {}
          setStage("success");
          showToast(`Paiement confirmé ! ${totalTx} Coins ajoutés.`, "success");
          onSuccess();
        },
        onCancel: () => { setStage("failed"); setFailReason("Le paiement a été annulé."); },
        onError: () => { setStage("failed"); setFailReason("Le paiement a rencontré une erreur. Veuillez réessayer."); }
      });
    } catch { showToast("Le paiement a échoué", "error"); setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finaliser le paiement" maxWidth="max-w-lg">
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
              <span className="font-bold text-blue-400">{totalTx} Coins</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">${(pkg.txAmount * USD_PER_TX).toFixed(2)} USD</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMethod("card")}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${method === "card" ? "border-blue-500 bg-blue-500/10 shadow-sm shadow-blue-500/20" : "border-border hover:border-blue-500/40 hover:bg-muted/50"}`}>
              <CardLogo />
              <span className="text-xs font-semibold text-muted-foreground">Carte bancaire</span>
            </button>
            <button onClick={() => setMethod("apple_pay")}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${method === "apple_pay" ? "border-blue-500 bg-blue-500/10 shadow-sm shadow-blue-500/20" : "border-border hover:border-blue-500/40 hover:bg-muted/50"}`}>
              <ApplePayLogo />
              <span className="text-xs font-semibold text-muted-foreground">Apple Pay</span>
            </button>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">E-mail</label>
            <input type="email" placeholder="your@email.com" value={cardEmail} onChange={e => setCardEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" />
          </div>
          <button onClick={handlePay} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Chargement..." : `Payer avec ${method === "card" ? "carte" : "Apple Pay"} — ${(pkg.txAmount * USD_PER_TX).toFixed(2)}`}
          </button>
        </div>
      )}
    </Modal>
  );
}


