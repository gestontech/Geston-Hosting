import { useState, useEffect, type ReactElement } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/Modal";
import { getMobileChargeStatus, verifyPayment } from "@/lib/api";
import { Loader2, Check, Minus, Plus } from "lucide-react";
import { isValidKenyanPhone, toPaystackPhone } from "@/components/topup/phone";
import { MpesaLogo, AirtelLogo, CardLogo, ApplePayLogo } from "@/components/topup/logos";
import { TX_RATE_KES, TX_MIN } from "@/components/topup/packages";
import type { Stage, PayMethod } from "@/components/topup/types";

export function CustomTxModal({ isOpen, onClose, userEmail, onSuccess }: { isOpen: boolean; onClose: () => void; userEmail: string; onSuccess: () => void }) {
  const [txAmount, setTxAmount] = useState(10);
  const [method, setMethod] = useState<PayMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const [cardEmail, setCardEmail] = useState(userEmail || "");
  const [stage, setStage] = useState<Stage>("select");
  const [message, setMessage] = useState("");
  const [failReason, setFailReason] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const { showToast } = useToast();
  const { currency, format } = useCurrency();

  const ksPrice = txAmount * TX_RATE_KES;

  useEffect(() => {
    if (!isOpen) { setStage("select"); setPhone(""); setReference(""); setMessage(""); setFailReason(""); setLoading(false); setPollCount(0); setTxAmount(10); }
  }, [isOpen]);

  useEffect(() => {
    if (stage !== "pending" || !reference) return;
    let count = 0;
    const interval = setInterval(async () => {
      count += 1;
      setPollCount(count);
      if (count >= 40) { clearInterval(interval); setStage("failed"); setFailReason("Le paiement a expiré."); return; }
      try {
        const data = await getMobileChargeStatus(reference) as { status?: string; txAmount?: number; error?: string };
        if (data.status === "success") { clearInterval(interval); setStage("success"); showToast(`${data.txAmount ?? txAmount} Coins ajoutés !`, "success"); onSuccess(); return; }
        if (["failed", "abandoned", "cancelled"].includes(data.status || "")) { clearInterval(interval); setStage("failed"); setFailReason("Le paiement a échoué. Veuillez réessayer."); return; }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [stage, reference, onSuccess, showToast, txAmount]);

  const handleMobileCharge = async () => {
    if (!phone.trim() || !isValidKenyanPhone(phone)) { showToast("Saisissez un numéro valide", "error"); return; }
    setLoading(true);
    try {
      const normalized = toPaystackPhone(phone);
      const provider = method === "airtel" ? "airtel" : "mpesa";
      const res = await fetch("/api/payments/charge-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ txAmount, ksAmount: ksPrice, phone: normalized, provider })
      });
      const data = await res.json() as { error?: string; reference?: string; message?: string };
      if (data.error) { showToast(data.error, "error"); setLoading(false); return; }
      setReference(data.reference || "");
      setMessage(data.message || "Vérifiez votre téléphone pour la demande de paiement.");
      setPollCount(0);
      setTxAmount(10);
      setStage("pending");
    } catch { showToast("Échec du lancement du paiement", "error"); }
    setLoading(false);
  };

  const handlePopupPay = async (channels: string[]) => {
    if (channels.includes("apple_pay") && !("ApplePaySession" in window)) { showToast("Apple Pay n'est disponible que sur les appareils Apple via Safari.", "error"); return; }
    if (!cardEmail.trim() || !cardEmail.includes("@")) { showToast("Saisissez un e-mail valide", "error"); return; }
    setLoading(true);
    try {
      const paystackPop = (window as unknown as { PaystackPop?: new () => {
        resumeTransaction: (accessCode: string, callbacks: Record<string, unknown>) => void;
        newTransaction: (config: Record<string, unknown>) => void;
      } }).PaystackPop;
      if (!paystackPop) { showToast("Système de paiement non chargé.", "error"); setLoading(false); return; }
      if (channels.includes("card")) {
        const [cardData, configData] = await Promise.all([
          fetch("/api/payments/prepare-card-custom", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            body: JSON.stringify({ txAmount, ksAmount: ksPrice })
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
          amount: ksPrice * 100,
          currency: "KES",
          ref,
          channels: ["card"],
          onSuccess: async () => { try { await verifyPayment(ref); } catch {} setStage("success"); showToast(`${txAmount} Coins ajoutés !`, "success"); onSuccess(); },
          onCancel: () => { setStage("failed"); setFailReason("Le paiement par carte a été annulé."); },
          onError: () => { setStage("failed"); setFailReason("Le paiement par carte a rencontré une erreur. Veuillez réessayer."); }
        });
      } else {
        const initData = await fetch("/api/payments/initiate-custom", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          body: JSON.stringify({ txAmount, ksAmount: ksPrice })
        }).then(r => r.json());
        const accessCode = (initData as { accessCode?: string }).accessCode;
        const ref = (initData as { reference?: string }).reference;
        if (!accessCode || !ref) { showToast("Échec de l'initialisation du paiement", "error"); setLoading(false); return; }
        setLoading(false);
        const instance = new paystackPop();
        instance.resumeTransaction(accessCode, {
          onSuccess: async () => { try { await verifyPayment(ref); } catch {} setStage("success"); showToast(`${txAmount} Coins ajoutés !`, "success"); onSuccess(); },
          onLoad: () => {},
          onCancel: () => { setStage("failed"); setFailReason("Le paiement Apple Pay a été annulé."); },
          onError: () => { setStage("failed"); setFailReason("Apple Pay a rencontré une erreur. Veuillez réessayer."); }
        });
      }
    } catch { showToast("Le paiement a échoué", "error"); setLoading(false); }
  };

  const methodOptions: { key: PayMethod; label: string; Logo: () => ReactElement }[] = [
    { key: "mpesa", label: "M-Pesa", Logo: MpesaLogo },
    { key: "airtel", label: "Airtel", Logo: AirtelLogo },
    { key: "card", label: "Carte", Logo: CardLogo },
    { key: "apple_pay", label: "Apple Pay", Logo: ApplePayLogo },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Achat de Coins personnalisé" maxWidth="max-w-lg">
      {stage === "success" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-green-400" /></div>
          <div className="text-center">
            <p className="font-semibold text-lg text-green-400">Paiement confirmé !</p>
            <p className="text-sm text-muted-foreground mt-1">{txAmount} Coins ajoutés à votre solde.</p>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Terminé</button>
        </div>
      ) : stage === "failed" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <div className="text-center"><p className="font-semibold text-lg text-red-400">Échec</p><p className="text-sm text-muted-foreground mt-1">{failReason}</p></div>
          <div className="flex gap-2 w-full">
            <button onClick={() => { setStage("select"); setFailReason(""); setReference(""); }} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Réessayer</button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Fermer</button>
          </div>
        </div>
      ) : stage === "pending" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
          <div className="text-center"><p className="font-semibold">En attente du paiement...</p><p className="text-sm text-muted-foreground mt-1">{message}</p></div>
          <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (pollCount / 40) * 100)}%` }} /></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Combien de Coins voulez-vous ?</p>
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setTxAmount(v => Math.max(TX_MIN, v - 1))} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"><Minus className="w-4 h-4" /></button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  inputMode="numeric"
                  value={txAmount}
                  onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= TX_MIN) setTxAmount(v); }}
                  onBlur={e => { const v = parseInt(e.target.value, 10); setTxAmount(isNaN(v) || v < TX_MIN ? TX_MIN : v); }}
                  min={TX_MIN}
                  className="w-full text-center text-3xl font-bold text-teal-400 bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Coins</p>
              </div>
              <button onClick={() => setTxAmount(v => v + 1)} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
              <span className="text-muted-foreground">Coût</span>
              <span className="font-semibold">KES {ksPrice}{currency !== "KES" && <span className="text-muted-foreground/60 text-xs"> ≈ {format(ksPrice)}</span>}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {methodOptions.map(({ key, label, Logo }) => (
              <button key={key} onClick={() => setMethod(key)}
                className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border-2 transition-all ${method === key ? "border-teal-500 bg-teal-500/10 shadow-sm shadow-teal-500/20" : "border-border hover:border-teal-500/40 hover:bg-muted/50"}`}
                title={label}
              >
                <Logo />
                <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>

          {(method === "mpesa" || method === "airtel") ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">Numéro de téléphone</label>
                <input type="tel" placeholder="0712345678" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" />
              </div>
              <button onClick={handleMobileCharge} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Lancement..." : `Payer KES ${ksPrice}`}
              </button>
            </div>
          ) : method === "card" ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">E-mail</label>
                <input type="email" placeholder="your@email.com" value={cardEmail} onChange={e => setCardEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" />
              </div>
              <button onClick={() => handlePopupPay(["card"])} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Chargement..." : `Payer par carte — KES ${ksPrice}`}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">E-mail</label>
                <input type="email" placeholder="your@email.com" value={cardEmail} onChange={e => setCardEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" />
              </div>
              <button onClick={() => handlePopupPay(["apple_pay"])} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Chargement..." : "Payer avec Apple Pay"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

