import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getPanelPlans, purchasePanel, purchaseAdminPanel } from "@/lib/api";
import type { PanelPlan } from "@/types";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { AppLogoIcon } from "@/components/AppLogo";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft, Coins, Loader2, Shield, Server,
  LayoutDashboard, CreditCard, BookOpen, UserCircle, LogOut,
  ChevronRight, Moon, Sun, Menu, X, Bot, Check, Star, Crown, Zap, Copy, Eye, EyeOff, Mail, AtSign, Lock
} from "lucide-react";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);
  return { theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

function AnimatedLogo() {
  return (
    <div className="w-8 h-8 flex items-center justify-center" style={{ perspective: "100px" }}>
      <style>{`@keyframes ppTxSpin{0%{transform:rotateY(0deg)}28%{transform:rotateY(360deg)}54%{transform:rotateY(360deg)}82%{transform:rotateY(720deg)}100%{transform:rotateY(720deg)}}`}</style>
      <div style={{ animation: "ppTxSpin 4s cubic-bezier(0.4,0,0.2,1) infinite", willChange: "transform", transformStyle: "preserve-3d" }}>
        <span style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.9))" }}><AppLogoIcon className="w-6 h-6 text-primary" /></span>
      </div>
    </div>
  );
}

function AnimatedCheck({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} style={{ display: "block" }}>
      <style>{`
        @keyframes chkCircle{0%{stroke-dashoffset:166;opacity:0}60%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}
        @keyframes chkMark{0%{stroke-dashoffset:100;opacity:0}40%{opacity:0}100%{stroke-dashoffset:0;opacity:1}}
        @keyframes chkPop{0%{transform:scale(0.7)}70%{transform:scale(1.1)}100%{transform:scale(1)}}
      `}</style>
      <g style={{ animation: "chkPop 0.5s cubic-bezier(0.22,1,0.36,1) forwards" }}>
        <circle cx="26" cy="26" r="25" fill="none" stroke="#22c55e" strokeWidth="2.5"
          style={{ strokeDasharray: 166, strokeDashoffset: 166, animation: "chkCircle 0.6s ease-out forwards" }} />
        <path fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          d="M14 27 L22 35 L38 18"
          style={{ strokeDasharray: 100, strokeDashoffset: 100, animation: "chkMark 0.5s ease-out 0.35s forwards" }} />
      </g>
    </svg>
  );
}

function AnimatedXIcon({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} style={{ display: "block" }}>
      <style>{`
        @keyframes xCircle{0%{stroke-dashoffset:166;opacity:0}60%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}
        @keyframes xLine1{0%{stroke-dashoffset:60;opacity:0}30%{opacity:0}100%{stroke-dashoffset:0;opacity:1}}
        @keyframes xLine2{0%{stroke-dashoffset:60;opacity:0}50%{opacity:0}100%{stroke-dashoffset:0;opacity:1}}
        @keyframes xPop{0%{transform:scale(0.7)}70%{transform:scale(1.1)}100%{transform:scale(1)}}
      `}</style>
      <g style={{ animation: "xPop 0.5s cubic-bezier(0.22,1,0.36,1) forwards" }}>
        <circle cx="26" cy="26" r="25" fill="none" stroke="#ef4444" strokeWidth="2.5"
          style={{ strokeDasharray: 166, strokeDashoffset: 166, animation: "xCircle 0.6s ease-out forwards" }} />
        <path fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" d="M16 16 L36 36"
          style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: "xLine1 0.4s ease-out 0.3s forwards" }} />
        <path fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" d="M36 16 L16 36"
          style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: "xLine2 0.4s ease-out 0.45s forwards" }} />
      </g>
    </svg>
  );
}

function OrbitalLoader() {
  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: 130, height: 130 }}>
      <style>{`
        @keyframes orb1{from{transform:rotate(0deg) translateX(52px) rotate(0deg)}to{transform:rotate(360deg) translateX(52px) rotate(-360deg)}}
        @keyframes orb2{from{transform:rotate(120deg) translateX(52px) rotate(-120deg)}to{transform:rotate(480deg) translateX(52px) rotate(-480deg)}}
        @keyframes orb3{from{transform:rotate(240deg) translateX(52px) rotate(-240deg)}to{transform:rotate(600deg) translateX(52px) rotate(-600deg)}}
        @keyframes orbCenter{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.92);opacity:0.7}}
      `}</style>
      <div className="absolute" style={{ animation: "orb1 1.4s linear infinite" }}>
        <div className="w-3.5 h-3.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
      </div>
      <div className="absolute" style={{ animation: "orb2 1.4s linear infinite" }}>
        <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
      </div>
      <div className="absolute" style={{ animation: "orb3 1.4s linear infinite" }}>
        <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
      </div>
      <div
        className="w-16 h-16 rounded-full bg-teal-500/20 border-2 border-teal-500/40 flex items-center justify-center"
        style={{ animation: "orbCenter 2s ease-in-out infinite" }}
      >
        <Server className="w-7 h-7 text-teal-400" />
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
        copied
          ? "bg-green-500/15 border-green-500/30 text-green-400"
          : "bg-muted border-border text-muted-foreground hover:text-foreground"
      }`}
      title={`Copier ${label || ""}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}

type WizardStep = "email" | "username" | "password" | "loading" | "success" | "failed";

interface PurchasedInfo {
  email: string;
  username: string;
  password: string;
  loginUrl: string;
}

export function PurchasePanels() {
  const { user, loading: authLoading, logout, isAdmin, refreshUser } = useAuth();
  const { currency, format } = useCurrency();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const [plans, setPlans] = useState<PanelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  const [activePlan, setActivePlan] = useState<PanelPlan | null>(null);
  const [isAdminPurchase, setIsAdminPurchase] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep | null>(null);
  const [wizardEmail, setWizardEmail] = useState("");
  const [wizardUsername, setWizardUsername] = useState("");
  const [wizardPassword, setWizardPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [failMessage, setFailMessage] = useState("");
  const [purchasedInfo, setPurchasedInfo] = useState<PurchasedInfo | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (navOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [navOpen]);

  useEffect(() => {
    if (wizardStep) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [wizardStep]);

  useEffect(() => {
    if (!user) return;
    getPanelPlans()
      .then(data => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => showToast("Échec du chargement des forfaits de panel", "error"))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return <PageLoader />;
  if (!user) return <PageLoader />;

  const suggestUsername = (email: string) => {
    return email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 20) || "user";
  };

  const openWizard = (plan: PanelPlan | null, adminPurchase = false) => {
    if (!user) return;
    const cost = adminPurchase ? 40 : plan?.txCost ?? 0;
    if (user.txCoins < cost) {
      showToast("Coins insuffisants — veuillez recharger", "error");
      navigateWithLoader("/topup");
      return;
    }
    setActivePlan(plan);
    setIsAdminPurchase(adminPurchase);
    setWizardEmail(user.email);
    setWizardUsername(user.username || suggestUsername(user.email));
    setWizardPassword("");
    setShowPassword(false);
    setWizardStep("email");
  };

  const closeWizard = () => {
    if (wizardStep === "loading") return;
    setWizardStep(null);
    setActivePlan(null);
    setIsAdminPurchase(false);
    setPurchasedInfo(null);
    setFailMessage("");
  };

  const handleConfirmPurchase = async () => {
    if (!wizardEmail.trim() || !wizardUsername.trim() || !wizardPassword.trim()) {
      showToast("Tous les champs sont requis", "error");
      return;
    }
    const usernameClean = wizardUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(usernameClean)) {
      showToast("Nom d'utilisateur : 3 à 32 caractères, lettres/chiffres/underscores uniquement", "error");
      return;
    }
    if (wizardPassword.trim().length < 6) {
      showToast("Le mot de passe doit contenir au moins 6 caractères", "error");
      return;
    }
    setWizardStep("loading");
    try {
      const opts = {
        panelEmail: wizardEmail.trim(),
        panelUsername: usernameClean,
        panelPassword: wizardPassword.trim(),
      };
      const res = (isAdminPurchase
        ? await purchaseAdminPanel(opts)
        : await purchasePanel(activePlan!._id, opts)) as {
        success?: boolean;
        error?: string;
        code?: string;
        panel?: { panelEmail: string; panelUsername: string; panelPassword: string; panelLoginUrl: string };
      };
      if (res.success && res.panel) {
        setPurchasedInfo({
          email: res.panel.panelEmail || wizardEmail.trim(),
          username: res.panel.panelUsername,
          password: res.panel.panelPassword,
          loginUrl: res.panel.panelLoginUrl,
        });
        await refreshUser();
        setWizardStep("success");
      } else if (res.code === "INSUFFICIENT_COINS") {
        setFailMessage("Coins insuffisants.");
        setWizardStep("failed");
      } else {
        setFailMessage(res.error || "Échec de l'achat. Veuillez réessayer.");
        setWizardStep("failed");
      }
    } catch {
      setFailMessage("Une erreur est survenue. Veuillez réessayer.");
      setWizardStep("failed");
    }
  };

  const planCost = isAdminPurchase ? 40 : activePlan?.txCost ?? 0;

  const navItems = [
    { label: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Recharger Coins", icon: CreditCard, path: "/topup" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <TechBackground />

      {wizardStep && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">

            {(wizardStep === "email" || wizardStep === "username" || wizardStep === "password") && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">
                      {wizardStep === "email" && "E-mail du panel"}
                      {wizardStep === "username" && "Nom d'utilisateur du panel"}
                      {wizardStep === "password" && "Mot de passe du panel"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isAdminPurchase ? "Accès Panel Admin" : activePlan?.name} — {planCost} Coins
                    </p>
                  </div>
                  <button onClick={closeWizard} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex gap-1.5 mb-1">
                  {(["email", "username", "password"] as const).map((s, i) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= ["email", "username", "password"].indexOf(wizardStep)
                          ? "bg-teal-500"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                {wizardStep === "email" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-teal-400" />
                      E-mail pour votre compte panel
                    </Label>
                    <Input
                      type="email"
                      value={wizardEmail}
                      onChange={e => setWizardEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Pré-rempli avec l'e-mail de votre compte. Vous pouvez le modifier.</p>
                    <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Forfait</span><span className="font-semibold">{isAdminPurchase ? "Accès Panel Admin" : activePlan?.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Coût</span><span className="font-bold text-teal-400">{planCost} Coins</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Votre solde</span><span className="font-semibold">{user.txCoins} Coins</span></div>
                    </div>
                  </div>
                )}

                {wizardStep === "username" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-teal-400" />
                      Nom d'utilisateur pour votre compte panel
                    </Label>
                    <Input
                      value={wizardUsername}
                      onChange={e => setWizardUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="yourusername"
                      className="w-full"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">3 à 32 caractères, lettres minuscules, chiffres, underscores uniquement.</p>
                  </div>
                )}

                {wizardStep === "password" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-teal-400" />
                      Choisissez un mot de passe pour le panel
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={wizardPassword}
                        onChange={e => setWizardPassword(e.target.value)}
                        placeholder="Min. 6 caractères"
                        className="w-full pr-10"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Vous l'utiliserez pour vous connecter au panel Pterodactyl. Conservez-le en lieu sûr.</p>
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{wizardEmail}</span></div>
                      <div className="flex items-center gap-1.5 text-muted-foreground"><AtSign className="w-3 h-3 shrink-0" /><span>{wizardUsername}</span></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (wizardStep === "email") closeWizard();
                      else if (wizardStep === "username") setWizardStep("email");
                      else if (wizardStep === "password") setWizardStep("username");
                    }}
                  >
                    {wizardStep === "email" ? "Annuler" : "Retour"}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (wizardStep === "email") {
                        if (!wizardEmail.trim() || !wizardEmail.includes("@")) { showToast("Saisissez un e-mail valide", "error"); return; }
                        setWizardStep("username");
                      } else if (wizardStep === "username") {
                        const u = wizardUsername.trim().toLowerCase();
                        if (!u || u.length < 3 || !/^[a-z0-9_]+$/.test(u)) { showToast("Nom d'utilisateur : 3 caractères min, lettres/chiffres/underscores uniquement", "error"); return; }
                        setWizardStep("password");
                      } else if (wizardStep === "password") {
                        handleConfirmPurchase();
                      }
                    }}
                  >
                    {wizardStep === "password" ? "Confirmer l'achat" : "Suivant"}
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === "loading" && (
              <div className="p-8 flex flex-col items-center gap-5 text-center">
                <OrbitalLoader />
                <div>
                  <p className="text-base font-bold">Attribution de votre panel...</p>
                  <p className="text-sm text-muted-foreground mt-1">Configuration de votre environnement serveur. Veuillez patienter.</p>
                </div>
              </div>
            )}

            {wizardStep === "success" && purchasedInfo && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <AnimatedCheck size={64} />
                  <div>
                    <h2 className="text-lg font-bold">Panel prêt !</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Conservez vos identifiants en lieu sûr. Vous pouvez aussi les revoir à tout moment dans Mes Panels.</p>
                  </div>
                </div>
                <div className="space-y-2 bg-muted/50 rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide mb-0.5">E-mail</p>
                      <p className="font-mono font-semibold truncate">{purchasedInfo.email}</p>
                    </div>
                    <CopyButton text={purchasedInfo.email} label="email" />
                  </div>
                  <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide mb-0.5">Nom d'utilisateur</p>
                      <p className="font-mono font-semibold truncate">{purchasedInfo.username}</p>
                    </div>
                    <CopyButton text={purchasedInfo.username} label="username" />
                  </div>
                  <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide mb-0.5">Mot de passe</p>
                      <p className="font-mono font-semibold truncate">{purchasedInfo.password}</p>
                    </div>
                    <CopyButton text={purchasedInfo.password} label="password" />
                  </div>
                </div>
                <a
                  href={purchasedInfo.loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Ouvrir le panel
                </a>
                <button
                  onClick={closeWizard}
                  className="w-full h-9 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Fermer
                </button>
              </div>
            )}

            {wizardStep === "failed" && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <AnimatedXIcon size={64} />
                  <div>
                    <h2 className="text-base font-bold text-red-400">Échec de l'achat</h2>
                    <p className="text-xs text-muted-foreground mt-1">{failMessage}</p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">Aucun Coins n'a été déduit de votre solde.</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={closeWizard}>Fermer</Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setFailMessage("");
                      setWizardStep("email");
                    }}
                  >
                    Réessayer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setNavOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2"><AnimatedLogo /><span className="font-bold text-base">GESTONX</span></div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-all">
                {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={() => navigateWithLoader("/profile")} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <UserCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {navOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setNavOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-[110] transform transition-transform duration-300 ease-out ${navOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5"><AnimatedLogo /><span className="font-bold text-base">GESTONX</span></div>
          <button onClick={() => setNavOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          {user && (
            <div className="mb-5 p-3 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-0.5">Connecté en tant que</p>
              <p className="text-sm font-semibold truncate">{user.email}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-sm font-bold text-teal-400">Solde : {user.txCoins} Coins</span>
              </div>
            </div>
          )}
          <nav className="space-y-0.5 flex-1">
            {navItems.map(item => (
              <button key={item.path} onClick={() => { navigateWithLoader(item.path); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <div className="flex items-center gap-2.5"><item.icon className="w-4 h-4" />{item.label}</div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            ))}
            <button onClick={() => { navigateWithLoader("/services/bots"); setNavOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <div className="flex items-center gap-2.5"><Bot className="w-4 h-4" />Déploiement de bot</div>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>
            <button onClick={() => { navigateWithLoader("/services/panels"); setNavOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground transition-all">
              <div className="flex items-center gap-2.5"><Shield className="w-4 h-4" />Panels</div>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>
            {isAdmin && (
              <button onClick={() => { navigateWithLoader("/admin"); setNavOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all">
                <div className="flex items-center gap-2.5"><Shield className="w-4 h-4" />Panneau admin</div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            )}
          </nav>
          <div className="space-y-0.5 border-t border-border pt-3 mt-3">
            <button onClick={() => { navigateWithLoader("/profile"); setNavOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <UserCircle className="w-4 h-4" />Profil
            </button>
            <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
              <LogOut className="w-4 h-4" />Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-[1]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Acheter des panels</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Choisissez un forfait de panel de serveur de jeu</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">Aucun forfait de panel disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => {
              const isUnlimitedPlan = [plan.ram, plan.disk, plan.cpu].some(v => (v || "").toLowerCase().includes("unlimited"));
              return (
              <div key={plan._id} className={`relative rounded-xl border bg-card p-5 flex flex-col ${plan.isBestDeal || isUnlimitedPlan ? "border-teal-500/40 ring-1 ring-teal-500/20" : "border-border"}`}>
                {(plan.isBestDeal || isUnlimitedPlan) && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-teal-500 text-white text-[10px] font-semibold">
                      <Star className="w-2.5 h-2.5" />{isUnlimitedPlan ? "RECOMMANDÉ" : "MEILLEURE OFFRE"}
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-bold text-base">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                </div>
                <div className="space-y-1.5 mb-5 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">RAM</span>
                    <span className="font-medium">{plan.ram}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Disque</span>
                    <span className="font-medium">{plan.disk}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-medium">{plan.cpu}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-teal-400">{plan.txCost} Coins</span>
                    {plan.originalTxCost > plan.txCost && (
                      <span className="text-xs text-muted-foreground line-through">{plan.originalTxCost} Coins</span>
                    )}
                  </div>
                  {currency !== "KES" && (
                    <p className="text-xs text-muted-foreground mt-0.5">≈ {format(plan.txCost * 5)}</p>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => user.txCoins < plan.txCost ? navigateWithLoader("/topup") : openWizard(plan)}
                >
                  {user.txCoins < plan.txCost ? "Recharger" : "Acheter"}
                </Button>
              </div>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <div className="mt-6">
            <div className="relative rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 p-5 pt-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-bold shadow-lg shadow-amber-500/30">
                  <Crown className="w-2.5 h-2.5" />ACCÈS ADMIN
                </span>
              </div>
              <div className="flex items-start gap-4 mt-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-amber-300">Accès Panel Admin</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Pleins privilèges d'administrateur sur le panel Pterodactyl</p>
                  <div className="mt-2 space-y-1">
                    {["Gérer tous les serveurs & utilisateurs", "Accès aux contrôles de nodes & allocations", "Accès complet au tableau de bord du panel"].map(f => (
                      <div key={f} className="flex items-center gap-1.5 text-xs text-amber-200/80">
                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <span className="text-2xl font-extrabold text-amber-400">40 Coins</span>
                  <span className="text-xs text-muted-foreground ml-2">unique</span>
                </div>
                <Button
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold border-0 shadow-lg shadow-amber-500/20"
                  onClick={() => user.txCoins < 40 ? navigateWithLoader("/topup") : openWizard(null, true)}
                >
                  {user.txCoins < 40 ? "Recharger" : "Acheter"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
