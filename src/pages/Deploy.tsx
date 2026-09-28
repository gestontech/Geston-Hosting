import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
import { useAuth } from "@/hooks/useAuth";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { useNavLoader } from "@/App";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Check,
  Smartphone,
  Apple,
  Sparkles,
  KeyRound,
  Hash,
  Rocket,
  ChevronRight,
  Copy,
  Info,
  AlertCircle,
} from "lucide-react";

function sanitizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

function buildAppName(name: string): string {
  const clean = sanitizeName(name);
  const rand = Math.floor(100 + Math.random() * 900);
  return `gestonhost-${clean}${rand}`;
}

function StepBadge({ number }: { number: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold shrink-0 text-primary-foreground">
      {number}
    </div>
  );
}

export function Deploy() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [botName, setBotName] = useState("");
  const [sessionVar, setSessionVar] = useState("");
  const [device, setDevice] = useState("android");

  const trialParam = searchParams.get("trial");
  const trialLocked = trialParam === "true";
  const trialHidden = trialParam === "false";

  const [isTrial, setIsTrial] = useState(
    () => trialLocked && !trialHidden,
  );

  const [loading, setLoading] = useState(false);

  const getSessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  const effectiveIsTrial = trialHidden ? false : isTrial;

  const handleDeploy = async () => {
    const nameTrimmed = botName.trim();

    if (sanitizeName(nameTrimmed).length < 5) {
      showToast(
        "Le nom doit contenir au moins 5 lettres (a-z)",
        "error",
      );
      return;
    }

    const trimmedSession = sessionVar.trim();

    if (!trimmedSession) {
      showToast(
        "L'ID de session est requis — obtenez-le à l'étape 1 ci-dessus",
        "error",
      );

      getSessionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    const appName = buildAppName(nameTrimmed);

    setLoading(true);

    try {
      const res = await deployBot({
        botName: appName,
        sessionVar: trimmedSession,
        isTrial: effectiveIsTrial,
        device,
        months: 1,
      });

      if (res.success) {
        showToast(
          effectiveIsTrial
            ? "Bot d'essai déployé gratuitement !"
            : "Bot déployé gratuitement ! Construction en ~2 minutes...",
          "success",
        );

        const finalName =
          res.bot?.herokuAppName || appName;

        localStorage.setItem(
          "deployingBot",
          JSON.stringify({
            appName: finalName,
            startTime: Date.now(),
          }),
        );

        await refreshUser();

        navigate("/mybots");
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
    <div className="min-h-screen bg-background relative">
      {loading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-background/90 backdrop-blur-sm">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
            <Rocket className="w-6 h-6 text-teal-400 absolute inset-0 m-auto" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-bold">
              Déploiement de votre bot...
            </p>

            <p className="text-sm text-muted-foreground">
              La construction prend environ 2 minutes.
              Veuillez patienter.
            </p>
          </div>
        </div>
      )}

      <TechBackground />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            <button
              type="button"
              onClick={() =>
                navigateWithLoader("/services/bots")
              }
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="font-bold text-base leading-tight">
                Deploy Geston MD
              </h1>

              <p className="text-xs text-muted-foreground">
                Déploiement gratuit de votre bot
              </p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 relative z-[1] space-y-5 pb-24">
        {!trialHidden && (
          <button
            type="button"
            onClick={
              trialLocked
                ? undefined
                : () => setIsTrial(!isTrial)
            }
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
              isTrial
                ? "bg-gradient-to-r from-teal-500/20 to-orange-500/15 border-teal-500/70 text-teal-200"
                : "bg-gradient-to-r from-teal-500/8 to-orange-500/5 border-teal-500/40 text-foreground hover:border-teal-500/60 hover:from-teal-500/15 hover:to-orange-500/10"
            } ${trialLocked ? "cursor-default" : ""}`}
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
                  GRATUIT
                </span>
              </div>

              <p className="text-xs mt-0.5 text-teal-300/80">
                Aucun paiement requis · Actif pendant 24 heures · Un par numéro WhatsApp
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

            {trialLocked && (
              <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                Sélectionné
              </span>
            )}
          </button>
        )}

        <div
          ref={getSessionRef}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
            <StepBadge number={1} />

            <div className="flex-1">
              <p className="font-semibold text-sm">
                Obtenez votre ID de session
              </p>

              <p className="text-xs text-muted-foreground">
                Vous devez le faire avant de déployer
              </p>
            </div>

            <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <div className="p-4 space-y-4">
            <div className="p-3 rounded-lg bg-blue-500/8 border border-blue-500/20 flex gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />

              <div className="text-xs text-blue-200 space-y-1">
                <p className="font-semibold text-blue-300">
                  Qu'est-ce qu'un ID de session ?
                </p>

                <p>
                  Un ID de session connecte votre compte WhatsApp
                  au bot. Vous l'obtenez en scannant un QR code ou
                  en saisissant un code de jumelage sur la page de
                  génération de session.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Un ID de session valide ressemble à ceci :
              </p>

              <div className="bg-muted rounded-lg p-3 font-mono text-xs text-muted-foreground break-all leading-relaxed border border-border/50 select-all">
                eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoid0RMcW9mS21xY1FBN2VzeUtSd1lBRDZER3BxVXhuam5ObjFOVUdkY0ZrTT0i...
              </div>

              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                C'est une chaîne très longue — assurez-vous de copier
                la valeur <span className="font-semibold text-foreground mx-0.5">entière</span>.
              </p>
            </div>

            <a
              href="https://gestontech.online/pairing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full p-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4" />
                Obtenir l'ID de session
              </div>

              <ChevronRight className="w-4 h-4 opacity-70" />
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
            <StepBadge number={2} />

            <div className="flex-1">
              <p className="font-semibold text-sm">
                Nom du bot
              </p>

              <p className="text-xs text-muted-foreground">
                Au moins 5 lettres
              </p>
            </div>

            <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <div className="p-4">
            <Label htmlFor="botname">
              Nom
            </Label>

            <Input
              id="botname"
              placeholder="ex. mybot ou johnbot"
              value={botName}
              onChange={(e) =>
                setBotName(
                  e.target.value.replace(
                    /[^a-zA-Z0-9]/g,
                    "",
                  ),
                )
              }
              maxLength={20}
              className="mt-1"
            />

            {botName && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                Nom de l'app :
                <span className="font-mono text-foreground ml-1">
                  gestonhost-{sanitizeName(botName)}###
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
            <StepBadge number={3} />

            <div className="flex-1">
              <p className="font-semibold text-sm">
                Collez votre ID de session
              </p>

              <p className="text-xs text-muted-foreground">
                Copié depuis l'étape 1
              </p>
            </div>

            <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <div className="p-4 space-y-3">
            <div>
              <Label htmlFor="session">
                ID de session
              </Label>

              <textarea
                id="session"
                placeholder="Collez votre ID de session complet ici — il commence par eyJ..."
                value={sessionVar}
                onChange={(e) =>
                  setSessionVar(e.target.value)
                }
                rows={4}
                className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />

              <div className="text-xs text-amber-200 space-y-0.5">
                <p className="font-semibold text-amber-300">
                  Collez la chaîne complète
                </p>

                <p>
                  Un ID de session valide est très long.
                  Assurez-vous de copier la valeur complète.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
            <StepBadge number={4} />

            <div className="flex-1">
              <p className="font-semibold text-sm">
                Mode d'appareil
              </p>

              <p className="text-xs text-muted-foreground">
                Comment le bot apparaît aux autres utilisateurs
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <Select
              value={device}
              onValueChange={setDevice}
            >
              <SelectTrigger className="w-full h-10">
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

            <div
              className={`p-3 rounded-lg border text-xs ${
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
                    — Expérience interactive complète.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Apple className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />

                  <span>
                    <span className="font-semibold">
                      Mode iOS
                    </span>{" "}
                    — Texte uniquement.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {!effectiveIsTrial && (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>

              <div>
                <p className="font-semibold text-sm text-teal-300">
                  Déploiement gratuit
                </p>

                <p className="text-xs text-teal-300/70">
                  Votre bot peut être déployé sans Coins ni paiement.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={handleDeploy}
          disabled={loading}
          className="w-full h-12 text-sm font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Déploiement en cours...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Déployer gratuitement
            </>
          )}
        </Button>
      </main>
    </div>
  );
}
