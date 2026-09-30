import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getBotTemplates } from "@/lib/api";
import { GuestGuardModal } from "@/components/GuestGuard";
import type { BotTemplate } from "@/types";
import { TechBackground } from "@/components/TechBackground";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  ExternalLink,
  LayoutDashboard,
  BookOpen,
  UserCircle,
  LogOut,
  Shield,
  ChevronRight,
  Moon,
  Sun,
  Menu,
  X,
  Bot,
  Copy,
  Check,
  LogIn,
  UserPlus,
  Zap,
  Star,
  Flame,
} from "lucide-react";

const DEFAULT_BOT_LOGO = "https://hosting.gestontech.online/logo/icon.png";

function useTheme() {
  const getSystemTheme = (): "dark" | "light" =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const [theme, setTheme] = useState<"dark" | "light">(
    getSystemTheme
  );

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const applySystemTheme = () => {
      const nextTheme: "dark" | "light" = media.matches
        ? "dark"
        : "light";

      setTheme(nextTheme);

      document.documentElement.classList.toggle(
        "dark",
        nextTheme === "dark"
      );

      document.documentElement.classList.toggle(
        "light",
        nextTheme === "light"
      );

      document.documentElement.style.colorScheme = nextTheme;
    };

    applySystemTheme();

    media.addEventListener("change", applySystemTheme);

    return () => {
      media.removeEventListener("change", applySystemTheme);
    };
  }, []);

  return {
    theme,
    toggle: () => {
      // Le thème du téléphone reste prioritaire.
    },
  };
}

function AnimatedLogo() {
  return (
    <img
      src="/logo/icon.png"
      alt="Geston Hosting"
      width={32}
      height={32}
      draggable={false}
      className="w-8 h-8 object-contain select-none shrink-0"
    />
  );
}

function CopyShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    try {
      const url = `${window.location.origin}/services/bots/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handle}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Copier le lien de partage"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copié !" : "Copier le lien"}
    </button>
  );
}

function botImage(template: BotTemplate): string {
  const url = String(template.imageUrl || "").trim();

  if (url) return url;
  if (template.isDefault) return DEFAULT_BOT_LOGO;

  return "";
}

export function ServicesBots() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();

  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [guestModal, setGuestModal] = useState(false);

  useEffect(() => {
    if (!navOpen) return;

    lockScroll();

    return () => {
      unlockScroll();
    };
  }, [navOpen]);

  useEffect(() => {
    let mounted = true;

    getBotTemplates()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setTemplates(data);
        }
      })
      .catch(() => {
        if (mounted) {
          showToast("Échec du chargement des bots", "error");
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
  }, [showToast]);

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

  const handleDeploy = () => {
    if (!user) {
      setGuestModal(true);
      return;
    }

    navigateWithLoader("/deploy?trial=true");
  };

  const handleTemplateDeploy = (template: BotTemplate) => {
    if (!user) {
      setGuestModal(true);
      return;
    }

    if (template.isDefault) {
      navigateWithLoader("/deploy?trial=false");
      return;
    }

    navigateWithLoader(`/services/bots/${template.shareableSlug}`);
  };

  const freeTrialTemplate = templates.find((template) => template.isDefault);

  const otherTemplates = templates.filter(
    (template) => !template.isDefault
  );

  const gridTemplates = freeTrialTemplate
    ? [freeTrialTemplate, ...otherTemplates]
    : otherTemplates;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <TechBackground />

      <GuestGuardModal
        open={guestModal}
        onClose={() => setGuestModal(false)}
        message="Veuillez vous connecter ou vous inscrire pour déployer un bot."
      />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setNavOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                type="button"
                className="flex items-center gap-2"
                onClick={() => navigateWithLoader("/")}
              >
                <AnimatedLogo />
                <span className="font-bold text-base">Geston Hosting</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Changer de thème"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => navigateWithLoader("/profile")}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Profil"
                >
                  <UserCircle className="w-5 h-5 text-muted-foreground" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateWithLoader("/login")}
                  >
                    Connexion
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => navigateWithLoader("/signup")}
                  >
                    Inscription
                  </Button>
                </div>
              )}
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
        className={`fixed top-0 left-0 h-full w-72 geston-menu-glass border-r border-white/15 z-[110] transform transition-transform duration-300 ease-out ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <AnimatedLogo />
            <span className="font-bold text-base">Geston Hosting</span>
          </div>

          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          <div className="mb-5 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <p className="text-xs font-semibold text-teal-400 mb-2">
              {user ? "Service" : "Mode invité"}
            </p>

            <p className="text-xs text-muted-foreground">
              {user
                ? "Tous les déploiements de bots sont gratuits."
                : "Connectez-vous ou inscrivez-vous pour déployer un bot gratuitement."}
            </p>

            {!user && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => {
                    navigateWithLoader("/signup");
                    setNavOpen(false);
                  }}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Inscription
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  onClick={() => {
                    navigateWithLoader("/login");
                    setNavOpen(false);
                  }}
                >
                  <LogIn className="w-3 h-3 mr-1" />
                  Connexion
                </Button>
              </div>
            )}
          </div>

          <nav className="sidebar-glass-list flex-1">
            {user &&
              navItems.map((item) => (
                <button
                  type="button"
                  key={item.path}
                  onClick={() => {
                    navigateWithLoader(item.path);
                    setNavOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl geston-menu-option text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground"
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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl geston-menu-option text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
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
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" />
                  Panneau admin
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            )}
          </nav>

          <div className="space-y-0.5 border-t border-border pt-3 mt-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    navigateWithLoader("/profile");
                    setNavOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl geston-menu-option text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  <UserCircle className="w-4 h-4" />
                  Profil
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigateWithLoader("/");
                  setNavOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl geston-menu-option text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à l'accueil
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-[1]">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => (user ? navigate("/dashboard") : navigate("/"))}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">Déploiement de bot</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Parcourez et déployez gratuitement des bots WhatsApp
            </p>
          </div>
        </div>

        {!user && (
          <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-400">
                Déploiement
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connectez-vous ou inscrivez-vous pour déployer
                un bot et gérer votre compte.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateWithLoader("/login")}
              >
                Connexion
              </Button>

              <Button
                size="sm"
                onClick={() => navigateWithLoader("/signup")}
              >
                Inscription
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {freeTrialTemplate && (
              <div className="relative w-full rounded-2xl overflow-hidden border border-teal-500/30 bg-gradient-to-br from-blue-500/10 via-teal-500/10 to-orange-500/5">
                <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="shrink-0">
                    {botImage(freeTrialTemplate) ? (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-teal-500/30 flex items-center justify-center">
                        <img
                          src={botImage(freeTrialTemplate)}
                          alt={freeTrialTemplate.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            (event.currentTarget as HTMLImageElement).src =
                              DEFAULT_BOT_LOGO;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-teal-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 border border-teal-500/30 text-teal-300 uppercase tracking-wide">
                      <Sparkles className="w-3 h-3" />
                      Gratuit
                    </span>

                    <h2 className="text-xl font-bold mt-2 mb-1">
                      {freeTrialTemplate.name}
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Déployez gratuitement ce bot WhatsApp avec ses
                      fonctionnalités disponibles.
                    </p>

                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs text-teal-300 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        Gratuit
                      </span>

                      <span className="flex items-center gap-1.5 text-xs text-teal-300 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        Fonctionnalités disponibles
                      </span>

                      <span className="flex items-center gap-1.5 text-xs text-teal-300 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        Déploiement automatique
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      className="w-full sm:w-auto px-6"
                      onClick={handleDeploy}
                    >
                      {user ? "Déployer" : "Essayer"}
                    </Button>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <CopyShareLink slug={freeTrialTemplate.shareableSlug} />

                      <a
                        href={
                          freeTrialTemplate.githubRepo.startsWith("http")
                            ? freeTrialTemplate.githubRepo
                            : `https://github.com/${freeTrialTemplate.githubRepo}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {gridTemplates.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                  </div>

                  <h2 className="font-bold text-lg">Bots disponibles</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gridTemplates.map((template) => {
                    const image = botImage(template);

                    return (
                      <div
                        key={template._id}
                        className="rounded-xl border border-border bg-card overflow-hidden hover:border-teal-500/30 transition-all flex flex-col"
                      >
                        <div className="aspect-video overflow-hidden relative flex items-center justify-center p-4">
                          {image ? (
                            <img
                              src={image}
                              alt={template.name}
                              className="max-w-full max-h-full object-contain"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(event) => {
                                if (template.isDefault) {
                                  (event.currentTarget as HTMLImageElement).src =
                                    DEFAULT_BOT_LOGO;
                                }
                              }}
                            />
                          ) : (
                            <Bot className="w-12 h-12 text-muted-foreground/40" />
                          )}

                          {template.isDefault && (
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/90 text-white">
                              <Flame className="w-3 h-3" />
                              Gratuit
                            </span>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-1 gap-3">
                          <div>
                            <h3 className="font-semibold">{template.name}</h3>

                            <p className="text-xs text-muted-foreground mt-1">
                              Service de déploiement
                            </p>
                          </div>

                          <div className="mt-auto flex flex-col gap-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleTemplateDeploy(template)}
                            >
                              Déployer
                            </Button>

                            <div className="flex items-center justify-between">
                              <CopyShareLink
                                slug={template.shareableSlug}
                              />

                              <a
                                href={
                                  template.githubRepo.startsWith("http")
                                    ? template.githubRepo
                                    : `https://github.com/${template.githubRepo}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                GitHub
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {templates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bot className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Aucun bot disponible pour le moment.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
