import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useNavLoader } from "@/App";
import { TechBackground } from "@/components/TechBackground";
import { StaticLogo as AnimatedLogo } from "@/components/StaticLogo";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { supportWhatsAppUrl } from "@/lib/supportLinks";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { BotChatButtonsWithNote } from "@/components/BotChatButtons";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Mail, MessageCircle,
  LayoutDashboard, BookOpen, UserCircle, LogOut,
  Bot, Shield, ChevronRight, Moon, Sun, Menu, X,
  ExternalLink, LogIn, UserPlus, Sparkles
} from "lucide-react";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

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

export function Contact() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { theme, toggle: toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const waUrl = supportWhatsAppUrl();

  useEffect(() => {
    if (navOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [navOpen]);

  const navItems = [
    { label: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
    { label: "Tutoriels", icon: BookOpen, path: "/tutorials" },
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
                navigateWithLoader("/contact");
                setNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground transition-all"
            >
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4" />
                Contact
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 relative z-[1]">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Contact & Support
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Obtenez de l'aide ou contactez notre équipe
            </p>
          </div>
        </div>

        <div className="mb-8 p-5 rounded-xl border border-lime-500/25 bg-lime-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-lime-400" />
            <h2 className="font-semibold text-sm">
              Assistants IA — réponses instantanées
            </h2>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Discutez avec notre bot IA WhatsApp pour les déploiements et
            questions courantes à toute heure. Pour une personne, utilisez
            les canaux de support ci-dessous.
          </p>

          <BotChatButtonsWithNote
            onFeaturesClick={() => navigateWithLoader("/botfeatures")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-3 p-5 rounded-xl border border-border bg-card hover:border-green-500/40 hover:bg-green-500/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <WhatsAppIcon className="w-5 h-5 shrink-0" />
              </div>

              <div>
                <p className="font-semibold">
                  Support WhatsApp
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Discutez avec nous sur WhatsApp pour une réponse rapide
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
                Ouvrir WhatsApp
                <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          ) : null}

          <a
            href="mailto:gestontech@gmail.com"
            className="flex flex-col gap-3 p-5 rounded-xl border border-border bg-card hover:border-teal-500/40 hover:bg-teal-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <Mail className="w-5 h-5 text-teal-400" />
            </div>

            <div>
              <p className="font-semibold">
                Support par e-mail
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Envoyez-nous un e-mail, réponse sous 24 heures
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs text-teal-400 font-medium">
              gestontech@gmail.com
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          <a
            href="https://whatsapp.com/channel/0029Vb7dL1LHltY3pgCvwR3B"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-3 p-5 rounded-xl border border-green-500/30 bg-green-500/5 hover:border-green-500/50 hover:bg-green-500/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center group-hover:bg-green-500/25 transition-colors">
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
            </div>

            <div>
              <p className="font-semibold">
                Rejoignez notre canal officiel
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Mises à jour, annonces et actualités WhatsApp
              </p>
            </div>

            <div className="inline-flex items-center justify-center gap-2 mt-1 px-3 py-2 rounded-lg bg-green-500/20 text-green-300 text-xs font-semibold group-hover:bg-green-500/30 transition-colors">
              Cliquez pour rejoindre
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          <div className="flex flex-col gap-3 p-5 rounded-xl border border-border bg-card">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>

            <div>
              <p className="font-semibold">
                Délais de réponse
              </p>

              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground">
                  WhatsApp : généralement sous 1 à 2 heures
                </p>
                <p className="text-xs text-muted-foreground">
                  E-mail : sous 24 heures
                </p>
                <p className="text-xs text-muted-foreground">
                  Horaires : lundi–samedi, 8h–20h
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/50">
          <h2 className="font-semibold mb-1">
            Avant de nous contacter
          </h2>

          <p className="text-sm text-muted-foreground mb-3">
            De nombreuses questions courantes trouvent leur réponse dans
            notre documentation et nos tutoriels vidéo.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWithLoader("/docs")}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Lire la doc
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWithLoader("/tutorials")}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Voir les tutoriels
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
