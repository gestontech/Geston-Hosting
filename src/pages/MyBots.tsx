import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getBots } from "@/lib/api";
import type { Bot as BotType } from "@/types";
import { BotCard } from "@/components/BotCard";
import { NotificationBell } from "@/components/NotificationBell";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft,
  Loader2,
  Bot,
  Plus,
  LayoutDashboard,
  BookOpen,
  UserCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Menu,
  X,
  Shield,
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

export function MyBots() {
  const {
    user,
    loading: authLoading,
    logout,
    isAdmin,
  } = useAuth();

  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();

  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [botSearch, setBotSearch] = useState("");
  const [deployingAppName, setDeployingAppName] =
    useState<string | null>(null);

  const deployTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

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
    try {
      const stored = localStorage.getItem("deployingBot");

      if (!stored) return;

      const parsed = JSON.parse(stored) as {
        appName: string;
        startTime: number;
      };

      const elapsed = Date.now() - parsed.startTime;
      const remaining = 240000 - elapsed;

      if (remaining > 0) {
        setDeployingAppName(parsed.appName);

        deployTimerRef.current = setTimeout(() => {
          setDeployingAppName(null);
          localStorage.removeItem("deployingBot");
        }, remaining);
      } else {
        localStorage.removeItem("deployingBot");
      }
    } catch {
      localStorage.removeItem("deployingBot");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (deployTimerRef.current) {
        clearTimeout(deployTimerRef.current);
      }
    };
  }, []);

  const fetchBots = useCallback(async () => {
    try {
      const data = await getBots();

      if (Array.isArray(data)) {
        setBots(data);
      }
    } catch {
      showToast("Impossible de charger les bots", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user) {
      fetchBots();
    }
  }, [user, fetchBots]);

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

  const normalizedSearch = botSearch.trim().toLowerCase();

  const filteredBots = bots.filter((bot) => {
    if (!normalizedSearch) return true;

    return bot.herokuAppName
      .toLowerCase()
      .includes(normalizedSearch);
  });

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
              <NotificationBell />

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
        className={`fixed top-0 left-0 h-full w-72 geston-menu-glass border-r border-white/15 z-[110] transform transition-transform duration-300 ease-out ${
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
                Services
              </span>
            </div>
          </div>

          <nav className="sidebar-glass-list flex-1">
            {navItems.map((item) => (
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
                Mes bots
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
              Mes bots
            </h1>

            <p className="text-sm text-muted-foreground mt-0.5">
              Gérez vos bots déployés gratuitement.
            </p>
          </div>
        </div>

        <div className="mb-4 relative">
          <input
            type="text"
            value={botSearch}
            onChange={(event) =>
              setBotSearch(event.target.value)
            }
            placeholder="Rechercher un bot..."
            className="w-full px-4 py-2.5 pl-10 rounded-lg border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50"
          />

          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path
              strokeLinecap="round"
              d="m21 21-4.35-4.35"
            />
          </svg>

          {botSearch && (
            <button
              type="button"
              onClick={() => setBotSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {deployingAppName && (
          <div className="mb-4 p-4 rounded-xl border border-teal-500/30 bg-teal-500/10 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin shrink-0" />

            <div>
              <p className="text-sm font-semibold text-teal-300">
                Déploiement en cours...
              </p>

              <p className="text-xs text-teal-400/80 mt-0.5">
                <span className="font-mono">
                  {deployingAppName}
                </span>{" "}
                est en cours d'initialisation.
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Votre bot sera disponible automatiquement une
                fois le déploiement terminé.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bots.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-border flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>

            <h3 className="text-lg font-medium mb-1">
              Aucun bot
            </h3>

            <p className="text-sm text-muted-foreground mb-5">
              Déployez votre premier bot gratuitement.
            </p>

            <Button
              onClick={() =>
                navigateWithLoader("/services/bots")
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Déployer un bot
            </Button>
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">
              Aucun bot ne correspond à{" "}
              <span className="text-foreground">
                "{botSearch}"
              </span>
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() =>
                  navigateWithLoader("/services/bots")
                }
                className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
              >
                <Bot className="w-4 h-4 mr-2" />
                Déployer un autre bot gratuitement
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBots.map((bot) => (
                <BotCard
                  key={bot._id}
                  bot={bot}
                  onUpdate={fetchBots}
                  deploying={
                    deployingAppName === bot.herokuAppName
                  }
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
