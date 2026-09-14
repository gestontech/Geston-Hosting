import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/Modal";
import { Loader2, Check, Minus, Wallet } from "lucide-react";
import type { CameroonPackage } from "@/components/topup/packages";

export function CameroonPaymentModal({
  isOpen, onClose, pkg, onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  pkg: CameroonPackage | null;
  userEmail?: string;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [stage, setStage] = useState<"select" | "redirect" | "pending" | "success" | "failed">("select");
  const [transId, setTransId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phone, setPhone] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { initiateCameroonPayment, checkCameroonPaymentStatus } = {
    initiateCameroonPayment: async (data: { xafAmount: number; txAmount: number; bonusTx: number; phone: string }) => {
      const res = await fetch("/api/payments/initiate-cameroon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      return res.json();
    },
    checkCameroonPaymentStatus: async (id: string) => {
      const res = await fetch(`/api/payments/cameroon-status/${encodeURIComponent(id)}`, {
        credentials: "include"
      });
      return res.json();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStage("select");
      setTransId(null);
      setPaymentUrl(null);
      if (pollRef.current) clearTimeout(pollRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (stage === "pending" && transId) {
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const data = await checkCameroonPaymentStatus(transId);
        if (data.status === "success") {
          setStage("success");
          onSuccess();
          return;
        }
        if (data.status === "failed" || attempts > 27) {
          setStage("failed");
          return;
        }
        pollRef.current = setTimeout(poll, 11000);
      };
      pollRef.current = setTimeout(poll, 11000);
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [stage, transId]);

  const normalizedCameroonPhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("237")) digits = digits.slice(3);
    else if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);
    return digits;
  };
  const isValidCameroonPhone = (value: string) => /^6\d{8}$/.test(normalizedCameroonPhone(value));

  const handlePay = async () => {
    if (!pkg) return;
    if (!isValidCameroonPhone(phone)) {
      showToast("Saisissez un numéro mobile camerounais valide", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const data = await initiateCameroonPayment({ xafAmount: pkg.xafPrice, txAmount: pkg.txAmount, bonusTx: pkg.bonusTx, phone: normalizedCameroonPhone(phone) });
      if (data.error) {
        showToast(data.error, "error");
        return;
      }
      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        setTransId(data.transId || data.reference);
        setStage("redirect");
        return;
      }
      if (data.transId || data.reference) {
        setTransId(data.transId || data.reference);
        setStage("pending");
      }
    } catch {
      showToast("Échec du lancement du paiement", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToPayment = () => {
    if (!paymentUrl) return;
    const win = window.open(paymentUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      showToast("Votre navigateur a bloqué la fenêtre de paiement. Veuillez autoriser les popups pour ce site et réessayer.", "error");
      return;
    }
    setStage("pending");
  };

  if (!isOpen || !pkg) return null;
  const total = pkg.txAmount + pkg.bonusTx;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Paiement mobile Cameroun">
      <div className="space-y-4">
        {stage === "select" && (
          <>
            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <p className="text-sm font-medium text-orange-300 mb-1">{pkg.name}</p>
              <p className="text-2xl font-bold text-orange-400">{total} Coins</p>
              <p className="text-sm text-muted-foreground">XAF {pkg.xafPrice.toLocaleString()}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Numéro MTN MoMo / Orange Money</label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="6XXXXXXXX or +237 6XXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20))}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-orange-500/60"
              />
              <p className="text-[11px] text-muted-foreground">Avec ou sans l'indicatif +237, les deux fonctionnent.</p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
              Nous enverrons une demande de paiement directement à ce numéro. Si le paiement push n'est pas disponible, vous recevrez un lien de paiement sécurisé.
            </div>
            <button
              onClick={handlePay}
              disabled={isProcessing || !phone}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Payer XAF {pkg.xafPrice.toLocaleString()}
            </button>
          </>
        )}
        {stage === "redirect" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto">
              <Wallet className="w-7 h-7 text-orange-400" />
            </div>
            <p className="font-semibold">Prêt à payer</p>
            <p className="text-sm text-muted-foreground">Appuyez sur le bouton ci-dessous pour ouvrir la page de paiement sécurisée dans un nouvel onglet et finaliser votre paiement de XAF {pkg.xafPrice.toLocaleString()}. Revenez ici une fois terminé — cette page se mettra à jour automatiquement.</p>
            <button
              onClick={handleContinueToPayment}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors"
            >
              Continuer vers le paiement
            </button>
          </div>
        )}
        {stage === "pending" && (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-400 mx-auto" />
            <p className="font-semibold">En attente du paiement...</p>
            <p className="text-sm text-muted-foreground">Approuvez la demande de paiement envoyée sur votre téléphone. Cette page se mettra à jour automatiquement une fois confirmé.</p>
          </div>
        )}
        {stage === "success" && (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-green-400" />
            </div>
            <p className="font-bold text-green-400">Paiement réussi !</p>
            <p className="text-sm text-muted-foreground">{total} Coins ont été ajoutés à votre compte.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">Terminé</button>
          </div>
        )}
        {stage === "failed" && (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
              <Minus className="w-7 h-7 text-red-400" />
            </div>
            <p className="font-bold text-red-400">Échec du paiement</p>
            <p className="text-sm text-muted-foreground">Votre paiement n'a pas abouti. Veuillez réessayer.</p>
            <button onClick={() => setStage("select")} className="mt-2 px-6 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium border border-border transition-colors">Réessayer</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
