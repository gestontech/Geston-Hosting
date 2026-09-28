import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  RefreshCw,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";

import {
  getAdminBoostOrders,
  markAdminBoostOrderComplete,
  syncAdminBoostCatalogue,
  getAdminBoostCatalogueMeta,
} from "@/lib/api";

interface SmpTabProps {
  boostOrders: Array<Record<string, unknown>>;
  setBoostOrders: React.Dispatch<
    React.SetStateAction<Array<Record<string, unknown>>>
  >;

  boostOrderStats: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    processing: number;
    globalCompleted: number;
  };

  setBoostOrderStats: React.Dispatch<
    React.SetStateAction<{
      total: number;
      completed: number;
      pending: number;
      failed: number;
      processing: number;
      globalCompleted: number;
    }>
  >;

  smpFilter: string;
  setSmpFilter: (v: string) => void;

  smpStatus: string;
  setSmpStatus: (v: string) => void;

  setSmpPage: (v: number) => void;

  catalogueMeta: {
    count: number;
    updatedAt: string | null;
    source?: string;
    mongoCount?: number;
  };

  setCatalogueMeta: React.Dispatch<
    React.SetStateAction<{
      count: number;
      updatedAt: string | null;
      source?: string;
      mongoCount?: number;
    }>
  >;

  syncingCatalogue: boolean;
  setSyncingCatalogue: (v: boolean) => void;

  loading: Record<string, boolean>;
  setLoading: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;

  fetchData: (key: string) => void;

  showToast: (
    msg: string,
    type?: "success" | "error" | "info"
  ) => void;
}

export function SmpTab({
  boostOrders,
  setBoostOrders,
  boostOrderStats,
  setBoostOrderStats,
  smpFilter,
  setSmpFilter,
  smpStatus,
  setSmpStatus,
  setSmpPage,
  catalogueMeta,
  setCatalogueMeta,
  syncingCatalogue,
  setSyncingCatalogue,
  loading,
  setLoading,
  fetchData,
  showToast,
}: SmpTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-400" />
            Commandes de boost réseaux sociaux
          </h2>

          <p className="text-xs text-muted-foreground mt-0.5">
            Toutes les commandes de boost avec les détails
            utilisateur et fournisseur.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData("smp")}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser les commandes
          </Button>

          <Button
            size="sm"
            disabled={syncingCatalogue}
            className="gap-2"
            onClick={async () => {
              setSyncingCatalogue(true);

              try {
                const res =
                  (await syncAdminBoostCatalogue()) as {
                    ok?: boolean;
                    count?: number;
                    updatedAt?: string;
                    error?: string;
                  };

                if (res.error) {
                  showToast(res.error, "error");
                } else {
                  showToast(
                    `Catalogue mis à jour — ${res.count ?? 0} services`,
                    "success"
                  );

                  const meta =
                    await getAdminBoostCatalogueMeta().catch(
                      () => null
                    );

                  if (meta) {
                    setCatalogueMeta(meta);
                  }
                }
              } catch {
                showToast(
                  "Échec de la récupération du catalogue depuis le fournisseur",
                  "error"
                );
              } finally {
                setSyncingCatalogue(false);
              }
            }}
          >
            {syncingCatalogue ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}

            Récupérer les mises à jour depuis l'API
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <p>
          Catalogue local :{" "}
          <span className="text-foreground font-semibold">
            {catalogueMeta.count}
          </span>{" "}
          services
          {catalogueMeta.mongoCount != null ? (
            <>
              {" "}
              · Mongo :{" "}
              <span className="text-foreground font-semibold">
                {catalogueMeta.mongoCount}
              </span>
            </>
          ) : null}
          {catalogueMeta.updatedAt ? (
            <>
              {" "}
              · Mis à jour{" "}
              {new Date(
                catalogueMeta.updatedAt
              ).toLocaleString()}
            </>
          ) : null}
          {catalogueMeta.source ? (
            <> · Source : {catalogueMeta.source}</>
          ) : null}
        </p>

        <p className="mt-1">
          Les commandes de boost sont gratuites pour les
          utilisateurs. Le fournisseur reste utilisé normalement
          pour effectuer le déploiement réel.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          {
            label: "Total",
            value: boostOrderStats.total,
            color: "",
          },
          {
            label: "Terminées",
            value: boostOrderStats.completed,
            color: "text-green-400",
          },
          {
            label: "En cours",
            value: boostOrderStats.processing,
            color: "text-blue-400",
          },
          {
            label: "En attente",
            value: boostOrderStats.pending,
            color: "text-amber-400",
          },
          {
            label: "Échouées",
            value: boostOrderStats.failed,
            color: "text-red-400",
          },
          {
            label: "Terminées (global)",
            value: boostOrderStats.globalCompleted,
            color: "text-pink-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-3"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {s.label}
            </p>

            <p className={`text-lg font-bold ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Rechercher e-mail, nom d'utilisateur, lien, service..."
          value={smpFilter}
          onChange={(e) => setSmpFilter(e.target.value)}
          className="flex-1"
        />

        <select
          value={smpStatus}
          onChange={(e) => setSmpStatus(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="completed">Terminée</option>
          <option value="processing">En cours</option>
          <option value="pending">En attente</option>
          <option value="partial">Partielle</option>
          <option value="awaiting_payment">
            Ancienne commande en attente
          </option>
          <option value="failed">Échouée</option>
          <option value="refunded">Ancienne commande remboursée</option>
        </select>

        <Button
          onClick={async () => {
            setLoading((prev) => ({
              ...prev,
              smp: true,
            }));

            try {
              const bo = await getAdminBoostOrders({
                page: 1,
                limit: 50,
                status: smpStatus || undefined,
                q: smpFilter || undefined,
              });

              if (bo && Array.isArray(bo.orders)) {
                setBoostOrders(bo.orders);
              }

              if (bo?.stats) {
                setBoostOrderStats(bo.stats);
              }

              setSmpPage(1);
            } catch {
              showToast(
                "Échec du chargement des commandes de boost",
                "error"
              );
            } finally {
              setLoading((prev) => ({
                ...prev,
                smp: false,
              }));
            }
          }}
          className="gap-2"
        >
          <Search className="w-3.5 h-3.5" />
          Rechercher
        </Button>
      </div>

      {loading["smp"] ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : boostOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucune commande de boost trouvée.
        </div>
      ) : (
        <div className="space-y-3">
          {boostOrders.map((o) => {
            const user = o.user as {
              email?: string;
              username?: string;
              id?: string;
            } | null;

            const status = String(o.status);

            const statusLabel =
              ({
                completed: "Terminée",
                processing: "En cours",
                pending: "En attente",
                partial: "Partielle",
                awaiting_payment:
                  "Ancienne commande en attente",
                failed: "Échouée",
                refunded:
                  "Ancienne commande remboursée",
              } as Record<string, string>)[status] ||
              status;

            return (
              <div
                key={String(o._id)}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold break-words">
                      {String(o.serviceName)}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      {String(o.category || "")}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                      status === "completed" ||
                      status === "partial"
                        ? "bg-green-500/10 text-green-400"
                        : status === "failed" ||
                            status === "refunded"
                          ? "bg-red-500/10 text-red-400"
                          : status === "processing"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">
                      ID commande :
                    </span>{" "}
                    <span className="font-mono">
                      {String(o._id)}
                    </span>
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Commande fournisseur :
                    </span>{" "}
                    <span className="font-mono">
                      {String(
                        o.providerOrderId || "—"
                      )}
                    </span>
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      E-mail :
                    </span>{" "}
                    {user?.email || "—"}
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Utilisateur :
                    </span>{" "}
                    {user?.username || "—"}
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Quantité :
                    </span>{" "}
                    {String(o.quantity)}
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Coût utilisateur :
                    </span>{" "}
                    Gratuit
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Paiement :
                    </span>{" "}
                    Gratuit
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Lien :
                    </span>{" "}
                    <a
                      href={String(o.link)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {String(o.link)}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Créée :
                    </span>{" "}
                    {o.createdAt
                      ? new Date(
                          String(o.createdAt)
                        ).toLocaleString()
                      : "—"}
                  </p>

                  <p>
                    <span className="text-muted-foreground">
                      Mise à jour :
                    </span>{" "}
                    {o.updatedAt
                      ? new Date(
                          String(o.updatedAt)
                        ).toLocaleString()
                      : "—"}
                  </p>
                </div>

                {status !== "completed" &&
                  status !== "refunded" && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto gap-2 text-green-400 border-green-500/30 hover:bg-green-500/10"
                        onClick={async () => {
                          try {
                            const res =
                              (await markAdminBoostOrderComplete(
                                String(o._id)
                              )) as {
                                ok?: boolean;
                                error?: string;
                                status?: string;
                              };

                            if (res.error) {
                              showToast(
                                res.error,
                                "error"
                              );
                              return;
                            }

                            showToast(
                              "Commande marquée comme terminée",
                              "success"
                            );

                            fetchData("smp");
                          } catch {
                            showToast(
                              "Échec du marquage comme terminée",
                              "error"
                            );
                          }
                        }}
                      >
                        Marquer comme terminée
                      </Button>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
