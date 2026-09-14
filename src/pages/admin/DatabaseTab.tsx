import { Button } from "@/components/ui/button";
import type { DbStats, DbCollectionStat } from "@/types";
import { RefreshCw, Loader2, Database, Trash2, AlertCircle } from "lucide-react";
import { purgeAdminCollection } from "@/lib/api";

interface DatabaseTabProps {
  dbStats: DbStats | null;
  purgeModal: { open: boolean; collection: string; label: string };
  setPurgeModal: (v: { open: boolean; collection: string; label: string }) => void;
  purging: boolean;
  setPurging: (v: boolean) => void;
  fetchData: (key: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const SENSITIVE = new Set([
  "users",
  "bots",
  "panels",
  "transactions",
  "bottemplates",
  "appsettings",
  "developer_api_keys",
]);

export function DatabaseTab({
  dbStats,
  purgeModal,
  setPurgeModal,
  purging,
  setPurging,
  fetchData,
  showToast,
}: DatabaseTabProps) {
  const isSensitive = SENSITIVE.has(purgeModal.collection);
  const isApiKeys = purgeModal.collection === "developer_api_keys";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Inspectez les collections et purgez les documents. Chaque purge demande une confirmation au préalable.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData("database")}
          className="gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </Button>
      </div>
      {!dbStats ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {dbStats.quota && (
            <div className="rounded-xl border border-border bg-card p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Utilisation du stockage</p>
                <span className="text-xs text-muted-foreground">
                  {dbStats.quota.usedMb.toFixed(1)} Mo / {dbStats.quota.quotaMb} Mo de quota
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    dbStats.quota.usedPercent > 90
                      ? "bg-red-500"
                      : dbStats.quota.usedPercent > 70
                        ? "bg-amber-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${dbStats.quota.usedPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                <span>{dbStats.quota.usedPercent.toFixed(1)}% utilisé</span>
                <span>{dbStats.quota.remainingMb.toFixed(1)} Mo restants</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dbStats.collections.map((col: DbCollectionStat) => (
              <div
                key={col.name}
                className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
                      {col.label}
                    </p>
                    <p className="text-2xl font-bold mt-1">{col.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {col.name === "developer_api_keys" ? "utilisateurs avec clé API" : "documents"}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                {col.canPurge && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPurgeModal({ open: true, collection: col.name, label: col.label })
                    }
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20 hover:border-red-400/30"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Tout purger
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {purgeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold">Purger {purgeModal.label} ?</h3>
                <p className="text-xs text-muted-foreground">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isApiKeys ? (
                <>
                  La clé API développeur de chaque utilisateur sera effacée. Les comptes restent intacts — les utilisateurs devront
                  générer une nouvelle clé sur la page Développeurs.
                </>
              ) : (
                <>
                  Tous les documents de{" "}
                  <span className="text-foreground font-medium">{purgeModal.label}</span> seront
                  définitivement supprimés.
                </>
              )}
            </p>
            {isSensitive && (
              <p className="text-xs text-amber-300 mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                Données sensibles — continuez uniquement si vous êtes certain. Les intégrations en direct peuvent cesser de fonctionner
                tant que les clés ne sont pas régénérées.
              </p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPurgeModal({ open: false, collection: "", label: "" })}
              >
                Annuler
              </Button>
              <Button
                disabled={purging}
                onClick={async () => {
                  setPurging(true);
                  try {
                    await purgeAdminCollection(purgeModal.collection);
                    const label = purgeModal.label;
                    setPurgeModal({ open: false, collection: "", label: "" });
                    await fetchData("database");
                    showToast(`${label} purgé`, "success");
                  } catch {
                    showToast("Échec de la purge", "error");
                  } finally {
                    setPurging(false);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {purging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Purge en cours...
                  </>
                ) : (
                  "Oui, purger"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
