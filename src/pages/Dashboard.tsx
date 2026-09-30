import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getBots, getMyPanels } from "@/lib/api";
import { TutorialOverlay, useTutorialOverlay } from "@/components/TutorialOverlay";
import type { Bot as BotType, UserPanel } from "@/types";
import { BotCard } from "@/components/BotCard";
import { CouponModal } from "@/components/CouponModal";
import { NotificationBell } from "@/components/NotificationBell";
import { ReferralModal } from "@/components/ReferralModal";
import { PageLoader } from "@/components/PageLoader";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  Gift,
  Users,
  LogOut,
  Shield,
  Loader2,
  RefreshCw,
  Bot,
  AlertTriangle,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  UserCircle,
  MessageCircle,
  ChevronRight,
  Moon,
  Sun,
  Server,
  Youtube,
  TrendingUp,
  Code2,
  Sparkles,
} from "lucide-react";
import { TechBackground } from "@/components/TechBackground";
import { StaticLogo as AnimatedLogo } from "@/components/StaticLogo";

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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return { theme, toggle };
}

export function Dashboard() {
  const {
    user,
    loading: authLoading,
    logout,
    isAdmin,
    refreshUser,
  } = useAuth();

  const {
    show: showTutorial,
    close: closeTutorial,
  } = useTutorialOverlay(user?.id);

  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();

  const [bots, setBots] = useState<BotType[]>([]);
  const [panels, setPanels] = useState<UserPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponOpen, setCouponOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [deployingAppName, setDeployingAppName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const deployTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("trial") === "true") {
      setSearchParams({}, { replace: true });
      navigateWithLoader("/deploy?trial=true");
    }
  }, [navigateWithLoader, searchParams, setSearchParams]);

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

  const fetchData = useCallback(async () => {
    try {
      const [botsData, panelsData] = await Promise.all([
        getBots(),
        getMyPanels().catch(() => []),
      ]);

      if (Array.isArray(botsData)) {
        setBots(botsData);

        setDeployingAppName((prev) => {
          if (!prev) return null;

          const trackedBot = (
            botsData as {
              herokuAppName: string;
              status: string;
            }[]
          ).find((bot) => bot.herokuAppName === prev);

          if (trackedBot && trackedBot.status !== "building") {
            try {
              localStorage.removeItem("deployingBot");
            } catch {}

            if (deployTimerRef.current) {
              clearTimeout(deployTimerRef.current);
              deployTimerRef.current = null;
            }

            return null;
          }

          return prev;
        });
      }

      if (Array.isArray(panelsData)) {
        setPanels(panelsData);
      }
    } catch {
      showToast("Échec du chargement des données", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate, fetchData]);

  useEffect(() => {
    if (navOpen) {
      lockScroll();

      return () => {
        unlockScroll();
      };
    }
  }, [navOpen]);

  useEffect(() => {
    return () => {
      if (deployTimerRef.current) {
        clearTimeout(deployTimerRef.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);

    await Promise.all([
      fetchData(),
      refreshUser(),
    ]);

    setRefreshing(false);
  };

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <PageLoader />;
  }

  if (user.isBanned) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            Compte suspendu
          </h1>

          <p className="text-muted-foreground max-w-sm">
            Votre compte a été suspendu. Contactez le support pour obtenir de
            l'aide.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium border border-red-500/20"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    );
  }

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
    {
      label: "Tutoriels",
      icon: Youtube,
      path: "/tutorials",
    },
    {
      label: "Assistant IA",
      icon: Sparkles,
      path: "/ai-chat",
    },
    {
      label: "Signaler un bug",
      icon: AlertTriangle,
      path: "/report-bug",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <style>{`
        .wave-emoji {
          display: inline-block;
          transform-origin: 70% 70%;
          animation: wave-hand 1.8s ease-in-out infinite;
        }

        @keyframes wave-hand {
          0%, 100% {
            transform: rotate(0deg);
          }

          15% {
            transform: rotate(16deg);
          }

          30% {
            transform: rotate(-10deg);
          }

          45% {
            transform: rotate(14deg);
          }

          60% {
            transform: rotate(-6deg);
          }

          75% {
            transform: rotate(8deg);
          }
        }
      `}</style>

      <TechBackground />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
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
        className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-[110] transform transition-transform duration-300 ease-out ${
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
            onClick={() => setNavOpen(false)}
            className="p-2 rounded-lg hover:bg-muted"
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
              {user.username ? `@${user.username}` : user.email}
            </p>
          </div>

          <nav className="space-y-0.5 flex-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigateWithLoader(item.path);
                  setNavOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            ))}

            <div className="pt-1.5 pb-1">
              <p className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">
                Services
              </p>

              <button
                onClick={() => {
                  navigateWithLoader("/services/bots");
                  setNavOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4" />
                  Déploiement de bot
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                onClick={() => {
                  navigateWithLoader("/services/panels");
                  setNavOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4" />
                  Panels
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                onClick={() => {
                  navigateWithLoader("/services/boosting");
                  setNavOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4" />
                  Boost réseaux sociaux
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>

              <button
                onClick={() => {
                  navigateWithLoader("/developers");
                  setNavOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-4 h-4" />
                  API développeur
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            </div>

            <button
              onClick={() => {
                setReferralOpen(true);
                setNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                Parrainer & gagner
              </div>

              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => {
                setCouponOpen(true);
                setNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Gift className="w-4 h-4" />
                Code promo
              </div>

              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            {isAdmin && (
              <button
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
            <button
              onClick={() => {
                navigateWithLoader("/contact");
                setNavOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <MessageCircle className="w-4 h-4" />
              Contacter le support
            </button>

            <button
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {user.username ? (
                <>
                  Salut, @{user.username}{" "}
                  <span className="wave-emoji">👋🏻</span>
                </>
              ) : (
                "Tableau de bord"
              )}
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Content de vous revoir
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReferralOpen(true)}
              className="hidden sm:flex"
            >
              <Users className="w-4 h-4 mr-1" />
              Parrainer & gagner
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCouponOpen(true)}
              className="hidden sm:flex"
            >
              <Gift className="w-4 h-4 mr-1" />
              Code promo
            </Button>

            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
              aria-label="Actualiser"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  refreshing
                    ? "animate-spin text-teal-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex sm:hidden gap-2 mb-4 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setReferralOpen(true)}
          >
            <Users className="w-4 h-4 mr-1" />
            Parrainer & gagner
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setCouponOpen(true)}
          >
            <Gift className="w-4 h-4 mr-1" />
            Code promo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigateWithLoader("/services/bots")}
            className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-teal-400" />
              </div>

              <span className="text-xs text-muted-foreground font-medium">
                Bots
              </span>
            </div>

            <p className="text-2xl font-bold">{bots.length}</p>

            <span className="mt-2 inline-block text-xs text-teal-400 font-medium">
              Déployer/Gérer →
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => navigateWithLoader("/services/panels")}
            className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Server className="w-4 h-4 text-blue-400" />
              </div>

              <span className="text-xs text-muted-foreground font-medium">
                Panels
              </span>
            </div>

            <p className="text-2xl font-bold">{panels.length}</p>

            <span className="mt-2 inline-block text-xs text-blue-400 font-medium">
              Créer/Gérer →
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => navigateWithLoader("/services/boosting")}
            className="rounded-xl border border-border bg-card p-4 col-span-2 sm:col-span-1 cursor-pointer hover:border-pink-500/40 hover:bg-pink-500/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-pink-400" />
              </div>

              <span className="text-xs text-muted-foreground font-medium">
                Boost
              </span>
            </div>

            <p className="text-2xl font-bold">
              Réseaux sociaux
            </p>

            <span className="mt-2 inline-block text-xs text-pink-400 font-medium">
              Découvrir →
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => navigateWithLoader("/tutorials")}
            className="rounded-xl border border-border bg-card p-4 col-span-2 sm:col-span-1 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Youtube className="w-4 h-4 text-amber-400" />
              </div>

              <span className="text-xs text-muted-foreground font-medium">
                Tutoriels
              </span>
            </div>

            <p className="text-2xl font-bold">
              Guides
            </p>

            <span className="mt-2 inline-block text-xs text-amber-400 font-medium">
              Regarder →
            </span>
          </div>
        </div>

        {deployingAppName && (
          <div className="mb-4 p-4 rounded-xl border border-teal-500/30 bg-teal-500/10 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin shrink-0" />

            <div>
              <p className="text-sm font-semibold text-teal-300">
                Déploiement du bot en cours...
              </p>

              <p className="text-xs text-teal-400/80">
                <span className="font-mono">
                  {deployingAppName}
                </span>{" "}
                est en cours de construction.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : bots.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-base">
                Bots récents
              </h2>

              <button
                onClick={() => navigateWithLoader("/mybots")}
                className="text-xs text-teal-400 hover:underline font-medium"
              >
                Tout voir →
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
              {bots.slice(0, 4).map((bot) => (
                <div
                  key={bot._id}
                  className="min-w-0 max-w-full"
                >
                  <BotCard
                    bot={bot}
                    onUpdate={fetchData}
                    deploying={
                      deployingAppName === bot.herokuAppName
                    }
                  />
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-8 mb-4 p-5 rounded-2xl border border-border bg-card/50">
          <p className="text-sm font-semibold mb-1">
            Vous cherchez autre chose ?
          </p>

          <p className="text-xs text-muted-foreground mb-4">
            Boostez vos réseaux, vos panels, ou déployez un autre bot.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigateWithLoader("/services/boosting")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs font-semibold"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Boost réseaux sociaux
            </button>

            <button
              onClick={() => navigateWithLoader("/services/panels")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-semibold"
            >
              <Server className="w-3.5 h-3.5" />
              Panels Pterodactyl
            </button>

            <button
              onClick={() => navigateWithLoader("/services/bots")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-semibold"
            >
              <Bot className="w-3.5 h-3.5" />
              Déploiement de bot
            </button>

            <button
              onClick={() => navigateWithLoader("/ai-chat")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assistant IA
            </button>

            <button
              onClick={() => navigateWithLoader("/tutorials")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold"
            >
              <Youtube className="w-3.5 h-3.5" />
              Tutoriels
            </button>
          </div>
        </div>
      </main>

      <CouponModal
        isOpen={couponOpen}
        onClose={() => setCouponOpen(false)}
        onSuccess={() => {
          fetchData();
          refreshUser();
        }}
      />

      <ReferralModal
        isOpen={referralOpen}
        onClose={() => setReferralOpen(false)}
        referralCode={user.referralCode || ""}
      />

      {showTutorial && user && (
        <TutorialOverlay
          userId={user.id}
          onClose={closeTutorial}
        />
      )}
    </div>
  );
}
