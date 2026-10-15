import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deployBotWithTemplate, getTemplateAppVars, getBotTemplateBySlug } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { useNavLoader } from "@/App";
import { Modal } from "@/components/Modal";
import { TxTopUpModal } from "@/components/TxTopUpModal";
import { GuestGuardModal } from "@/components/GuestGuard";
import type { BotTemplate } from "@/types";
import {
  ArrowLeft, Loader2, Smartphone, Apple, Rocket, ChevronDown, KeyRound, AlertCircle,
} from "lucide-react";

const DEPLOY_COST = 10;
const AUTO_VARS = new Set(["BOT_NAME", "HEROKU_APP_NAME", "HEROKU_API_KEY", "DEVICE"]);
const SESSION_KEYS = ["SESSION", "CREDS", "SESSION_ID", "SESSION_TOKEN", "AUTH"];
const SENSITIVE_KEYS = new Set(["HEROKU_API_KEY", "SESSION", "CREDS", "SESSION_ID", "SESSION_TOKEN", "AUTH", "API_KEY", "SECRET", "PASSWORD", "TOKEN"]);

function StepBadge({ number }: { number: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold shrink-0 text-primary-foreground">
      {number}
    </div>
  );
}

function sanitizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

function buildAppName(name: string): string {
  const clean = sanitizeName(name);
  const rand = Math.floor(100 + Math.random() * 900);
  return `gestonhost-${clean}${rand}`;
}

interface AppJsonEnvVar {
  description: string;
  required: boolean;
  value: string;
}

export function BotDeployPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();

  const [template, setTemplate] = useState<BotTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [botName, setBotName] = useState("");
  const [sessionVar, setSessionVar] = useState("");
  const [device, setDevice] = useState("android");
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [lowBalanceModal, setLowBalanceModal] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [guestModal, setGuestModal] = useState(false);

  const [appJsonEnv, setAppJsonEnv] = useState<Record<string, AppJsonEnvVar>>({});
  const [requiredVarValues, setRequiredVarValues] = useState<Record<string, string>>({});
  const [optionalVarValues, setOptionalVarValues] = useState<Record<string, string>>({});
  const [loadingAppJson, setLoadingAppJson] = useState(false);

  const getSessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug || authLoading) return;
    getBotTemplateBySlug(slug)
      .then((data) => {
        if (data && !(data as { error?: string }).error) setTemplate(data as BotTemplate);
        else navigate("/services/bots");
      })
      .catch(() => navigate("/services/bots"))
      .finally(() => setLoadingTemplate(false));
  }, [slug, navigate, authLoading]);

  useEffect(() => {
    if (!template || template.isDefault) return;
    let cancelled = false;
    setLoadingAppJson(true);
    setAppJsonEnv({});
    setRequiredVarValues({});
    setOptionalVarValues({});

    const applyVars = (
      vars: { key: string; description: string; required: boolean; value: string }[]
    ) => {
      const filtered: Record<string, AppJsonEnvVar> = {};
      const reqVals: Record<string, string> = {};
      const optVals: Record<string, string> = {};
      for (const v of vars) {
        if (AUTO_VARS.has(v.key) || AUTO_VARS.has(v.key.toUpperCase())) continue;
        const isReq = !!v.required;
        const defaultVal = v.value || "";
        filtered[v.key] = {
          description: v.description || v.key,
          required: isReq,
          value: defaultVal,
        };
        if (isReq) reqVals[v.key] = defaultVal;
        else optVals[v.key] = defaultVal;
      }
      setAppJsonEnv(filtered);
      setRequiredVarValues(reqVals);
      setOptionalVarValues(optVals);
    };

    (async () => {
      try {
        const data = await getTemplateAppVars(template._id);
        if (!cancelled && Array.isArray(data.vars) && data.vars.length > 0) {
          applyVars(data.vars);
          setLoadingAppJson(false);
          return;
        }
      } catch {
        /* fall through to direct GitHub fetch */
      }

      const match = String(template.githubRepo || "").match(
        /github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i
      );
      if (!match) {
        if (!cancelled) setLoadingAppJson(false);
        return;
      }
      const owner = match[1];
      const cleanRepo = match[2].replace(/\.git$/i, "");
      const branches = ["main", "master", "develop", "HEAD"];
      let appJson: {
        env?: Record<
          string,
          { description?: string; required?: boolean; value?: string; generator?: string }
        >;
      } | null = null;
      for (const branch of branches) {
        try {
          const r = await fetch(
            `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/app.json`,
            { headers: { Accept: "application/json", "User-Agent": "Geston-Hosting" } }
          );
          if (r.ok) {
            appJson = await r.json();
            break;
          }
        } catch {
          /* next branch */
        }
      }
      if (!cancelled && appJson?.env) {
        const list = Object.entries(appJson.env)
          .filter(([k]) => !AUTO_VARS.has(k) && !AUTO_VARS.has(k.toUpperCase()))
          .map(([k, v]) => {
            const hasDefault = !!(v.value || v.generator);
            const required = v.required !== false && !hasDefault;
            return {
              key: k,
              description: v.description || k,
              required,
              value: v.value || "",
            };
          });
        applyVars(list);
      }
      if (!cancelled) setLoadingAppJson(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [template]);

  if (authLoading || loadingTemplate) return <PageLoader />;
  if (!template) return <PageLoader />;

  const cost = template.costTx ?? DEPLOY_COST;
  const totalCost = cost * months;
  const txBalance = user ? user.txCoins : 0;
  const insufficientBalance = user ? user.txCoins < totalCost : true;

  const requiredKeys = Object.entries(appJsonEnv)
    .filter(([, v]) => v.required)
    .map(([k]) => k);
  const optionalKeys = Object.entries(appJsonEnv)
    .filter(([, v]) => !v.required)
    .map(([k]) => k);

  const handleDeploy = async () => {
    if (!user) {
      setGuestModal(true);
      return;
    }
    if (insufficientBalance) {
      setTopUpOpen(true);
      return;
    }
    const nameTrimmed = botName.trim();
    if (sanitizeName(nameTrimmed).length < 5) {
      showToast("Le nom doit contenir au moins 5 lettres (a-z)", "error");
      return;
    }

    if (template.isDefault) {
      const trimmedSession = sessionVar.trim();
      if (!trimmedSession) {
        showToast("L'ID de session est requis", "error");
        getSessionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const appName = buildAppName(nameTrimmed);
      setLoading(true);
      try {
        const res = (await deployBotWithTemplate({
          botTemplateId: template._id,
          botName: appName,
          sessionVar: trimmedSession,
          device,
          months,
        })) as { success?: boolean; error?: string; code?: string; bot?: { herokuAppName: string } };
        if (res.success) {
          showToast("Bot déployé ! Construction en ~2 minutes...", "success");
          localStorage.setItem(
            "deployingBot",
            JSON.stringify({ appName: res.bot?.herokuAppName || appName, startTime: Date.now() })
          );
          await refreshUser();
          navigate("/mybots");
        } else if (res.code === "INSUFFICIENT_COINS") {
          setLowBalanceModal(true);
        } else {
          showToast(res.error || "Échec du déploiement", "error");
        }
      } catch {
        showToast("Échec du déploiement — veuillez réessayer", "error");
      } finally {
        setLoading(false);
      }
    } else {
      const missingRequired = requiredKeys.filter((k) => !requiredVarValues[k]?.trim());
      if (missingRequired.length > 0) {
        showToast(`Veuillez remplir : ${missingRequired.join(", ")}`, "error");
        return;
      }

      const allVars: Record<string, string> = {};
      for (const [k, v] of Object.entries(requiredVarValues)) {
        if (v.trim()) allVars[k] = v.trim();
      }
      for (const [k, v] of Object.entries(optionalVarValues)) {
        if (v.trim()) allVars[k] = v.trim();
      }

      const sessionKey = Object.keys(allVars).find((k) =>
        SESSION_KEYS.includes(k.toUpperCase())
      );
      const sessionValue = sessionKey
        ? allVars[sessionKey]
        : Object.values(allVars)[0] || "placeholder";

      const appName = buildAppName(nameTrimmed);
      setLoading(true);
      try {
        const res = (await deployBotWithTemplate({
          botTemplateId: template._id,
          botName: appName,
          sessionVar: sessionValue,
          months,
          extraVars: allVars,
        })) as { success?: boolean; error?: string; code?: string; bot?: { herokuAppName: string } };
        if (res.success) {
          showToast("Bot déployé ! Construction en ~2 minutes...", "success");
          localStorage.setItem(
            "deployingBot",
            JSON.stringify({ appName: res.bot?.herokuAppName || appName, startTime: Date.now() })
          );
          await refreshUser();
          navigate("/mybots");
        } else if (res.code === "INSUFFICIENT_COINS") {
          setLowBalanceModal(true);
        } else {
          showToast(res.error || "Échec du déploiement", "error");
        }
      } catch {
        showToast("Échec du déploiement — veuillez réessayer", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <GuestGuardModal
        open={guestModal}
        onClose={() => setGuestModal(false)}
        message="Veuillez vous connecter ou vous inscrire pour déployer un bot."
      />
      <TechBackground />
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            <button
              onClick={() => navigateWithLoader("/services/bots")}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-base leading-tight">Déployer {template.name}</h1>
              <p className="text-xs text-muted-foreground">Remplissez attentivement les champs ci-dessous</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 relative z-[1] space-y-5 pb-24">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
            <StepBadge number={1} />
            <div className="flex-1">
              <p className="font-semibold text-sm">Nom du bot</p>
              <p className="text-xs text-muted-foreground">Au moins 5 lettres</p>
            </div>
          </div>
          <div className="p-4">
            <Label htmlFor="botname">Nom</Label>
            <Input
              id="botname"
              placeholder="ex. mybot"
              value={botName}
              onChange={(e) => setBotName(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              maxLength={20}
              className="mt-1"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
            <StepBadge number={2} />
            <div className="flex-1">
              <p className="font-semibold text-sm">Durée</p>
              <p className="text-xs text-muted-foreground">{cost} Coins par mois</p>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMonths((m) => Math.max(1, m - 1))}
              disabled={months <= 1}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-40"
            >
              −
            </button>
            <div className="text-center">
              <p className="text-2xl font-bold">{months}</p>
              <p className="text-xs text-muted-foreground">mois</p>
            </div>
            <button
              type="button"
              onClick={() => setMonths((m) => Math.min(9, m + 1))}
              disabled={months >= 9}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {template.isDefault ? (
          <div ref={getSessionRef} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
              <StepBadge number={3} />
              <div className="flex-1">
                <p className="font-semibold text-sm">ID de session</p>
                <p className="text-xs text-muted-foreground">Collez la chaîne de session complète</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                placeholder="Collez votre ID de session complet ici"
                value={sessionVar}
                onChange={(e) => setSessionVar(e.target.value)}
                rows={4}
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
              />
              <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">Un ID de session valide est très long — collez la valeur complète.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
              <StepBadge number={3} />
              <div className="flex-1">
                <p className="font-semibold text-sm">Variables requises</p>
                <p className="text-xs text-muted-foreground">Depuis l'app.json de ce bot</p>
              </div>
            </div>
            <div className="p-4">
              {loadingAppJson ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : requiredKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Aucune variable requise pour ce bot.</p>
              ) : (
                <div className="space-y-3">
                  {requiredKeys.map((k) => (
                    <div key={k}>
                      <Label htmlFor={k} className="flex items-center gap-1.5">
                        {SENSITIVE_KEYS.has(k) && <KeyRound className="w-3.5 h-3.5 text-amber-400" />}
                        {k}
                      </Label>
                      {appJsonEnv[k]?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 mb-1">{appJsonEnv[k].description}</p>
                      )}
                      {SENSITIVE_KEYS.has(k) ? (
                        <textarea
                          id={k}
                          placeholder={appJsonEnv[k]?.description || k}
                          value={requiredVarValues[k] || ""}
                          onChange={(e) =>
                            setRequiredVarValues((prev) => ({ ...prev, [k]: e.target.value }))
                          }
                          rows={3}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
                        />
                      ) : (
                        <Input
                          id={k}
                          placeholder={appJsonEnv[k]?.description || k}
                          value={requiredVarValues[k] || ""}
                          onChange={(e) =>
                            setRequiredVarValues((prev) => ({ ...prev, [k]: e.target.value }))
                          }
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!template.isDefault && optionalKeys.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setOptionalOpen((o) => !o)}
            >
              <span className="text-sm font-medium">Variables optionnelles ({optionalKeys.length})</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${optionalOpen ? "rotate-180" : ""}`}
              />
            </button>
            {optionalOpen && (
              <div className="p-4 pt-0 border-t border-border space-y-3">
                {optionalKeys.map((k) => (
                  <div key={k}>
                    <Label htmlFor={`opt-${k}`}>{k}</Label>
                    {appJsonEnv[k]?.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 mb-1">{appJsonEnv[k].description}</p>
                    )}
                    <Input
                      id={`opt-${k}`}
                      placeholder={appJsonEnv[k]?.description || k}
                      value={optionalVarValues[k] || ""}
                      onChange={(e) =>
                        setOptionalVarValues((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {template.isDefault && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
              <StepBadge number={4} />
              <div className="flex-1">
                <p className="font-semibold text-sm">Appareil</p>
                <p className="text-xs text-muted-foreground">Type de client WhatsApp</p>
              </div>
              <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
            <div className="p-4">
              <Select value={device} onValueChange={setDevice}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Android
                    </div>
                  </SelectItem>
                  <SelectItem value="ios">
                    <div className="flex items-center gap-2">
                      <Apple className="w-4 h-4" />
                      iOS
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Button className="w-full" size="lg" onClick={handleDeploy} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Déploiement...
            </>
          ) : !user ? (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Connectez-vous pour déployer
            </>
          ) : insufficientBalance ? (
            "Appuyez pour acheter des Coins sur cette page"
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Déployer le bot ({totalCost} Coins)
            </>
          )}
        </Button>
      </main>

      <Modal
        isOpen={lowBalanceModal}
        onClose={() => setLowBalanceModal(false)}
        title="Solde de Coins insuffisant"
      >
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            Il vous faut {totalCost} Coins pour déployer ce bot mais vous n'en avez que {txBalance}.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              setLowBalanceModal(false);
              setTopUpOpen(true);
            }}
          >
            Acheter des Coins sur cette page
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setLowBalanceModal(false)}>
            Annuler
          </Button>
        </div>
      </Modal>
      <TxTopUpModal
        isOpen={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        requiredTx={Math.max(0, totalCost - txBalance)}
        onSuccess={() => {
          refreshUser();
          setTopUpOpen(false);
        }}
      />
    </div>
  );
}
