import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getMyPanels, renewPanel } from "@/lib/api";
import type { UserPanel } from "@/types";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { StaticLogo as AnimatedLogo } from "@/components/StaticLogo";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft,
  Loader2,
  Server,
  Plus,
  ExternalLink,
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
  Shield,
  Copy,
  Check,
} from "lucide-react";

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

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={`p-1.5 rounded transition-colors ${
        copied
          ? "text-green-400"
          : "text-muted-foreground hover:text-foreground"
      }`}
      title="Copier"
      aria-label="Copier"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export function MyPanels() {
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

  const [panels, setPanels] = useState<UserPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] =
    useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);

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

  const loadPanels = useCallback(async () => {
    try {
      const data = await getMyPanels();

      if (Array.isArray(data)) {
        setPanels(data);
      }
    } catch {
      showToast(
        "Impossible de charger les panels",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user) {
      loadPanels();
    }
  }, [user, loadPanels]);

  const handleRenew = async (panelId: string) => {
    setRenewingId(panelId);

    try {
      const res = await renewPanel(panelId);

      if (res.success) {
        showToast(
          "Panel renouvelé gratuitement pour 30 jours !",
          "success",
        );

        await loadPanels();
        await refreshUser();
      } else {
        showToast(
          res.error || "Impossible de renouveler le panel",
          "error",
        );
      }
    } catch {
      showToast(
        "Impossible de renouveler le panel",
        "error",
      );
    } finally {
      setRenewingId(null);
    }
  };

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <PageLoader />;
  }

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      label: "Documentation",
      icon: BookOpen,
      path: "/docs",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />

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
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
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
                onClick={() =>
                  navigateWithLoader("/profile")
                }
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
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
        className={`fixed top-0 left-0 h-full w-72 liquid-glass border-r border-white/15 z-[110] transform transition-transform duration-300 ease-out ${
          navOpen
            ? "translate-x-0"
            : "-translate-x-full"
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
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          <div className="mb-5 p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-0.5">
              Connecté en tant que
            </p>

            <p className="text-sm font-semibold truncate">
              {user.username
                ? `@${user.username}`
                : user.email}
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-green-400">
                Services gratuits
              </span>
            </div>
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
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl liquid-glass-subtle text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl liquid-glass-subtle text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-4 h-4" />
                Bots
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
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            )}
          </nav>

          <div className="space-y-0.5 border-t border-border pt-3 mt-3">
            <button
              type="button"
              onClick={() => {
                navigateWithLoader("/profile");
                setNavOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl liquid-glass-subtle text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
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
          </div>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-[1]">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Retour au dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Mes panels
            </h1>

            <p className="text-sm text-muted-foreground mt-0.5">
              Gérez vos panels et renouvelez-les gratuitement.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : panels.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-border flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-muted-foreground" />
            </div>

            <h3 className="text-lg font-medium mb-1">
              Aucun panel
            </h3>

            <p className="text-sm text-muted-foreground mb-5">
              Créez votre premier panel gratuitement.
            </p>

            <Button
              onClick={() =>
                navigateWithLoader("/services/panels")
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer un panel
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() =>
                  navigateWithLoader("/services/panels")
                }
                className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un autre panel gratuitement
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {panels.map((panel) => {
                const panelId = String(panel._id);

                const panelLoginUrl =
                  (panel as unknown as {
                    panelLoginUrl?: string;
                  }).panelLoginUrl || "";

                const panelUsername =
                  (panel as unknown as {
                    panelUsername?: string;
                  }).panelUsername || "";

                const panelEmail =
                  (panel as unknown as {
                    panelEmail?: string;
                  }).panelEmail || "";

                const expiresAt = panel.expiresAt
                  ? new Date(panel.expiresAt)
                  : new Date(Number.NaN);

                const isExpired =
                  Number.isNaN(expiresAt.getTime()) ||
                  expiresAt.getTime() <= Date.now();

                return (
                  <div
                    key={panelId}
                    className="rounded-xl bg-card border border-border overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                            <Server className="w-5 h-5 text-teal-400" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">
                              {panel.planName ||
                                "Panel Geston Hosting"}
                            </h3>

                            <p className="text-xs text-muted-foreground truncate">
                              {panelEmail || user.email}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                            isExpired
                              ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                              : "text-green-400 bg-green-500/10 border-green-500/20"
                          }`}
                        >
                          {isExpired ? "Expiré" : "Actif"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {panelUsername && (
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-muted-foreground">
                              Utilisateur
                            </span>

                            <div className="flex items-center gap-1">
                              <span className="font-mono truncate max-w-[180px]">
                                {panelUsername}
                              </span>

                              <CopyBtn text={panelUsername} />
                            </div>
                          </div>
                        )}

                        {panelEmail && (
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-muted-foreground">
                              E-mail
                            </span>

                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[180px]">
                                {panelEmail}
                              </span>

                              <CopyBtn text={panelEmail} />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">
                            Expiration
                          </span>

                          <span className="font-medium">
                            {Number.isNaN(expiresAt.getTime())
                              ? "—"
                              : expiresAt.toLocaleDateString(
                                  "fr-FR",
                                )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {panelLoginUrl && (
                          <a
                            href={panelLoginUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ouvrir le panel
                          </a>
                        )}

                        {isExpired && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleRenew(panelId)
                            }
                            disabled={renewingId === panelId}
                            className="h-9 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                          >
                            {renewingId === panelId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Server className="w-3.5 h-3.5 mr-1.5" />
                            )}

                            Renouveler gratuitement
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
