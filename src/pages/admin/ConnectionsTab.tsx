import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  getAdminMessagingStatus,
  adminWaConnect,
  adminWaRestart,
  adminWaDisconnect,
  adminWaLogout,
} from "@/lib/messagingApi";
import { RefreshCw, Radio, X, Copy, Check } from "lucide-react";
import { WhatsAppIcon } from "@/components/BrandIcons";

const CODE_STORAGE_KEY = "geston_wa_pairing_code";

type Status = {
  whatsapp: {
    connected: boolean;
    pairing: boolean;
    pairingCode?: string | null;
    pairingPhone?: string | null;
    phoneNumber: string;
    dbStatus: string;
    lastConnectedAt: string | null;
    ownerId: string | null;
  };
};

type ConfirmAction = "restart" | "disconnect" | "logout" | null;

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`}
      aria-hidden
    />
  );
}

function cleanPhoneInput(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

function readStoredCode(): string | null {
  try {
    const v = sessionStorage.getItem(CODE_STORAGE_KEY);
    return v && v.length >= 4 ? v : null;
  } catch {
    return null;
  }
}

function writeStoredCode(code: string | null) {
  try {
    if (code) sessionStorage.setItem(CODE_STORAGE_KEY, code);
    else sessionStorage.removeItem(CODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function ConnectionsTab() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(() => readStoredCode());
  const [codeCopied, setCodeCopied] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const pairingBoxRef = useRef<HTMLDivElement | null>(null);

  const applyCode = useCallback((code: string | null | undefined) => {
    const clean = code ? String(code).replace(/\s+/g, "") : "";
    if (clean.length >= 4) {
      setPairingCode(clean);
      writeStoredCode(clean);
    }
  }, []);

  const clearCode = useCallback(() => {
    setPairingCode(null);
    writeStoredCode(null);
  }, []);

  const fetchStatus = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const data = (await getAdminMessagingStatus()) as Status;
        setStatus(data);
        if (data.whatsapp?.connected) {
          clearCode();
        } else if (data.whatsapp?.pairingCode) {
          // Always re-sync from server so refresh / poll never loses the code
          applyCode(data.whatsapp.pairingCode);
        }
      } catch {
        showToast("Échec du chargement du statut de connexion", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast, applyCode, clearCode]
  );

  useEffect(() => {
    fetchStatus(false);
    const id = setInterval(() => fetchStatus(false), 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => {
    if (!confirm) return;
    lockScroll();
    return () => unlockScroll();
  }, [confirm]);

  useEffect(() => {
    if (!pairingCode) return;
    const t = setTimeout(() => {
      pairingBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [pairingCode]);

  async function handleRequestCode() {
    const cleaned = cleanPhoneInput(phone);
    if (cleaned.length < 8) {
      showToast("Saisissez un numéro valide avec l'indicatif du pays (chiffres uniquement)", "error");
      return;
    }
    setBusy(true);
    setCodeCopied(false);
    try {
      const res = (await adminWaConnect(cleaned)) as {
        ok?: boolean;
        pairingCode?: string;
        error?: string;
        message?: string;
      };

      if (res.pairingCode) {
        applyCode(res.pairingCode);
        showToast("Code de jumelage prêt — saisissez-le dans WhatsApp", "success");
      } else if (res.error) {
        // Still try status — server may already hold a code
        await fetchStatus(false);
        const stored = readStoredCode();
        if (stored) {
          applyCode(stored);
          showToast("Jumelage toujours en cours — utilisez le code ci-dessous", "success");
        } else {
          showToast(res.error, "error");
        }
      } else {
        await fetchStatus(false);
        showToast(res.message || "Demande envoyée — vérifiez le code ci-dessous", "success");
      }

      await fetchStatus(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Échec de la demande de code", "error");
      await fetchStatus(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyCode() {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCodeCopied(true);
      showToast("Code de jumelage copié", "success");
      setTimeout(() => setCodeCopied(false), 2500);
    } catch {
      showToast("Impossible de copier — appui long / sélectionnez le code", "error");
    }
  }

  async function runConfirmed() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === "restart") {
        const res = (await adminWaRestart()) as { error?: string };
        if (res.error) throw new Error(res.error);
        showToast("WhatsApp redémarré depuis la session enregistrée", "success");
      } else if (confirm === "disconnect") {
        const res = (await adminWaDisconnect()) as { error?: string };
        if (res.error) throw new Error(res.error);
        showToast("Connexion en direct fermée (session conservée en base)", "success");
      } else if (confirm === "logout") {
        const res = (await adminWaLogout()) as { error?: string };
        if (res.error) throw new Error(res.error);
        showToast("Déconnecté et session supprimée de la base", "success");
        clearCode();
      }
      setConfirm(null);
      await fetchStatus(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Échec de l'action", "error");
    } finally {
      setBusy(false);
    }
  }

  const waConnected = !!(status?.whatsapp?.connected);
  const waHasSession =
    waConnected ||
    (status?.whatsapp?.dbStatus === "connected" && !!status?.whatsapp?.phoneNumber);
  const showPairForm = !waConnected;

  if (loading && !status) {
    return <p className="text-sm text-muted-foreground">Chargement du statut de connexion…</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl pb-28">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Statut en direct du bot WhatsApp du propriétaire.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStatus(true)}
          disabled={busy || refreshing}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <WhatsAppIcon className="w-5 h-5 shrink-0" />
            <h3 className="font-semibold">Bot WhatsApp</h3>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <StatusDot ok={waConnected} />
              <span>
                En direct :{" "}
                {waConnected
                  ? "Connecté"
                  : status?.whatsapp?.pairing || pairingCode
                    ? "Jumelage…"
                    : "Hors ligne"}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Statut base de données :{" "}
              <span className="font-medium text-foreground">{status?.whatsapp?.dbStatus || "—"}</span>
            </p>
            {status?.whatsapp?.phoneNumber && (
              <p className="text-muted-foreground text-xs">
                Téléphone : <span className="font-mono text-foreground">{status.whatsapp.phoneNumber}</span>
              </p>
            )}
            {status?.whatsapp?.lastConnectedAt && (
              <p className="text-muted-foreground text-xs">
                Dernière connexion : {new Date(status.whatsapp.lastConnectedAt).toLocaleString()}
              </p>
            )}
          </div>

          {(waConnected || waHasSession) && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm("restart")}>
                <Radio className="w-3.5 h-3.5 mr-1.5" />
                Redémarrer
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !waConnected}
                onClick={() => setConfirm("disconnect")}
              >
                Déconnexion douce
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirm("logout")}>
                Déconnecter & effacer la session
              </Button>
            </div>
          )}

          {showPairForm && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Saisissez le numéro WhatsApp du propriétaire avec l'indicatif du pays (chiffres uniquement).
              </p>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  inputMode="tel"
                  placeholder="254712345678"
                  value={phone}
                  onChange={(e) => setPhone(cleanPhoneInput(e.target.value))}
                  className="w-full h-14 rounded-xl border border-border bg-background px-4 text-lg font-mono tracking-wide outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  className="h-12 text-base font-semibold"
                  disabled={busy || phone.length < 8}
                  onClick={handleRequestCode}
                >
                  {busy ? "Demande en cours… (jusqu'à ~30s)" : "Demander un code de jumelage"}
                </Button>
              </div>

              {/* Inline code box — never unmounts while pairingCode is set */}
              {pairingCode && (
                <div
                  ref={pairingBoxRef}
                  className="rounded-2xl border-2 border-green-500/50 bg-green-500/10 p-5 space-y-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-300/90 text-center">
                    Votre code de jumelage
                  </p>
                  <p className="text-3xl sm:text-4xl font-mono font-bold tracking-[0.25em] text-green-300 text-center select-all break-all">
                    {pairingCode}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-green-500/50 hover:bg-green-500/15 text-base"
                    onClick={handleCopyCode}
                  >
                    {codeCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-400" />
                        Copié
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copier le code
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    WhatsApp → <strong>Appareils connectés</strong> → Associer avec le numéro de téléphone → saisissez
                    ce code.
                    <br />
                    <span className="text-green-300/90 font-medium">
                      Ce code reste ici jusqu'à ce que WhatsApp se connecte.
                    </span>
                  </p>
                </div>
              )}

              {!pairingCode && status?.whatsapp?.pairing && (
                <p className="text-sm text-amber-400">
                  Jumelage en cours sur le serveur… appuyez à nouveau sur Demander si le code n'apparaît pas
                  sous 30 secondes.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky bottom banner — always visible while code exists and not connected */}
      {pairingCode && !waConnected && (
        <div className="fixed bottom-0 left-0 right-0 z-[150] border-t border-green-500/40 bg-zinc-950/95 backdrop-blur-md p-4 safe-area-pb">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 text-center sm:text-left min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-green-400/80 font-semibold">
                Code de jumelage
              </p>
              <p className="text-2xl font-mono font-bold tracking-[0.2em] text-green-300 select-all break-all">
                {pairingCode}
              </p>
            </div>
            <Button
              type="button"
              className="h-11 px-6 shrink-0 bg-green-600 hover:bg-green-500 text-white"
              onClick={handleCopyCode}
            >
              {codeCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !busy && setConfirm(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-base">
                {confirm === "restart" && "Redémarrer WhatsApp ?"}
                {confirm === "disconnect" && "Déconnexion douce ?"}
                {confirm === "logout" && "Effacer la session WhatsApp ?"}
              </h3>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-muted"
                onClick={() => !busy && setConfirm(null)}
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {confirm === "restart" &&
                "Se reconnecte depuis la session enregistrée en base. À utiliser si la connexion en direct a été coupée."}
              {confirm === "disconnect" &&
                "Ferme uniquement la connexion en direct. Les identifiants restent en base pour redémarrer plus tard."}
              {confirm === "logout" &&
                "Déconnecte WhatsApp et supprime la session enregistrée en base. Un nouveau code de jumelage sera nécessaire."}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirm(null)}>
                Annuler
              </Button>
              <Button
                size="sm"
                variant={confirm === "logout" ? "destructive" : "default"}
                disabled={busy}
                onClick={runConfirmed}
              >
                {busy ? "En cours…" : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
