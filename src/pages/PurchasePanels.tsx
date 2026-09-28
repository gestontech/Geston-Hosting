import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import {
  getPanelPlans,
  purchasePanel,
  purchaseAdminPanel,
} from "@/lib/api";
import type { PanelPlan } from "@/types";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { AppLogoIcon } from "@/components/AppLogo";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft,
  Loader2,
  Shield,
  Server,
  LayoutDashboard,
  BookOpen,
  UserCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Menu,
  X,
  Bot,
  Check,
  Star,
  Crown,
  Zap,
  Copy,
  Eye,
  EyeOff,
  Mail,
  AtSign,
  Lock,
} from "lucide-react";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return {
    theme,
    toggle: () =>
      setTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}

function AnimatedLogo() {
  return (
    <div className="w-8 h-8 flex items-center justify-center">
      <AppLogoIcon className="w-6 h-6 text-primary" />
    </div>
  );
}

function AnimatedCheck({ size = 56 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 52 52"
      width={size}
      height={size}
      style={{ display: "block" }}
    >
      <circle
        cx="26"
        cy="26"
        r="25"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2.5"
      />
      <path
        fill="none"
        stroke="#22c55e"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 27 L22 35 L38 18"
      />
    </svg>
  );
}

function AnimatedXIcon({ size = 56 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 52 52"
      width={size}
      height={size}
      style={{ display: "block" }}
    >
      <circle
        cx="26"
        cy="26"
        r="25"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2.5"
      />
      <path
        fill="none"
        stroke="#ef4444"
        strokeWidth="4"
        strokeLinecap="round"
        d="M16 16 L36 36"
      />
      <path
        fill="none"
        stroke="#ef4444"
        strokeWidth="4"
        strokeLinecap="round"
        d="M36 16 L16 36"
      />
    </svg>
  );
}

function OrbitalLoader() {
  return (
    <div
      className="relative flex items-center justify-center mx-auto"
      style={{ width: 130, height: 130 }}
    >
      <div className="absolute animate-spin">
        <div className="w-3 h-3 rounded-full bg-teal-400 shadow-lg" />
      </div>

      <div className="absolute animate-spin [animation-delay:-500ms]">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-lg" />
      </div>

      <div className="absolute animate-spin [animation-delay:-1000ms]">
        <div className="w-2 h-2 rounded-full bg-amber-400 shadow-lg" />
      </div>

      <div className="w-16 h-16 rounded-full bg-teal-500/20 border-2 border-teal-500/40 flex items-center justify-center">
        <Server className="w-7 h-7 text-teal-400" />
      </div>
    </div>
  );
}

function CopyButton({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
        copied
          ? "bg-green-500/15 border-green-500/30 text-green-400"
          : "bg-muted border-border text-muted-foreground hover:text-foreground"
      }`}
      title={`Copier ${label || ""}`}
    >
      {copied ? (
        <Check className="w-3 h-3" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}

type WizardStep =
  | "email"
  | "username"
  | "password"
  | "loading"
  | "success"
  | "failed";

interface PurchasedInfo {
  email: string;
  username: string;
  password: string;
  loginUrl: string;
}

export function PurchasePanels() {
  const {
    user,
    loading: authLoading,
    logout,
    isAdmin,
    refreshUser,
  } = useAuth();

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
  const [purchasedInfo, setPurchasedInfo] =
    useState<PurchasedInfo | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!navOpen) return;

    lockScroll();

    return () => {
      unlockScroll();
    };
  }, [navOpen]);

  useEffect(() => {
    if (!wizardStep) return;

    lockScroll();

    return () => {
      unlockScroll();
    };
  }, [wizardStep]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    getPanelPlans()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setPlans(data);
        }
      })
      .catch(() => {
        if (mounted) {
          showToast(
            "Échec du chargement des forfaits de panel",
            "error"
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user, showToast]);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <PageLoader />;
  }

  const suggestUsername = (email: string) => {
    return (
      email
        .split("@")[0]
        .replace(/[^a-z0-9_]/gi, "")
        .toLowerCase()
        .slice(0, 20) || "user"
    );
  };

  const openWizard = (
    plan: PanelPlan | null,
    adminPurchase = false
  ) => {
    setActivePlan(plan);
    setIsAdminPurchase(adminPurchase);
    setWizardEmail(user.email);
    setWizardUsername(
      user.username || suggestUsername(user.email)
    );
    setWizardPassword("");
    setShowPassword(false);
    setFailMessage("");
    setPurchasedInfo(null);
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
    if (
      !wizardEmail.trim() ||
      !wizardUsername.trim() ||
      !wizardPassword.trim()
    ) {
      showToast("Tous les champs sont requis", "error");
      return;
    }

    const usernameClean = wizardUsername.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,32}$/.test(usernameClean)) {
      showToast(
        "Nom d'utilisateur : 3 à 32 caractères, lettres, chiffres et underscores uniquement",
        "error"
      );
      return;
    }

    if (wizardPassword.trim().length < 6) {
      showToast(
        "Le mot de passe doit contenir au moins 6 caractères",
        "error"
      );
      return;
    }

    if (!isAdminPurchase && !activePlan) {
      setFailMessage("Aucun forfait sélectionné.");
      setWizardStep("failed");
      return;
    }

    setWizardStep("loading");

    try {
      const options = {
        panelEmail: wizardEmail.trim(),
        panelUsername: usernameClean,
        panelPassword: wizardPassword.trim(),
      };

      const result = (
        isAdminPurchase
          ? await purchaseAdminPanel(options)
          : await purchasePanel(activePlan!._id, options)
      ) as {
        success?: boolean;
        error?: string;
        code?: string;
        panel?: {
          panelEmail: string;
          panelUsername: string;
          panelPassword: string;
          panelLoginUrl: string;
        };
      };

      if (result.success && result.panel) {
        setPurchasedInfo({
          email: result.panel.panelEmail || wizardEmail.trim(),
          username: result.panel.panelUsername,
          password: result.panel.panelPassword,
          loginUrl: result.panel.panelLoginUrl,
        });

        await refreshUser();
        setWizardStep("success");
        return;
      }

      setFailMessage(
        result.error ||
          "La création du panel a échoué. Veuillez réessayer."
      );
      setWizardStep("failed");
    } catch {
      setFailMessage(
        "Une erreur est survenue pendant la création du panel. Veuillez réessayer."
      );
      setWizardStep("failed");
    }
  };

  const navItems = [
    {
      label: "Tableau de bord",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      label: "Docs",
      icon: BookOpen,
      path: "/docs",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <TechBackground />

      {wizardStep && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            {(wizardStep === "email" ||
              wizardStep === "username" ||
              wizardStep === "password") && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">
                      {wizardStep === "email" &&
                        "E-mail du panel"}
                      {wizardStep === "username" &&
                        "Nom d'utilisateur du panel"}
                      {wizardStep === "password" &&
                        "Mot de passe du panel"}
                    </h2>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isAdminPurchase
                        ? "Accès Panel Admin"
                        : activePlan?.name}{" "}
                      — Gratuit
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeWizard}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {(["email", "username", "password"] as const).map(
                    (step, index) => (
                      <div
                        key={step}
                        className={`h-1 flex-1 rounded-full ${
                          index <=
                          ["email", "username", "password"].indexOf(
                            wizardStep
                          )
                            ? "bg-teal-500"
                            : "bg-muted"
                        }`}
                      />
                    )
                  )}
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
                      onChange={(event) =>
                        setWizardEmail(event.target.value)
                      }
                      placeholder="your@email.com"
                      autoFocus
                    />

                    <p className="text-xs text-muted-foreground">
                      Pré-rempli avec l'e-mail de votre compte.
                    </p>

                    <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                        <span>
                          Ce service est fourni gratuitement.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === "username" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-teal-400" />
                      Nom d'utilisateur du panel
                    </Label>

                    <Input
                      value={wizardUsername}
                      onChange={(event) =>
                        setWizardUsername(
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "")
                        )
                      }
                      placeholder="yourusername"
                      autoFocus
                    />

                    <p className="text-xs text-muted-foreground">
                      3 à 32 caractères, lettres minuscules, chiffres
                      et underscores uniquement.
                    </p>
                  </div>
                )}

                {wizardStep === "password" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-teal-400" />
                      Mot de passe du panel
                    </Label>

                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={wizardPassword}
                        onChange={(event) =>
                          setWizardPassword(event.target.value)
                        }
                        placeholder="Min. 6 caractères"
                        className="pr-10"
                        autoFocus
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label={
                          showPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Ce mot de passe servira pour votre connexion au
                      panel Pterodactyl.
                    </p>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">
                          {wizardEmail}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <AtSign className="w-3 h-3" />
                        <span>{wizardUsername}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (wizardStep === "email") {
                        closeWizard();
                      } else if (wizardStep === "username") {
                        setWizardStep("email");
                      } else {
                        setWizardStep("username");
                      }
                    }}
                  >
                    {wizardStep === "email" ? "Annuler" : "Retour"}
                  </Button>

                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (wizardStep === "email") {
                        if (
                          !wizardEmail.trim() ||
                          !wizardEmail.includes("@")
                        ) {
                          showToast(
                            "Saisissez un e-mail valide",
                            "error"
                          );
                          return;
                        }

                        setWizardStep("username");
                        return;
                      }

                      if (wizardStep === "username") {
                        const username = wizardUsername
                          .trim()
                          .toLowerCase();

                        if (
                          !/^[a-z0-9_]{3,32}$/.test(username)
                        ) {
                          showToast(
                            "Nom d'utilisateur invalide",
                            "error"
                          );
                          return;
                        }

                        setWizardStep("password");
                        return;
                      }

                      handleConfirmPurchase();
                    }}
                  >
                    {wizardStep === "password"
                      ? "Créer gratuitement"
                      : "Suivant"}
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === "loading" && (
              <div className="p-8 flex flex-col items-center gap-5 text-center">
                <OrbitalLoader />

                <div>
                  <p className="text-base font-bold">
                    Création de votre panel...
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Configuration de votre environnement serveur.
                    Veuillez patienter.
                  </p>
                </div>
              </div>
            )}

            {wizardStep === "success" && purchasedInfo && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <AnimatedCheck size={64} />

                  <div>
                    <h2 className="text-lg font-bold">
                      Panel prêt !
                    </h2>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      Conservez vos identifiants en lieu sûr.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 bg-muted/50 rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[10px] uppercase">
                        E-mail
                      </p>
                      <p className="font-mono font-semibold truncate">
                        {purchasedInfo.email}
                      </p>
                    </div>

                    <CopyButton text={purchasedInfo.email} label="email" />
                  </div>

                  <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[10px] uppercase">
                        Nom d'utilisateur
                      </p>
                      <p className="font-mono font-semibold truncate">
                        {purchasedInfo.username}
                      </p>
                    </div>

                    <CopyButton
                      text={purchasedInfo.username}
                      label="username"
                    />
                  </div>

                  <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[10px] uppercase">
                        Mot de passe
                      </p>
                      <p className="font-mono font-semibold truncate">
                        {purchasedInfo.password}
                      </p>
                    </div>

                    <CopyButton
                      text={purchasedInfo.password}
                      label="password"
                    />
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
                  type="button"
                  onClick={closeWizard}
                  className="w-full h-9 text-sm text-muted-foreground hover:text-foreground"
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
                    <h2 className="text-base font-bold text-red-400">
                      Échec de la création
                    </h2>

                    <p className="text-xs text-muted-foreground mt-1">
                      {failMessage}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Aucun paiement n'est nécessaire pour ce service.
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={closeWizard}
                  >
                    Fermer
                  </Button>

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
              <button
                type="button"
                className="p-2 -ml-2 rounded-lg hover:bg-muted"
                onClick={() => setNavOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <AnimatedLogo />
                <span className="font-bold text-base">
                  Geston Hosting
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-muted"
                aria-label="Changer de thème"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <button
                type="button"
                onClick={() => navigateWithLoader("/profile")}
                className="p-2 rounded-lg hover:bg-muted"
                aria-label="Profil"
              >
                <UserCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {navOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-[110] transform transition-transform duration-300 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <AnimatedLogo />
            <span className="font-bold text-base">
              Geston Hosting
            </span>
          </div>

          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="p-2 rounded-lg hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          <div className="mb-5 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <p className="text-xs font-semibold text-teal-400">
              Service gratuit
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les panels disponibles peuvent être créés sans
              paiement.
            </p>
          </div>

          <nav className="space-y-0.5 flex-1">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.path}
                onClick={() => {
                  navigateWithLoader(item.path);
                  setNavOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                navigateWithLoader("/services/bots");
                setNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-4 h-4" />
                Déploiement de bot
              </div>

              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              type="button"
              onClick={() => {
                navigateWithLoader("/services/panels");
                setNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                Panels
              </div>

              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  navigateWithLoader("/admin");
                  setNavOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" />
                  Panneau admin
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            )}
          </nav>

          <div className="border-t border-border pt-3 mt-3">
            <button
              type="button"
              onClick={() => {
                navigateWithLoader("/profile");
                setNavOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <UserCircle className="w-4 h-4" />
              Profil
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-[1]">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Panels gratuits
            </h1>

            <p className="text-sm text-muted-foreground mt-0.5">
              Choisissez un environnement Pterodactyl et créez-le
              gratuitement.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              Aucun forfait de panel disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isUnlimitedPlan = [
                plan.ram,
                plan.disk,
                plan.cpu,
              ].some((value) =>
                (value || "")
                  .toLowerCase()
                  .includes("unlimited")
              );

              return (
                <div
                  key={plan._id}
                  className={`relative rounded-xl border bg-card p-5 flex flex-col ${
                    plan.isBestDeal || isUnlimitedPlan
                      ? "border-teal-500/40 ring-1 ring-teal-500/20"
                      : "border-border"
                  }`}
                >
                  {(plan.isBestDeal || isUnlimitedPlan) && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-teal-500 text-white text-[10px] font-semibold">
                        <Star className="w-2.5 h-2.5" />
                        {isUnlimitedPlan
                          ? "RECOMMANDÉ"
                          : "MEILLEURE OFFRE"}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="font-bold text-base">
                      {plan.name}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 mb-5 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        RAM
                      </span>
                      <span className="font-medium">
                        {plan.ram}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Disque
                      </span>
                      <span className="font-medium">
                        {plan.disk}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        CPU
                      </span>
                      <span className="font-medium">
                        {plan.cpu}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-teal-400">
                        Gratuit
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aucun paiement nécessaire
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => openWizard(plan)}
                  >
                    Créer gratuitement
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <div className="mt-6">
            <div className="relative rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 p-5 pt-8">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-bold">
                  <Crown className="w-2.5 h-2.5" />
                  ACCÈS ADMIN
                </span>
              </div>

              <div className="flex items-start gap-4 mt-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-amber-300">
                    Accès Panel Admin
                  </h3>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pleins privilèges d'administrateur sur le panel
                    Pterodactyl.
                  </p>

                  <div className="mt-2 space-y-1">
                    {[
                      "Gérer tous les serveurs et utilisateurs",
                      "Accès aux contrôles de nodes et allocations",
                      "Accès complet au tableau de bord du panel",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-1.5 text-xs text-amber-200/80"
                      >
                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <span className="text-2xl font-extrabold text-amber-400">
                    Gratuit
                  </span>

                  <span className="text-xs text-muted-foreground ml-2">
                    accès unique
                  </span>
                </div>

                <Button
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold border-0"
                  onClick={() => openWizard(null, true)}
                >
                  Créer gratuitement
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
