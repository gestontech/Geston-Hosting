import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { getApiKeyStatus, generateApiKey, pauseApiKey, resumeApiKey, deleteApiKey, revealApiKey } from "@/lib/api";
import {
  ArrowLeft, Code2, Copy, Check, RefreshCw, Pause, Play, Trash2,
  Loader2, KeyRound, AlertTriangle, Eye, EyeOff
} from "lucide-react";

function CodeBlock({ children }: { children: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    showToast("Copié dans le presse-papiers", "success");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-3.5 text-xs overflow-x-auto"><code>{children}</code></pre>
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

interface EndpointDoc {
  method: string;
  path: string;
  desc: string;
  body?: string;
}

function EndpointRow({ ep, origin }: { ep: EndpointDoc; origin: string }) {
  const methodColor: Record<string, string> = {
    GET: "bg-teal-500/10 text-teal-400",
    POST: "bg-blue-500/10 text-blue-400",
    DELETE: "bg-red-500/10 text-red-400",
  };
  const curl = `curl${ep.method !== "GET" ? ` -X ${ep.method}` : ""} "${origin}${ep.path}" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>"${ep.body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.body}'` : ""}`;
  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${methodColor[ep.method]}`}>{ep.method}</span>
        <code className="text-xs font-mono">{ep.path}</code>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{ep.desc}</p>
      <CodeBlock>{curl}</CodeBlock>
    </div>
  );
}

export function DeveloperApi() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();

  const [status, setStatus] = useState<{ hasKey: boolean; maskedKey: string; active: boolean; callCount: number; lastUsedAt: string | null } | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    try {
      const res = await getApiKeyStatus();
      setStatus(res);
    } catch {
      showToast("Échec du chargement du statut de la clé API", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    load();
  }, [user, navigate, load]);

  const handleGenerate = async () => {
    setBusy(true);
    setRevealedKey(null);
    try {
      const res = await generateApiKey();
      if (res.apiKey) {
        setRawKey(res.apiKey);
        showToast("Clé API générée", "success");
        load();
      } else {
        showToast(res.error || "Échec de la génération de la clé", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePauseResume = async () => {
    setBusy(true);
    try {
      const res = status?.active ? await pauseApiKey() : await resumeApiKey();
      if (res.ok) { showToast(status?.active ? "Clé API mise en pause" : "Clé API réactivée", "success"); load(); }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer votre clé API ? Toutes les intégrations qui l'utilisent cesseront de fonctionner.")) return;
    setBusy(true);
    try {
      const res = await deleteApiKey();
      if (res.ok) { showToast("Clé API supprimée", "success"); setRawKey(null); setRevealedKey(null); load(); }
    } finally {
      setBusy(false);
    }
  };

  const copyRawKey = () => {
    if (!rawKey) return;
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    showToast("Copié dans le presse-papiers", "success");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleToggleReveal = async () => {
    if (revealedKey) { setRevealedKey(null); return; }
    setRevealBusy(true);
    try {
      const res = await revealApiKey();
      if (res.apiKey) setRevealedKey(res.apiKey);
      else showToast(res.error || "Impossible d'afficher la clé", "error");
    } finally {
      setRevealBusy(false);
    }
  };

  const copyRevealedKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    showToast("Copié dans le presse-papiers", "success");
  };

  if (!user) return null;

  const templateEndpoints: EndpointDoc[] = [
    { method: "GET", path: "/api/v1/bot-templates", desc: "Liste tous les modèles de bot disponibles au déploiement. Appel gratuit." },
  ];

  const botEndpoints: EndpointDoc[] = [
    { method: "POST", path: "/api/v1/bots/deploy-template", desc: "Déploie un bot depuis un modèle. Débite des Coins de votre solde. months va de 1 à 9 (par défaut 1) ; le coût total est le tarif Coins du modèle × months.", body: '{"botTemplateId":"<id>","botName":"mybot","sessionVar":"<session>","months":1}' },
    { method: "GET", path: "/api/v1/bots", desc: "Liste tous les bots de votre compte." },
    { method: "POST", path: "/api/v1/bots/:id/stop", desc: "Arrête un bot en cours d'exécution." },
    { method: "POST", path: "/api/v1/bots/:id/restart", desc: "Redémarre un bot." },
    { method: "DELETE", path: "/api/v1/bots/:id", desc: "Supprime définitivement un bot." },
  ];

  const boostEndpoints: EndpointDoc[] = [
    { method: "GET", path: "/api/v1/boost/services?q=instagram&currency=KES", desc: "Liste les services de boost de notre catalogue local (rapide). Paramètres optionnels : q, category, currency (KES, USD, NGN, ...). La réponse inclut id, name, pricePer1000, min, max, platformId, serviceType." },
    { method: "GET", path: "/api/v1/boost/categories", desc: "Liste tous les noms de catégories pour construire des filtres." },
    { method: "POST", path: "/api/v1/boost/order", desc: "Passe une commande de boost en Coins uniquement (pas de carte/mobile money via l'API). Débite des Coins de votre solde. Renvoie 402 avec requiredTx, balanceTx, shortfallTx si le solde est trop bas. Rembourse automatiquement les Coins si la commande échoue en amont.", body: '{"serviceId":745,"link":"https://instagram.com/handle","quantity":1000}' },
    { method: "GET", path: "/api/v1/boost/orders", desc: "Liste vos commandes de boost ainsi que les statistiques (total, terminées, en attente, échouées, globalCompleted)." },
    { method: "GET", path: "/api/v1/boost/orders/:id/refresh", desc: "Actualise le statut d'une commande depuis le pipeline de traitement." },
  ];

  const accountEndpoints: EndpointDoc[] = [
    { method: "GET", path: "/api/v1/me", desc: "Vérifiez le solde de votre compte, la devise, et l'utilisation de l'API." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigateWithLoader("/dashboard")} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-teal-400" />
              <span className="font-bold text-sm sm:text-base">API développeur</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div>
          <h1 className="text-xl font-bold mb-1">Ma clé API</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Déployez des bots et passez des commandes de boost sur les réseaux sociaux par programmation. Une seule clé API, des endpoints REST simples, facturés uniquement depuis votre solde de Coins (rechargez sur le site d'abord — carte/mobile money direct est réservé au site).
          </p>
          <div className="mb-4 p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 text-xs text-teal-200/90 leading-relaxed">
            <p className="font-semibold text-teal-300 mb-1">Facturation en Coins pour les commandes API</p>
            <p>Les appels de boost et de déploiement de bot déduisent des Coins de votre compte. Si vous n'avez pas assez de Coins, l'API renvoie <code className="text-[11px]">402 INSUFFICIENT_COINS</code> avec <code className="text-[11px]">requiredTx</code>, <code className="text-[11px]">balanceTx</code>, et <code className="text-[11px]">shortfallTx</code> afin que vous puissiez inviter l'utilisateur à recharger.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              {rawKey && (
                <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">Copiez-la et conservez-la en lieu sûr. Vous pouvez l'afficher à nouveau ci-dessous à tout moment.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-background/60 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">{rawKey}</code>
                    <button onClick={copyRawKey} className="p-2 rounded-md hover:bg-muted transition-colors shrink-0">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {!status?.hasKey ? (
                <div className="text-center py-4">
                  <KeyRound className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Vous n'avez pas encore créé de clé API.</p>
                  <Button onClick={handleGenerate} disabled={busy} className="gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    Générer une clé API
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="text-sm font-mono truncate">{revealedKey || status.maskedKey}</code>
                      {revealedKey && (
                        <button onClick={copyRevealedKey} className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${status.active ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {status.active ? "Active" : "En pause"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-muted-foreground">
                    <div><p className="font-medium text-foreground">{status.callCount}</p>Appels</div>
                    <div><p className="font-medium text-foreground">{status.lastUsedAt ? new Date(status.lastUsedAt).toLocaleDateString() : "Jamais"}</p>Dernière utilisation</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleToggleReveal} disabled={revealBusy} className="gap-1.5">
                      {revealBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : revealedKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {revealedKey ? "Masquer" : "Afficher"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={busy} className="gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Régénérer
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePauseResume} disabled={busy} className="gap-1.5">
                      {status.active ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Reprendre</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDelete} disabled={busy} className="gap-1.5 text-red-400 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-1">URL de base</h2>
          <CodeBlock>{`${origin}/api/v1`}</CodeBlock>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-1">Authentification</h2>
          <p className="text-sm text-muted-foreground mb-3">Envoyez votre clé à chaque requête :</p>
          <CodeBlock>{`Authorization: Bearer <YOUR_API_KEY>`}</CodeBlock>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-1">Limites de débit & mise en cache</h2>
          <p className="text-sm text-muted-foreground mb-3">
            300 requêtes par 15 minutes par clé. GET /boost/services est en lecture seule et gratuit, mais notre catalogue ne change que lorsque nous l'actualisons (environ toutes les 30 minutes) — l'appeler à chaque chargement de page ou commande est donc inutile et gaspille votre quota.
          </p>
          <p className="text-sm text-muted-foreground">
            Mettez la réponse en cache pendant au moins 10 à 15 minutes de votre côté (en mémoire, Redis, ou une base de données) et servez vos propres utilisateurs depuis ce cache. Ne rechargez que lorsque le cache expire, pas à chaque requête.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">Compte</h2>
          {accountEndpoints.map(ep => <EndpointRow key={ep.path} ep={ep} origin={origin} />)}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">Modèles de bot</h2>
          {templateEndpoints.map(ep => <EndpointRow key={ep.path} ep={ep} origin={origin} />)}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">Déploiement de bot</h2>
          {botEndpoints.map(ep => <EndpointRow key={ep.path} ep={ep} origin={origin} />)}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-1">Boost réseaux sociaux</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Flux recommandé : GET services → choisir serviceId → POST order avec link + quantity → interroger GET orders ou refresh. Mettez la liste des services en cache 10 à 15 minutes de votre côté.
          </p>
          {boostEndpoints.map(ep => <EndpointRow key={ep.path + ep.method} ep={ep} origin={origin} />)}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-lg font-bold">Exemple de démarrage rapide</h2>
          <p className="text-sm text-muted-foreground">Commander 1000 abonnés Instagram après vérification du solde :</p>
          <CodeBlock>{`# 1) Vérifier le solde
curl "${origin}/api/v1/me" -H "Authorization: Bearer <YOUR_API_KEY>"

# 2) Trouver un service
curl "${origin}/api/v1/boost/services?q=instagram%20followers&currency=KES" \
  -H "Authorization: Bearer <YOUR_API_KEY>"

# 3) Passer la commande (Coins déduits)
curl -X POST "${origin}/api/v1/boost/order" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":745,"link":"https://instagram.com/handle","quantity":1000}'`}</CodeBlock>
          <p className="text-xs text-muted-foreground">En cas de succès, vous recevez order id, status, costTx, costKes, et balanceLeft. En cas de solde insuffisant, vous recevez un 402 clair indiquant combien de Coins manquent.</p>
        </div>
      </main>
    </div>
  );
}
