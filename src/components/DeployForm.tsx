import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deployBot } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import {
  Loader2,
  ExternalLink,
  Sparkles,
  Check,
  Smartphone,
  Apple,
} from "lucide-react";

interface DeployFormProps {
  onDeploy: (appName?: string) => void;
  initialTrial?: boolean;
}

function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function hasCountryCode(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length >= 10 && !cleaned.startsWith("0");
}

export function DeployForm({
  onDeploy,
  initialTrial = false,
}: DeployFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sessionVar, setSessionVar] = useState("");
  const [device, setDevice] = useState("android");
  const [isTrial, setIsTrial] = useState(initialTrial);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setIsTrial(initialTrial);
  }, [initialTrial]);

  const handleSubmit = async () => {
    const cleaned = cleanPhoneNumber(phoneNumber);

    if (cleaned.length < 10) {
      showToast(
        "Le numéro doit contenir au moins 10 chiffres",
        "error",
      );
      return;
    }

    if (!hasCountryCode(phoneNumber)) {
      showToast(
        "Le numéro doit inclure l'indicatif du pays (ex. 254123456789)",
        "error",
      );
      return;
    }

    if (!sessionVar.trim()) {
      showToast(
        "L'ID de session est requis",
        "error",
      );
      return;
    }

    setLoading(true);

    try {
      const res = await deployBot({
        phoneNumber: cleaned,
        sessionVar: sessionVar.trim(),
        isTrial,
        device,
        months: 1,
      });

      if (res.success) {
        showToast(
          isTrial
            ? "Bot d'essai déployé !"
            : "Bot déployé gratuitement ! Construction en ~2 minutes...",
          "success",
        );

        const appName =
          res.bot?.herokuAppName ||
          `gstnhost-${cleaned}`;

        setPhoneNumber("");
        setSessionVar("");

        onDeploy(appName);
      } else {
        showToast(
          res.error || "Échec du déploiement du bot",
          "error",
        );
      }
    } catch {
      showToast(
        "Échec du déploiement du bot",
        "error",
      );
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
          <div
            className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent animate-pulse pointer-events-none"
            style={{ animationDuration: "2s" }}
          />
        )}

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isTrial
              ? "bg-teal-500/30"
              : "bg-teal-500/15"
          }`}
        >
          <Sparkles className="w-5 h-5 text-teal-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold">
              Essai gratuit — 24 heures
            </p>

            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-500 text-white leading-none shrink-0">
              FREE
            </span>
          </div>

          <p className="text-xs mt-0.5 text-teal-300/80">
            Aucun paiement requis · Une fois par numéro · Disponible maintenant !
          </p>
        </div>

        <div
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
            isTrial
              ? "bg-teal-500 border-teal-500"
              : "border-teal-500/50"
          }`}
        >
          {isTrial && (
            <Check className="w-3 h-3 text-white" />
          )}
        </div>
      </button>

      <div>
        <Label htmlFor="phone">
          Numéro WhatsApp
        </Label>

        <Input
          id="phone"
          placeholder="254123456789"
          value={phoneNumber}
          onChange={(e) =>
            setPhoneNumber(
              e.target.value.replace(
                /[^0-9\s]/g,
                "",
              ),
            )
          }
          maxLength={15}
        />

        <p className="text-xs text-muted-foreground mt-1">
          Indicatif du pays + chiffres uniquement
          (ex. 254123456789)
        </p>
      </div>

      <div>
        <Label htmlFor="session">
          ID de session
        </Label>

        <Input
          id="session"
          placeholder="Collez votre chaîne de session ici"
          value={sessionVar}
          onChange={(e) =>
            setSessionVar(e.target.value)
          }
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

        <Select
          value={device}
          onValueChange={setDevice}
        >
          <SelectTrigger className="w-full h-10 mt-1">
            <SelectValue />
          </SelectTrigger>

          <SelectContent
            position="popper"
            side="bottom"
          >
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

        <div
          className={`mt-2 p-2.5 rounded-lg border text-xs ${
            device === "android"
              ? "bg-green-500/8 border-green-500/20 text-green-300"
              : "bg-blue-500/8 border-blue-500/20 text-blue-300"
          }`}
        >
          {device === "android" ? (
            <div className="flex items-start gap-2">
              <Smartphone className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-400" />

              <span>
                <span className="font-semibold">
                  Mode Android
                </span>{" "}
                — Expérience interactive complète. Le bot
                envoie des boutons interactifs, des menus,
                et des options de réponse rapide.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Apple className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />

              <span>
                <span className="font-semibold">
                  Mode iOS
                </span>{" "}
                — Texte uniquement. Aucun bouton
                interactif. Les commandes fonctionnent
                mais les réponses sont en texte brut.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/10 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Déploiement
          </span>

          <span className="font-semibold text-green-400">
            Gratuit
          </span>
        </div>

        <p className="text-xs text-green-300/80 mt-1">
          Aucun paiement ni solde requis. Le bot est
          déployé directement sur l'infrastructure disponible.
        </p>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Déploiement...
          </>
        ) : (
          <>
            <RocketIcon />
            {isTrial
              ? "Déployer l'essai gratuit"
              : "Déployer le bot gratuitement"}
          </>
        )}
      </Button>
    </div>
  );
}

function RocketIcon() {
  return (
    <svg
      className="w-4 h-4 mr-2"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.63-6.05 11a22.35 22.35 0 0 1-3.95 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      <circle cx="16" cy="8" r="1" />
    </svg>
  );
}
