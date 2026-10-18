import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/Modal";
import { Loader2, Check, Minus } from "lucide-react";
import type { DRCPackage } from "@/components/topup/packages";
import { normalizeDRCPhone, isValidDRCPhone } from "@/components/topup/phone";

export function DRCPaymentModal({
  isOpen, onClose, pkg, onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  pkg: DRCPackage | null;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [stage, setStage] = useState<"select" | "pending" | "success" | "failed">("select");
  const [refTransa, setRefTransa] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phone, setPhone] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStage("select");
      setRefTransa(null);
      setPhone("");
      if (pollRef.current) clearTimeout(pollRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (stage === "pending" && refTransa) {
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const res = await fetch(`/api/payments/drc-status/${encodeURIComponent(refTransa)}`, { credentials: "include" });
        const data = await res.json() as { status?: string; txAmount?: number };
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
  }, [stage, refTransa, onSuccess]);

  const handlePay = async () => {
    if (!pkg) return;
    if (!isValidDRCPhone(phone)) {
      showToast("Saisissez un numéro mobile congolais valide (ex. 0997654321)", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/payments/initiate-drc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: pkg.usdPrice, currency: "USD", txAmount: pkg.txAmount, bonusTx: pkg.bonusTx, phone: normalizeDRCPhone(phone) })
      });
      const data = await res.json() as { refTransa?: string; error?: string };
      if (data.error) { showToast(data.error, "error"); return; }
      if (data.refTransa) {
        setRefTransa(data.refTransa);
        setStage("pending");
      }
    } catch {
      showToast("Échec du lancement du paiement", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !pkg) return null;
  const total = pkg.txAmount + pkg.bonusTx;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Paiement mobile RD Congo">
      <div className="space-y-4">
        {stage === "select" && (
          <>
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
              <p className="text-sm font-medium text-indigo-300 mb-1">{pkg.name}</p>
              <p className="text-2xl font-bold text-indigo-400">{total} Coins</p>
              <p className="text-sm text-muted-foreground">$ {pkg.usdPrice.toLocaleString()}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Numéro Mobile Money RD Congo</label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="0997654321 or +243997654321"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20))}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-indigo-500/60"
              />
              <p className="text-[11px] text-muted-foreground">Avec ou sans l'indicatif +243, les deux fonctionnent.</p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
              Une demande de paiement sera envoyée directement sur votre numéro Mobile Money.
            </div>
            <button
              onClick={handlePay}
              disabled={isProcessing || !phone}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Payer $ {pkg.usdPrice.toLocaleString()}
            </button>
          </>
        )}
        {stage === "pending" && (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
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
