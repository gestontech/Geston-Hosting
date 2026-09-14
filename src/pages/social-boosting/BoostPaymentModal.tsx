import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, CheckCircle2, XCircle } from "lucide-react";
import { LOGO_MPESA, LOGO_CARD } from "@/pages/social-boosting/logos";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import type { PayStage, PreparedBoostOrder } from "@/pages/social-boosting/types";

type CurrencyDef = { code: string; symbol: string; perKes: number };

interface BoostPaymentModalProps {
  preparedOrder: PreparedBoostOrder | null;
  onClose: () => void;
  onSuccess: () => void;
  currencies: CurrencyDef[];
  formatLocal: (amount: number) => string;
  kenyaAvailable: boolean;
  drcAvailable: boolean;
  cameroonAvailable: boolean;
  tanzaniaAvailable: boolean;
  cardAvailable: boolean;
  paystackPublicKey: string;
}

export function BoostPaymentModal({
  preparedOrder,
  onClose,
  onSuccess,
  kenyaAvailable,
  drcAvailable,
  cameroonAvailable,
  tanzaniaAvailable,
  cardAvailable,
  paystackPublicKey,
}: BoostPaymentModalProps) {
  const [payStage, setPayStage] = useState<PayStage>("choose");

  useEffect(() => {
    if (preparedOrder) {
      setPayStage("choose");
    }
  }, [preparedOrder?.boostOrderId]);

  useEffect(() => {
    if (!preparedOrder || payStage === "closed") return;
    lockScroll();
    return () => unlockScroll();
  }, [preparedOrder?.boostOrderId, payStage]);

  const closePayFlow = () => {
    setPayStage("closed");
    onClose();
  };

  if (!preparedOrder || payStage === "closed") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Payer le boost</h3>
          <button onClick={closePayFlow} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        {payStage === "choose" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Coût de la commande : {preparedOrder.costKes} KES</p>
            {kenyaAvailable && (
              <button
                onClick={() => setPayStage("pending")}
                className="w-full p-4 rounded-xl border border-border hover:border-teal-500/40 text-left flex items-center gap-3"
              >
                <img src={LOGO_MPESA} alt="M-Pesa" className="w-8 h-8" />
                <span className="font-semibold">Kenya M-Pesa / Airtel</span>
              </button>
            )}
            {drcAvailable && (
              <button
                onClick={() => setPayStage("pending")}
                className="w-full p-4 rounded-xl border border-border hover:border-orange-500/40 text-left"
              >
                Mobile Money RD Congo
              </button>
            )}
            {cameroonAvailable && (
              <button
                onClick={() => setPayStage("pending")}
                className="w-full p-4 rounded-xl border border-border hover:border-yellow-500/40 text-left"
              >
                Mobile Money Cameroun
              </button>
            )}
            {tanzaniaAvailable && (
              <button
                onClick={() => setPayStage("pending")}
                className="w-full p-4 rounded-xl border border-border hover:border-blue-500/40 text-left"
              >
                Mobile Money Tanzanie
              </button>
            )}
            {!!paystackPublicKey && cardAvailable && (
              <button
                onClick={() => setPayStage("pending")}
                className="w-full p-4 rounded-xl border border-border hover:border-blue-500/40 text-left flex items-center gap-3"
              >
                <img src={LOGO_CARD} alt="Card" className="w-8 h-8" />
                <span className="font-semibold">Carte / Apple Pay</span>
              </button>
            )}
            {!kenyaAvailable && !drcAvailable && !cameroonAvailable && !tanzaniaAvailable && !(!!paystackPublicKey && cardAvailable) && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun moyen de paiement disponible pour le moment.</p>
            )}
          </div>
        )}
        {payStage === "pending" && (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400" />
            <p className="font-semibold">En attente du paiement…</p>
            <p className="text-sm text-muted-foreground">Terminez le paiement sur votre téléphone.</p>
            <Button variant="outline" onClick={() => setPayStage("choose")}>Retour</Button>
          </div>
        )}
        {payStage === "success" && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
            <p className="font-bold text-green-400">Paiement réussi</p>
            <Button onClick={() => { onSuccess(); closePayFlow(); }}>Terminé</Button>
          </div>
        )}
        {payStage === "failed" && (
          <div className="text-center py-6 space-y-3">
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="font-bold text-red-400">Échec du paiement</p>
            <Button variant="outline" onClick={() => setPayStage("choose")}>Réessayer</Button>
          </div>
        )}
      </div>
    </div>
  );
}
