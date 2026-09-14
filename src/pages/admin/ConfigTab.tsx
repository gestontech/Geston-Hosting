import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HerokuTeam } from "@/types";
import { Power, PowerOff, Plus, Loader2, AlertCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { setMaintenanceModeApi } from "@/lib/api";

interface ConfigTabProps {
  maintenanceMode: boolean | null;
  setMaintenanceMode: (v: boolean | null) => void;
  maintenanceLoading: boolean;
  setMaintenanceLoading: (v: boolean) => void;
  teams: HerokuTeam[];
  newTeamName: string;
  setNewTeamName: (v: string) => void;
  newTeamLabel: string;
  setNewTeamLabel: (v: string) => void;
  handleCreateTeam: () => void;
  editTeamId: string | null;
  setEditTeamId: (v: string | null) => void;
  editTeamLabel: string;
  setEditTeamLabel: (v: string) => void;
  handleUpdateTeamLabel: (id: string) => void;
  handleToggleTeamActive: (team: HerokuTeam) => void;
  setDeleteTeamModal: (v: { open: boolean; id: string; name: string }) => void;
  loading: Record<string, boolean>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function ConfigTab({
  maintenanceMode,
  setMaintenanceMode,
  maintenanceLoading,
  setMaintenanceLoading,
  teams,
  newTeamName,
  setNewTeamName,
  newTeamLabel,
  setNewTeamLabel,
  handleCreateTeam,
  editTeamId,
  setEditTeamId,
  editTeamLabel,
  setEditTeamLabel,
  handleUpdateTeamLabel,
  handleToggleTeamActive,
  setDeleteTeamModal,
  loading,
  showToast,
}: ConfigTabProps) {
  return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Power className="w-4 h-4 text-amber-400" />
                  Mode maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Une fois activé, tous les utilisateurs non-admin et non-modérateurs verront un écran de maintenance et ne pourront pas accéder au site.
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div>
                    <p className="font-medium text-sm">Statut</p>
                    <p className={`text-xs font-medium ${maintenanceMode ? "text-amber-400" : "text-green-400"}`}>
                      {maintenanceMode === null ? "Chargement..." : maintenanceMode ? "Maintenance ACTIVE — site verrouillé" : "Normal — site accessible"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={maintenanceMode ? "outline" : "outline"}
                    className={maintenanceMode ? "text-green-400 hover:text-green-300 hover:bg-green-400/10 border-green-500/30" : "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border-amber-500/30"}
                    disabled={maintenanceLoading || maintenanceMode === null}
                    onClick={async () => {
                      setMaintenanceLoading(true);
                      try {
                        const newVal = !maintenanceMode;
                        const res = await setMaintenanceModeApi(newVal) as { ok?: boolean; maintenanceMode?: boolean; error?: string };
                        if (res.error) { showToast(res.error, "error"); } else {
                          setMaintenanceMode(res.maintenanceMode ?? newVal);
                          showToast(newVal ? "Mode maintenance activé" : "Mode maintenance désactivé", "success");
                        }
                      } catch { showToast("Échec du changement de mode maintenance", "error"); }
                      finally { setMaintenanceLoading(false); }
                    }}
                  >
                    {maintenanceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : (maintenanceMode ? <Power className="w-3.5 h-3.5 mr-1" /> : <PowerOff className="w-3.5 h-3.5 mr-1" />)}
                    {maintenanceMode ? "Désactiver la maintenance" : "Activer la maintenance"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Ajouter une équipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Nom de l'équipe</Label>
                    <Input placeholder="e.g., gestontech254" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Libellé de facturation</Label>
                    <Input placeholder="ex. Compte principal" value={newTeamLabel} onChange={e => setNewTeamLabel(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleCreateTeam} disabled={loading["createTeam"]}>
                  {loading["createTeam"] ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-1" />}
                  Ajouter l'équipe
                </Button>
              </CardContent>
            </Card>

            {loading["config"] ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : teams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Aucune équipe configurée pour le moment</div>
            ) : (
              <div className="space-y-2">
                {teams.map(t => (
                  <div key={t._id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-sm font-medium">{t.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${t.active ? "bg-green-400/10 text-green-400" : "bg-gray-400/10 text-gray-400"}`}>
                              {t.active ? "Active" : "Inactive"}
                            </span>
                            {t.isFull && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-400/10 text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5" />Pleine
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t.billingLabel || <span className="italic opacity-50">Aucun libellé de facturation</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {typeof t.appCount === "number" ? `${t.appCount} app${t.appCount !== 1 ? "s" : ""}` : "Chargement..."}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              if (editTeamId === t._id) { setEditTeamId(null); } else {
                                setEditTeamId(t._id); setEditTeamLabel(t.billingLabel);
                              }
                            }}
                          >
                            {editTeamId === t._id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-8 text-xs ${t.active ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" : "text-green-400 hover:text-green-300 hover:bg-green-400/10"}`}
                            onClick={() => handleToggleTeamActive(t)}
                            disabled={loading[`toggleTeam-${t._id}`]}
                          >
                            {loading[`toggleTeam-${t._id}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (t.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />)}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            onClick={() => setDeleteTeamModal({ open: true, id: t._id, name: t.name })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {editTeamId === t._id && (
                        <div className="flex gap-2 pt-1 border-t border-border">
                          <Input
                            placeholder="Libellé de facturation"
                            value={editTeamLabel}
                            onChange={e => setEditTeamLabel(e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleUpdateTeamLabel(t._id)}
                            disabled={loading["updateTeam"]}
                          >
                            {loading["updateTeam"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enregistrer"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground text-xs uppercase tracking-wide">Comment ça marche</p>
              <p>Le site choisit automatiquement l'équipe ayant le moins d'apps lors du déploiement. Les équipes marquées comme pleines (100 apps) sont ignorées.</p>
              <p>Quand une app est transférée entre équipes, les données du bot (jours restants, expiration, etc.) restent inchangées — le nom de l'équipe dans la base de données se met à jour automatiquement.</p>
            </div>
          </div>

  );
}
