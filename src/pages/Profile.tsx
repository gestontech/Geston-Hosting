import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/PageLoader";
import { useNavLoader } from "@/App";
import { updateUsername, deleteAccount } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  ArrowLeft, UserCircle, Mail, Coins, LogOut,
  Shield, Copy, Check, Pencil, X, Palette, Trash2, AlertTriangle, Globe
} from "lucide-react";

type AccentColor =
  | "green" | "teal" | "cyan" | "red" | "orange" | "amber"
  | "yellow" | "blue" | "indigo" | "violet" | "rose" | "pink";

const ACCENT_OPTIONS: { key: AccentColor; label: string; color: string; hsl: string }[] = [
  { key: "green",  label: "Vert",    color: "#22c55e", hsl: "142 71% 45%" },
  { key: "teal",   label: "Sarcelle", color: "#14b8a6", hsl: "173 80% 40%" },
  { key: "cyan",   label: "Cyan",    color: "#06b6d4", hsl: "192 91% 44%" },
  { key: "red",    label: "Rouge",   color: "#ef4444", hsl: "0 72% 51%" },
  { key: "orange", label: "Orange",  color: "#f97316", hsl: "25 95% 53%" },
  { key: "amber",  label: "Ambre",   color: "#f59e0b", hsl: "38 92% 50%" },
  { key: "yellow", label: "Jaune",   color: "#eab308", hsl: "48 96% 53%" },
  { key: "blue",   label: "Bleu",    color: "#3b82f6", hsl: "217 91% 60%" },
  { key: "indigo", label: "Indigo",  color: "#6366f1", hsl: "239 84% 67%" },
  { key: "violet", label: "Violet",  color: "#8b5cf6", hsl: "262 83% 58%" },
  { key: "rose",   label: "Rose",    color: "#f43f5e", hsl: "347 77% 50%" },
  { key: "pink",   label: "Rose vif", color: "#ec4899", hsl: "330 81% 60%" },
];

function applyAccent(accent: AccentColor) {
  const found = ACCENT_OPTIONS.find(a => a.key === accent) || ACCENT_OPTIONS[0];
  let styleEl = document.getElementById("__accent_override__") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "__accent_override__";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `:root, .dark { --primary: ${found.hsl}; --ring: ${found.hsl}; }`;
  localStorage.setItem("accent", accent);
}

function resolveDefaultAccent(): AccentColor {
  let a = (localStorage.getItem("accent") as AccentColor) || "green";
  if (a === "violet" || (a as string) === "purple") {
    a = "green";
    localStorage.setItem("accent", "green");
  }
  if (!ACCENT_OPTIONS.some(o => o.key === a)) a = "green";
  return a;
}

function useAccent() {
  const [accent, setAccentState] = useState<AccentColor>(() => resolveDefaultAccent());
  useEffect(() => { applyAccent(accent); }, [accent]);
  const setAccent = (a: AccentColor) => { setAccentState(a); applyAccent(a); };
  return { accent, setAccent };
}

export function initStoredAccent() {
  applyAccent(resolveDefaultAccent());
}

export function Profile() {
  const { user, loading: authLoading, logout, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { accent, setAccent } = useAccent();
  const { currency, currencies, setCurrency } = useCurrency();
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const currentCurrencyDef = currencies.find(c => c.code === currency);
  const { showToast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (themePickerOpen) { lockScroll(); return () => unlockScroll(); }
  }, [themePickerOpen]);

  useEffect(() => {
    if (deleteAccountModalOpen) { lockScroll(); return () => unlockScroll(); }
  }, [deleteAccountModalOpen]);

  useEffect(() => {
    if (currencyPickerOpen) { lockScroll(); return () => unlockScroll(); }
  }, [currencyPickerOpen]);

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await deleteAccount() as { success?: boolean; error?: string };
      if (res.success) {
        showToast("Compte supprimé", "success");
        navigate("/login");
      } else {
        showToast(res.error || "Échec de la suppression du compte", "error");
        setDeletingAccount(false);
      }
    } catch {
      showToast("Échec de la suppression du compte", "error");
      setDeletingAccount(false);
    }
  };

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {}
  };

  const handleSaveUsername = async () => {
    const u = newUsername.trim();
    if (!u || u.length < 3) { showToast("Le nom d'utilisateur doit contenir au moins 3 caractères", "error"); return; }
    setSavingUsername(true);
    try {
      const res = await updateUsername(u) as { success?: boolean; error?: string };
      if (res.success) {
        showToast("Nom d'utilisateur mis à jour !", "success");
        setEditingUsername(false);
        setNewUsername("");
        refreshUser();
      } else {
        showToast(res.error || "Échec de la mise à jour du nom d'utilisateur", "error");
      }
    } catch {
      showToast("Échec de la mise à jour du nom d'utilisateur", "error");
    } finally {
      setSavingUsername(false);
    }
  };

  if (authLoading || !user) return <PageLoader />;

  const referralUrl = `${window.location.origin}/signup?ref=${user.referralCode || ""}`;
  const currentAccent = ACCENT_OPTIONS.find(a => a.key === accent) || ACCENT_OPTIONS[0];

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigateWithLoader("/dashboard")} className="p-2 -ml-2 rounded-lg hover:bg-muted" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-base">Profil</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4 relative z-[1]">
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <UserCircle className="w-10 h-10 text-green-400" />
          </div>
          {editingUsername ? (
            <div className="w-full max-w-xs space-y-2">
              <Input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="nouveau_nom"
                maxLength={20}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSaveUsername} disabled={savingUsername}>
                  {savingUsername ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingUsername(false); setNewUsername(""); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold">{user.username ? `@${user.username}` : "Aucun nom d'utilisateur défini"}</h2>
                <button onClick={() => { setNewUsername(user.username || ""); setEditingUsername(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          )}
          {isAdmin && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" /> Administrateur
            </span>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Coins className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Solde de Coins</p>
                <p className="text-lg font-bold text-green-400">{user.txCoins} Coins</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigateWithLoader("/topup")} className="bg-green-600 hover:bg-green-700 text-white">Recharger</Button>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium truncate max-w-[200px]">{user.email}</p>
              </div>
            </div>
            <button onClick={() => copyText(user.email, setCopiedEmail)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              {copiedEmail ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {user.referralCode && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Lien de parrainage</p>
                  <p className="text-sm font-mono truncate">{referralUrl}</p>
                </div>
              </div>
              <button onClick={() => copyText(referralUrl, setCopiedRef)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground shrink-0 ml-2">
                {copiedRef ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Paramètres</h3>
          </div>
          <div className="divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Thème de couleur</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentAccent.label}</p>
                </div>
              </div>
              <button onClick={() => setThemePickerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted">
                <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: currentAccent.color }} />
                <span className="text-sm">{currentAccent.label}</span>
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Devise</p>
                  <p className="text-xs text-muted-foreground">{currentCurrencyDef?.name || currency}</p>
                </div>
              </div>
              <button onClick={() => setCurrencyPickerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted">
                <span className="text-base">{currentCurrencyDef?.flag || "🌍"}</span>
                <span className="text-sm">{currentCurrencyDef?.code || currency}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
          <Button variant="outline" className="w-full justify-start text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => setDeleteAccountModalOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Supprimer le compte
          </Button>
        </div>
      </div>

      {themePickerOpen && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" onClick={() => setThemePickerOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl overflow-hidden w-52 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border"><p className="text-sm font-semibold">Thème de couleur</p></div>
            {ACCENT_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => { setAccent(opt.key); setThemePickerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-sm ${accent === opt.key ? "bg-muted/60" : ""}`}>
                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ backgroundColor: opt.color, borderColor: accent === opt.key ? "white" : "transparent" }}>
                  {accent === opt.key && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {currencyPickerOpen && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" onClick={() => setCurrencyPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl overflow-hidden w-64 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border"><p className="text-sm font-semibold">Devise</p></div>
            <div className="overflow-y-auto">
              {currencies.map(c => (
                <button key={c.code} onClick={() => { setCurrency(c.code); setCurrencyPickerOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-left ${currency === c.code ? "bg-muted/60" : ""}`}>
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteAccountModalOpen && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" onClick={() => !deletingAccount && setDeleteAccountModalOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold">Supprimer le compte ?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Cela supprime définitivement votre compte, les métadonnées de vos bots, et votre solde. Cette action est irréversible.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={deletingAccount} onClick={() => setDeleteAccountModalOpen(false)}>Annuler</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={deletingAccount} onClick={handleDeleteAccount}>
                {deletingAccount ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
