import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useNavLoader } from "@/App";
import { getTutorials } from "@/lib/api";
import { TechBackground } from "@/components/TechBackground";
import { AiChatWidget } from "@/components/AiChatWidget";
import { StaticLogo as AnimatedLogo } from "@/components/StaticLogo";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { Button } from "@/components/ui/button";
import type { Tutorial } from "@/types";
import {
  ArrowLeft, Youtube, ExternalLink,
  LayoutDashboard, BookOpen, UserCircle, LogOut,
  Bot, Shield, ChevronRight, Moon, Sun, Menu, X,
  PlayCircle, LogIn, UserPlus, Loader2
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme(t => t === "dark" ? "light" : "dark"),
  };
}

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );

  return match ? match[1] : null;
}

function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const videoId = getYoutubeId(tutorial.youtubeUrl);
  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  return (
    <a
      href={tutorial.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-border bg-card overflow-hidden hover:border-red-500/40 transition-all hover:shadow-lg hover:shadow-red-500/5"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={tutorial.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Youtube className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl">
            <PlayCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="absolute top-2 right-2 bg-red-600 rounded px-1.5 py-0.5 flex items-center gap-1">
          <Youtube className="w-3 h-3 text-white" />
          <span className="text-white text-[10px] font-bold">
            YouTube
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">
          {tutorial.title}
        </h3>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="w-3 h-3" />
          Regarder sur YouTube
        </div>
      </div>
    </a>
  );
}

export function Tutorials() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { theme, toggle: toggleTheme } = useTheme();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (navOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [navOpen]);

  useEffect(() => {
    getTutorials()
      .then(data => {
        if (Array.isArray(data)) {
          setTutorials(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const navItems = [
    { label: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setNavOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                className="flex items-center gap-2"
                onClick={() => navigateWithLoader("/")}
              >
                <AnimatedLogo />
                <span className="font-bold text-base">
                  Geston Hosting
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-muted transition-all"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {user ? (
                <button
                  onClick={() => navigateWithLoader("/profile")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
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
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          {user ? (
            <div className="mb-5 p-3 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-0.5">
                Connecté en tant que
              </p>

              <p className="text-sm font-semibold truncate">
                {user.username ? `@${user.username}` : user.email}
              </p>

              <p className="text-xs text-teal-400 mt-2">
                Tous les services sont accessibles gratuitement.
              </p>
            </div>
          ) : (
            <div className="mb-5 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <p className="text-xs font-semibold text-teal-400 mb-2">
                Mode invité
              </p>

              <p className="text-xs text-muted-foreground mb-3">
                Connectez-vous pour accéder à votre tableau de bord et
                à toutes les fonctionnalités.
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
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
                  className="flex-1 h-7 text-xs"
                  onClick={() => {
                    navigateWithLoader("/login");
                    setNavOpen(false);
                  }}
                >
                  <LogIn className="w-3 h-3 mr-1" />
                  Connexion
                </Button>
              </div>
            </div>
          )}

          <nav className="space-y-0.5 flex-1">
            {user && navItems.map(item => (
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
                navigateWithLoader("/tutorials");
                setNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Youtube className="w-4 h-4" />
                Tutoriels
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
            {user ? (
              <>
                <button
                  onClick={() => {
                    navigateWithLoader("/profile");
                    setNavOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <UserCircle className="w-4 h-4" />
                  Profil
                </button>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  navigateWithLoader("/");
                  setNavOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
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
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Tutoriels
            </h1>

            <p className="text-sm text-muted-foreground mt-0.5">
              Guides vidéo pas à pas pour tout ce qui concerne Geston Hosting
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tutorials.length === 0 ? (
          <div className="text-center py-20">
            <Youtube className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Aucun tutoriel disponible pour le moment. Revenez bientôt.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tutorials.map(tutorial => (
              <TutorialCard
                key={tutorial._id}
                tutorial={tutorial}
              />
            ))}
          </div>
        )}
      </main>

      <AiChatWidget />
    </div>
  );
}
