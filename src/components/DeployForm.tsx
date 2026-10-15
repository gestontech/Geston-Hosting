import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deployBot } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { TxTopUpModal } from "@/components/TxTopUpModal";
import { Loader2, ExternalLink, Sparkles, Check, CreditCard, Smartphone, Apple } from "lucide-react";

interface DeployFormProps {
  onDeploy: (appName?: string) => void;
  coinBalance: number;
  initialTrial?: boolean;
}

function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function hasCountryCode(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length >= 10 && !cleaned.startsWith("0");
}

const DEPLOY_COST = 10;

export function DeployForm({ onDeploy, coinBalance, initialTrial = false }: DeployFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sessionVar, setSessionVar] = useState("");
  const [device, setDevice] = useState("android");
  const [isTrial, setIsTrial] = useState(initialTrial);
  const [loading, setLoading] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const { showToast } = useToast();
  const { refreshUser } = useAuth();

  useEffect(() => {
    setIsTrial(initialTrial);
  }, [initialTrial]);

  const insufficientBalance = !isTrial && coinBalance < DEPLOY_COST;

  const handleSubmit = async () => {
    if (insufficientBalance) {
      setTopUpOpen(true);
      return;
    }
    const cleaned = cleanPhoneNumber(phoneNumber);
    if (cleaned.length < 10) {
      showToast("Le numéro doit contenir au moins 10 chiffres", "error");
      return;
    }
    if (!hasCountryCode(phoneNumber)) {
      showToast("Le numéro doit inclure l'indicatif du pays (ex. 254123456789)", "error");
      return;
    }
    if (!sessionVar.trim()) {
      showToast("L'ID de session est requis", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await deployBot({
        phoneNumber: cleaned,
        sessionVar: sessionVar.trim(),
        isTrial,
        device,
        months: 1
      });
      if (res.success) {
        showToast(isTrial ? "Bot d'essai déployé !" : "Bot déployé ! Construction en ~2 minutes...", "success");
        const appName = res.bot?.herokuAppName || `gstnhost-${cleaned}`;
        setPhoneNumber("");
        setSessionVar("");
        onDeploy(appName);
      } else {
        if (res.code === "INSUFFICIENT_COINS") {
          showToast("Coins insuffisants — achetez-en ici sans quitter cette page", "error");
          setTopUpOpen(true);
        } else {
          showToast(res.error || "Échec du déploiement du bot", "error");
        }
      }
    } catch {
      showToast("Échec du déploiement du bot", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setIsTrial(!isTrial)}
        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
          isTrial
            ? "bg-gradient-to-r from-teal-500/20 to-orange-500/15 border-teal-500/70 text-teal-200"
            : "bg-gradient-to-r from-teal-500/8 to-orange-500/5 border-teal-500/40 text-foreground hover:border-teal-500/60 hover:from-teal-500/15 hover:to-orange-500/10"
        }`}
      >
        {!isTrial && (
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: "2s" }} />
        )}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isTrial ? "bg-teal-500/30" : "bg-teal-500/15"}`}>
          <Sparkles className="w-5 h-5 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold">Essai gratuit — 24 heures</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-500 text-white leading-none shrink-0">
              FREE
            </span>
          </div>
          <p className="text-xs mt-0.5 text-teal-300/80">Aucun Coins requis · Une fois par numéro · Disponible maintenant !</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${isTrial ? "bg-teal-500 border-teal-500" : "border-teal-500/50"}`}>
          {isTrial && <Check className="w-3 h-3 text-white" />}
        </div>
      </button>

      <div>
        <Label htmlFor="phone">Numéro WhatsApp</Label>
        <Input
          id="phone"
          placeholder="254123456789"
          value={phoneNumber}
          onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ""))}
          maxLength={15}
        />
        <p className="text-xs text-muted-foreground mt-1">Indicatif du pays + chiffres uniquement (ex. 254123456789)</p>
      </div>

      <div>
        <Label htmlFor="session">ID de session</Label>
        <Input
          id="session"
          placeholder="Collez votre chaîne de session ici"
          value={sessionVar}
          onChange={e => setSessionVar(e.target.value)}
        />
        <a
          href="https://gestontech.online/pairing"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 hover:underline transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Obtenir l'ID de session sur gestontech.online/pairing
        </a>
      </div>

      <div>
        <Label>Mode d'appareil</Label>
        <Select value={device} onValueChange={setDevice}>
          <SelectTrigger className="w-full h-10 mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom">
            <SelectItem value="android">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-green-400" />
                Android
              </div>
            </SelectItem>
            <SelectItem value="ios">
              <div className="flex items-center gap-2">
                <Apple className="w-3.5 h-3.5 text-blue-400" />
                iOS
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className={`mt-2 p-2.5 rounded-lg border text-xs ${device === "android" ? "bg-green-500/8 border-green-500/20 text-green-300" : "bg-blue-500/8 border-blue-500/20 text-blue-300"}`}>
          {device === "android" ? (
            <div className="flex items-start gap-2">
              <Smartphone className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-400" />
              <span><span className="font-semibold">Mode Android</span> — Expérience interactive complète. Le bot envoie des boutons interactifs, des menus, et des options de réponse rapide.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Apple className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
              <span><span className="font-semibold">Mode iOS</span> — Texte uniquement. Aucun bouton interactif. Les commandes fonctionnent mais les réponses sont en texte brut.</span>
            </div>
          )}
        </div>
      </div>

      {!isTrial && (
        <div className={`p-3 rounded-lg border text-sm transition-all ${
          insufficientBalance
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-muted/50 border-border text-muted-foreground"
        }`}>
          <div className="flex justify-between items-center">
            <span>Coût (1 mois)</span>
            <span className={`font-semibold ${insufficientBalance ? "text-red-400" : "text-foreground"}`}>{DEPLOY_COST} Coins</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span>Votre solde</span>
            <span className={`font-semibold ${insufficientBalance ? "text-red-400" : "text-teal-400"}`}>{coinBalance} Coins</span>
          </div>
          {insufficientBalance && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-red-400">Il vous faut {DEPLOY_COST - coinBalance} Coins de plus pour déployer.</p>
              <button
                type="button"
                onClick={() => setTopUpOpen(true)}
                className="text-xs font-semibold text-teal-300 underline underline-offset-2"
              >
                Appuyez ici pour acheter des Coins directement sans quitter cette page
              </button>
            </div>
          )}
        </div>
      )}

      <Button
        className={`w-full ${insufficientBalance ? "opacity-90" : ""}`}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Déploiement...
          </>
        ) : insufficientBalance ? (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Appuyez pour acheter des Coins sur cette page
          </>
        ) : (
          isTrial ? "Déployer l'essai gratuit" : `Déployer le bot — ${DEPLOY_COST} Coins / mois`
        )}
      </Button>

      <TxTopUpModal
        isOpen={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        requiredTx={Math.max(0, DEPLOY_COST - coinBalance)}
        onSuccess={async () => {
          await refreshUser();
          setTopUpOpen(false);
          showToast("Solde de Coins mis à jour — vous pouvez déployer maintenant", "success");
        }}
      />
    </div>
  );
}
