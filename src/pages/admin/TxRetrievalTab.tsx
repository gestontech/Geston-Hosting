import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { previewTxRetrieval, executeTxRetrieval } from "@/lib/api";
import { RefreshCw, Play, AlertTriangle } from "lucide-react";

type Line = {
  kind: string;
  id: string;
  email: string;
  label: string;
  cost: number;
  refundTx: number;
  remainingDays: number;
};

type Result = {
  ok?: boolean;
  dryRun?: boolean;
  botsConsidered?: number;
  lines?: Line[];
  totalTx?: number;
  usersAffected?: number;
  refunded?: number;
  emailed?: number;
  errors?: string[];
  error?: string;
};

export function TxRetrievalTab() {
  const { showToast } = useToast();
  const [preview, setPreview] = useState<Result | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<Result | null>(null);

  async function loadPreview() {
    setLoadingPreview(true);
    setDone(null);
    try {
      const res = (await previewTxRetrieval()) as Result;
      if (res.error && !res.ok) throw new Error(res.error);
      setPreview(res);
      showToast(
        `Aperçu : ${res.usersAffected || 0} utilisateurs · ${res.totalTx || 0} Coins`,
        "success"
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Échec de l'aperçu", "error");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function startRetrieval() {
    if (
      !window.confirm(
        "Cela créditera l'intégralité des Coins pour chaque bot payant éligible, enverra un e-mail à ces utilisateurs, et marquera les bots comme supprimés pour qu'ils puissent redéployer. Continuer ?"
      )
    ) {
      return;
    }
    setRunning(true);
    try {
      const res = (await executeTxRetrieval()) as Result;
      if (res.error && !res.ok) throw new Error(res.error);
      setDone(res);
      setPreview(res);
      showToast(
        `Terminé : ${res.refunded || 0} bots · ${res.totalTx || 0} Coins · ${res.emailed || 0} e-mails`,
        "success"
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Échec de la récupération", "error");
    } finally {
      setRunning(false);
    }
  }

  const lines = preview?.lines || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-base">Récupération de Coins</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Restaure l'intégralité des Coins pour les utilisateurs ayant payé des bots qui avaient encore du temps restant.
              Les essais gratuits sont exclus. Seuls les comptes avec un déploiement/renouvellement réussi
              dans l'historique des transactions sont inclus. Chaque utilisateur affecté reçoit un e-mail
              et une notification dans l'app l'invitant à redéployer.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPreview}
              disabled={loadingPreview || running}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingPreview ? "animate-spin" : ""}`} />
              Aperçu des crédits éligibles
            </Button>
            <Button
              size="sm"
              onClick={startRetrieval}
              disabled={running || loadingPreview || !preview}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              <Play className={`w-4 h-4 mr-1.5 ${running ? "animate-pulse" : ""}`} />
              {running ? "En cours…" : "Démarrer la récupération de Coins"}
            </Button>
          </div>

          {!preview && (
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
              Lancez d'abord un aperçu. Le bouton de démarrage reste verrouillé jusqu'à ce que vous examiniez la liste.
            </p>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Bots analysés</p>
                <p className="text-xl font-bold">{preview.botsConsidered ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Bots éligibles</p>
                <p className="text-xl font-bold">{lines.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
                <p className="text-xl font-bold">{preview.usersAffected ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Total Coins</p>
                <p className="text-xl font-bold text-amber-400">{preview.totalTx ?? 0}</p>
              </div>
            </div>

            {done && (
              <p className="text-sm text-green-400">
                Terminé — {done.refunded} bot(s) crédité(s), {done.emailed} utilisateur(s) contacté(s) par e-mail.
              </p>
            )}

            {preview.errors && preview.errors.length > 0 && (
              <div className="text-xs text-red-400 space-y-1">
                {preview.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-2 font-medium">E-mail</th>
                    <th className="p-2 font-medium">Bot</th>
                    <th className="p-2 font-medium text-right">Crédit Coins</th>
                    <th className="p-2 font-medium text-right">Jours restants</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        Aucun bot payant éligible trouvé.
                      </td>
                    </tr>
                  )}
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="p-2">{l.email}</td>
                      <td className="p-2 font-mono text-xs">{l.label}</td>
                      <td className="p-2 text-right text-amber-400 font-semibold">+{l.refundTx}</td>
                      <td className="p-2 text-right text-muted-foreground">{l.remainingDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
