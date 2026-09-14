import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useNavLoader } from "@/App";
import { GuestGuardModal } from "@/components/GuestGuard";
import { TechBackground } from "@/components/TechBackground";
import { AppLogoIcon } from "@/components/AppLogo";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Coins, Shield, List, ShoppingCart,
  LayoutDashboard, CreditCard, BookOpen, UserCircle, LogOut,
  ChevronRight, Moon, Sun, Menu, X, Bot, LogIn, UserPlus
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
  return { theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

function AnimatedLogo() {
  return (
    <div className="w-8 h-8 flex items-center justify-center" style={{ perspective: "100px" }}>
      <style>{`@keyframes spTxSpin{0%{transform:rotateY(0deg)}28%{transform:rotateY(360deg)}54%{transform:rotateY(360deg)}82%{transform:rotateY(720deg)}100%{transform:rotateY(720deg)}}`}</style>
      <div style={{ animation: "spTxSpin 4s cubic-bezier(0.4,0,0.2,1) infinite", willChange: "transform", transformStyle: "preserve-3d" }}>
        <span style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.9))" }}><AppLogoIcon className="w-6 h-6 text-primary" /></span>
      </div>
    </div>
  );
}

export function ServicesPanel() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { theme, toggle: toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [guestModal, setGuestModal] = useState(false);

  useEffect(() => {
    if (navOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [navOpen]);

  const navItems = [
    { label: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Recharger Coins", icon: CreditCard, path: "/topup" },
    { label: "Docs", icon: BookOpen, path: "/docs" },
  ];

  const handleRestrictedAction = (path: string) => {
    if (!user) { setGuestModal(true); return; }
    navigateWithLoader(path);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <TechBackground />
      <GuestGuardModal open={guestModal} onClose={() => setGuestModal(false)} message="Veuillez vous connecter ou vous inscrire pour accéder à vos panels et options d'achat." />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setNavOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <button className="flex items-center gap-2" onClick={() => navigateWithLoader("/")}>
                <AnimatedLogo /><span className="font-bold text-base">Geston Hosting</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-all">
                {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
              </button>
              {user ? (
                <button onClick={() => navigateWithLoader("/profile")} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <UserCircle className="w-5 h-5 text-muted-foreground" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => navigateWithLoader("/login")}>Connexion</Button>
                  <Button size="sm" onClick={() => navigateWithLoader("/signup")}>Inscription</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {navOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setNavOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-[110] transform transition-transform duration-300 ease-out ${navOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5"><AnimatedLogo /><span className="font-bold text-base">Geston Hosting</span></div>
          <button onClick={() => setNavOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          {user ? (
            <div className="mb-5 p-3 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-0.5">Connecté en tant que</p>
              <p className="text-sm font-semibold truncate">{user.email}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-sm font-bold text-teal-400">Solde : {user.txCoins} Coins</span>
              </div>
            </div>
          ) : (
            <div className="mb-5 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <p className="text-xs font-semibold text-teal-400 mb-2">Mode invité</p>
              <p className="text-xs text-muted-foreground mb-3">Connectez-vous pour accéder à vos panels et options d'achat.</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { navigateWithLoader("/signup"); setNavOpen(false); }}>
                  <UserPlus className="w-3 h-3 mr-1" />Inscription
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { navigateWithLoader("/login"); setNavOpen(false); }}>
                  <LogIn className="w-3 h-3 mr-1" />Connexion
                </Button>
              </div>
            </div>
          )}
          <nav className="space-y-0.5 flex-1">
            {user && navItems.map(item => (
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
            {user ? (
              <>
                <button onClick={() => { navigateWithLoader("/profile"); setNavOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                  <UserCircle className="w-4 h-4" />Profil
                </button>
                <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
                  <LogOut className="w-4 h-4" />Déconnexion
                </button>
              </>
            ) : (
              <button onClick={() => { navigateWithLoader("/"); setNavOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <ArrowLeft className="w-4 h-4" />Retour à l'accueil
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-[1]">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Panels</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Panels de serveur de jeu — payés en Coins</p>
          </div>
        </div>

        {!user && (
          <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-400">Connectez-vous pour débloquer toutes les fonctionnalités</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connectez-vous ou inscrivez-vous pour acheter des panels, gérer votre serveur, et accéder à votre compte.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => navigateWithLoader("/login")}>Connexion</Button>
              <Button size="sm" onClick={() => navigateWithLoader("/signup")}>Inscription gratuite</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <button
            onClick={() => handleRestrictedAction("/services/panels/mypanels")}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-teal-500/40 hover:bg-teal-500/5 transition-all text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <List className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <p className="font-bold text-base">Mes panels</p>
              <p className="text-xs text-muted-foreground mt-1">Consultez et gérez vos panels achetés</p>
              {!user && <p className="text-xs text-teal-400 mt-1">Connexion requise</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>

          <button
            onClick={() => handleRestrictedAction("/services/panels/purchasepanel")}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-teal-500/40 hover:bg-teal-500/5 transition-all text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <ShoppingCart className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <p className="font-bold text-base">Acheter des panels</p>
              <p className="text-xs text-muted-foreground mt-1">Parcourez et achetez des panels de serveur de jeu</p>
              {!user && <p className="text-xs text-teal-400 mt-1">Connexion requise</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>
      </main>
    </div>
  );
}
