import { useState, useEffect, type ReactElement } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/Modal";
import { getMobileChargeStatus, initiatePayment, verifyPayment } from "@/lib/api";
import { Loader2, Check } from "lucide-react";
import { type Package } from "@/components/topup/packages";
import { isValidKenyanPhone, toPaystackPhone } from "@/components/topup/phone";
import { MpesaLogo, AirtelLogo, CardLogo, ApplePayLogo } from "@/components/topup/logos";
import type { Stage, PayMethod } from "@/components/topup/types";

export function KenyaPaymentModal({
  isOpen, onClose, pkg, userEmail, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
  userEmail: string;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<PayMethod>("mpesa");
  const { currency, format } = useCurrency();
  const [phone, setPhone] = useState("");
  const [cardEmail, setCardEmail] = useState(userEmail || "");
  const [stage, setStage] = useState<Stage>("select");
  const [message, setMessage] = useState("");
  const [failReason, setFailReason] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const { showToast } = useToast();

  const handleClose = () => {
    if (stage === "pending") {
      showToast("Paiement annulé. Si vous avez été débité, veuillez contacter le support.", "error");
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setStage("select");
      setPhone("");
      setReference("");
      setMessage("");
      setFailReason("");
      setLoading(false);
      setPollCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (stage !== "pending" || !reference) return;
    let count = 0;
    const interval = setInterval(async () => {
      count += 1;
      setPollCount(count);
      if (count >= 40) {
        clearInterval(interval);
        setStage("failed");
        setFailReason("Le paiement a expiré — vous n'avez pas terminé le paiement à temps.");
        return;
      }
      try {
        const data = await getMobileChargeStatus(reference) as { status?: string; txAmount?: number; error?: string };
        if (data.error) return;
        if (data.status === "success") { clearInterval(interval); setStage("success"); showToast(`Paiement confirmé ! ${data.txAmount ?? 0} Coins ajoutés.`, "success"); onSuccess(); return; }
        if (data.status === "failed") { clearInterval(interval); setStage("failed"); setFailReason("Le paiement a échoué. Veuillez réessayer."); return; }
        if (data.status === "abandoned") { clearInterval(interval); setStage("failed"); setFailReason("Le paiement a été abandonné."); return; }
        if (data.status === "cancelled") { clearInterval(interval); setStage("failed"); setFailReason("Le paiement a été annulé."); return; }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [stage, reference, onSuccess, showToast]);

  const handleMobileCharge = async () => {
    if (!pkg) return;
    if (!phone.trim() || !isValidKenyanPhone(phone)) { showToast("Saisissez un numéro valide (ex. 0712345678)", "error"); return; }
    setLoading(true);
    try {
      const normalized = toPaystackPhone(phone);
      const provider = method === "airtel" ? "airtel" : "mpesa";
      const res = await fetch("/api/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ packageId: pkg._id, phone: normalized, provider })
      });
      const data = await res.json() as { error?: string; reference?: string; message?: string };
      if (data.error) { showToast(data.error, "error"); setLoading(false); return; }
      setReference(data.reference || "");
      setMessage(data.message || "Vérifiez votre téléphone pour la demande de paiement.");
      setPollCount(0);
      setStage("pending");
    } catch { showToast("Échec du lancement du paiement", "error"); }
    setLoading(false);
  };

  const handlePopupPay = async (channels: string[]) => {
    if (!pkg) return;
    if (channels.includes("apple_pay") && !("ApplePaySession" in window)) { showToast("Apple Pay n'est disponible que sur les appareils Apple via Safari.", "error"); return; }
    if (!cardEmail.trim() || !cardEmail.includes("@")) { showToast("Saisissez un e-mail valide", "error"); return; }
    setLoading(true);
    try {
      const paystackPop = (window as unknown as { PaystackPop?: new () => {
        resumeTransaction: (accessCode: string, callbacks: Record<string, unknown>) => void;
        newTransaction: (config: Record<string, unknown>) => void;
      } }).PaystackPop;
      if (!paystackPop) { showToast("Système de paiement non chargé. Actualisez et réessayez.", "error"); setLoading(false); return; }
      if (channels.includes("card")) {
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
          channels: ["card"],
          onSuccess: async () => { try { await verifyPayment(ref); } catch {} setStage("success"); showToast(`Paiement confirmé ! ${totalTx} Coins ajoutés.`, "success"); onSuccess(); },
          onCancel: () => { setStage("failed"); setFailReason("Le paiement par carte a été annulé."); },
          onError: () => { setStage("failed"); setFailReason("Le paiement par carte a rencontré une erreur. Veuillez réessayer."); }
        });
      } else {
        const initData = await initiatePayment(pkg._id);
        const accessCode = (initData as { accessCode?: string }).accessCode;
        const ref = (initData as { reference?: string }).reference;
        if (!accessCode || !ref) { showToast("Échec de l'initialisation du paiement", "error"); setLoading(false); return; }
        setLoading(false);
        const instance = new paystackPop();
        instance.resumeTransaction(accessCode, {
          onSuccess: async () => { try { await verifyPayment(ref); } catch {} setStage("success"); showToast(`Paiement confirmé ! ${totalTx} Coins ajoutés.`, "success"); onSuccess(); },
          onLoad: () => {},
          onCancel: () => { setStage("failed"); setFailReason("Le paiement Apple Pay a été annulé."); },
          onError: () => { setStage("failed"); setFailReason("Apple Pay a rencontré une erreur. Veuillez réessayer."); }
        });
      }
    } catch { showToast("Le paiement a échoué", "error"); setLoading(false); }
  };

  if (!pkg) return null;
  const totalTx = pkg.txAmount + pkg.bonusTx;

  const methodOptions: { key: PayMethod; label: string; Logo: () => ReactElement }[] = [
    { key: "mpesa", label: "M-Pesa", Logo: MpesaLogo },
    { key: "airtel", label: "Airtel", Logo: AirtelLogo },
    { key: "card", label: "Carte", Logo: CardLogo },
    { key: "apple_pay", label: "Apple Pay", Logo: ApplePayLogo },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Finaliser le paiement" maxWidth="max-w-lg">
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
            <button onClick={() => { setStage("select"); setFailReason(""); setReference(""); }} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Réessayer</button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Fermer</button>
          </div>
        </div>
      ) : stage === "pending" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
          <div className="text-center">
            <p className="font-semibold">En attente du paiement...</p>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (pollCount / 40) * 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Cela peut prendre jusqu'à 2 minutes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{pkg.name}</span>
              <span className="font-bold text-teal-400">{totalTx} Coins</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">KES {pkg.ksPrice}{currency !== "KES" && <span className="text-muted-foreground/60"> ≈ {format(pkg.ksPrice)}</span>}</p>
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
                {loading ? "Lancement..." : `Payer KES ${pkg.ksPrice}`}
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
                {loading ? "Chargement..." : `Payer par carte — KES ${pkg.ksPrice}`}
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

