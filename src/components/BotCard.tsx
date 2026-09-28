import { useState } from "react";
import type { Bot } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import {
  startBot,
  stopBot,
  restartBot,
  deleteBot,
  renewBot,
  getBotLogs,
  updateBotVars,
  getTemplateAppVars,
} from "@/lib/api";
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  FileText,
  Settings,
  Loader2,
  Timer,
  Calendar,
  Copy,
  Check,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";
import { LogViewer } from "./LogViewer";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { Modal } from "./Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BotCardProps {
  bot: Bot;
  onUpdate: () => void;
  deploying?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "running":
      return "text-green-400 bg-green-400/10 border-green-400/20";
    case "stopped":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    case "expired":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "building":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "failed":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded transition-all ${
        copied
          ? "text-green-400"
          : "text-muted-foreground hover:text-foreground"
      }`}
      title="Copier"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

interface AppVar {
  key: string;
  description: string;
  required: boolean;
  value: string;
}

export function BotCard({
  bot,
  onUpdate,
  deploying = false,
}: BotCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stopWarnOpen, setStopWarnOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsTip, setSettingsTip] = useState(true);
  const [renewOpen, setRenewOpen] = useState(false);
  const [sessionVar, setSessionVar] = useState(bot.sessionVar);
  const [editDevice, setEditDevice] = useState<"android" | "ios">("android");
  const [editExtraVars, setEditExtraVars] = useState<
    { key: string; value: string }[]
  >([]);
  const [logsRefreshing, setLogsRefreshing] = useState(false);
  const [appVars, setAppVars] = useState<AppVar[]>([]);
  const [appVarsLoading, setAppVarsLoading] = useState(false);
  const [templateSessionUrl, setTemplateSessionUrl] = useState("");

  const { showToast } = useToast();

  const isRunning = bot.status === "running";
  const isStopped =
    bot.status === "stopped" || bot.status === "expired";

  const templateId = (
    bot as unknown as { templateId?: string }
  ).templateId;

  const templateName = (
    bot as unknown as { templateName?: string }
  ).templateName;

  const storedSessionUrl =
    (bot as unknown as { sessionIdUrl?: string }).sessionIdUrl || "";

  const isDefaultBot = !templateId;

  const displaySessionUrl =
    storedSessionUrl ||
    templateSessionUrl ||
    (isDefaultBot ? "https://gestontech.online/pairing" : "");

  const handleAction = async (
    action: string,
    fn: () => Promise<unknown>,
  ) => {
    setLoading(action);

    try {
      const res = (await fn()) as {
        success?: boolean;
        error?: string;
      };

      if (
        res &&
        typeof res === "object" &&
        "error" in res &&
        res.error
      ) {
        showToast(res.error, "error");
      } else {
        showToast(`${action} réussi`, "success");
        onUpdate();
      }
    } catch {
      showToast(`Échec : ${action.toLowerCase()}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const handleViewLogs = async () => {
    setLogsRefreshing(true);

    try {
      const res = (await getBotLogs(bot._id)) as {
        logs?: string[];
      };

      setLogs(res.logs || []);
      setLogsOpen(true);
    } catch {
      showToast(
        "Échec de la récupération des journaux",
        "error",
      );
    } finally {
      setLogsRefreshing(false);
    }
  };

  const handleRefreshLogs = async () => {
    setLogsRefreshing(true);

    try {
      const res = (await getBotLogs(bot._id)) as {
        logs?: string[];
      };

      setLogs(res.logs || []);
    } catch {
      showToast(
        "Échec de l'actualisation des journaux",
        "error",
      );
    } finally {
      setLogsRefreshing(false);
    }
  };

  const handleOpenSettings = async () => {
    setSessionVar(bot.sessionVar);
    setEditExtraVars([]);
    setAppVars([]);
    setTemplateSessionUrl("");
    setSettingsTip(true);
    setEditOpen(true);

    if (templateId) {
      setAppVarsLoading(true);

      try {
        const res = (await getTemplateAppVars(templateId)) as {
          vars?: AppVar[];
          sessionIdUrl?: string;
        };

        setAppVars(res.vars || []);
        setTemplateSessionUrl(res.sessionIdUrl || "");

        setEditExtraVars(
          (res.vars || []).map((v) => ({
            key: v.key,
            value: v.value || "",
          })),
        );
      } catch {
        // Ignore template variable loading errors.
      } finally {
        setAppVarsLoading(false);
      }
    }
  };

  const handleEditVars = async () => {
    if (!sessionVar.trim()) {
      showToast("L'ID de session est requis", "error");
      return;
    }

    const extraObj: Record<string, string> = {};

    for (const { key, value } of editExtraVars) {
      if (key.trim()) {
        extraObj[key.trim()] = value;
      }
    }

    await handleAction(
      "Mise à jour",
      () =>
        updateBotVars(
          bot._id,
          sessionVar.trim(),
          isDefaultBot ? editDevice : undefined,
          Object.keys(extraObj).length > 0
            ? extraObj
            : undefined,
        ),
    );

    setEditOpen(false);
  };

  const handleRenew = async () => {
    await handleAction(
      "Renouvellement",
      () => renewBot(bot._id, 1),
    );

    setRenewOpen(false);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);

    try {
      await deleteBot(bot._id);

      showToast("Bot supprimé", "success");
      setDeleteOpen(false);
      onUpdate();
    } catch {
      showToast(
        "Échec de la suppression du bot",
        "error",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmStop = async () => {
    setStopWarnOpen(false);

    await handleAction(
      "Arrêt",
      () => stopBot(bot._id),
    );
  };

  return (
    <>
      <div className="relative rounded-xl bg-card border border-border hover:border-border/80 transition-all duration-200">
        {deploying && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-base font-semibold">
              Déploiement...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Votre bot s'initialise
            </p>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono font-medium truncate">
                  {bot.herokuAppName}
                </p>

                <CopyButton text={bot.herokuAppName} />
              </div>

              <p className="text-xs text-muted-foreground mt-0.5">
                {bot.phoneNumber}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${getStatusColor(
                  bot.status,
                )}`}
              >
                {(
                  {
                    running: "actif",
                    stopped: "arrêté",
                    expired: "expiré",
                    building: "en construction",
                    failed: "échoué",
                  } as Record<string, string>
                )[bot.status] || bot.status}
              </span>

              {templateName && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/15 text-teal-400 border border-teal-500/20 whitespace-nowrap">
                  {templateName}
                </span>
              )}
            </div>
          </div>

          {bot.status === "expired" && bot.gracePeriodEnd ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Timer className="w-3 h-3 shrink-0 text-orange-400" />

              <span className="text-orange-400 font-medium">
                Suppression dans{" "}
                <CountdownTimer
                  target={bot.gracePeriodEnd}
                  expiredLabel="quelques instants"
                  className="font-semibold"
                />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Calendar className="w-3 h-3 shrink-0" />

              <span>
                Expire : {formatDate(bot.expiresAt)}
              </span>

              <span className="text-muted-foreground/50">
                ·
              </span>

              <CountdownTimer
                target={bot.expiresAt}
                expiredLabel="Expire"
                className="font-medium"
                urgentClassName="text-orange-400"
              />
            </div>
          )}

          {bot.isTrial && (
            <div className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20 inline-block mb-3">
              Essai gratuit
            </div>
          )}

          {bot.status === "expired" && !bot.isTrial && (
            <div className="text-xs bg-orange-500/10 text-orange-400 px-3 py-2 rounded-lg border border-orange-500/20 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />

              Abonnement expiré — renouvelez gratuitement sous
              2 jours ou ce bot sera définitivement supprimé.
            </div>
          )}

          {!deploying && (
            <div className="flex flex-wrap gap-1.5">
              {isRunning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStopWarnOpen(true)}
                  disabled={!!loading}
                  className="h-8 text-xs bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  title="Arrêter votre bot"
                >
                  {loading === "Arrêt" ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Square className="w-3 h-3 mr-1" />
                  )}

                  Arrêter
                </Button>
              ) : isStopped ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleAction(
                      "Démarrage",
                      () => startBot(bot._id),
                    )
                  }
                  disabled={!!loading}
                  className="h-8 text-xs bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                  title="Démarrer votre bot"
                >
                  {loading === "Démarrage" ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}

                  Démarrer
                </Button>
              ) : null}

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleAction(
                    "Redémarrage",
                    () => restartBot(bot._id),
                  )
                }
                disabled={!!loading || !isRunning}
                className={`h-8 text-xs ${
                  !isRunning
                    ? "opacity-40 cursor-not-allowed"
                    : ""
                }`}
                title={
                  !isRunning
                    ? "Le bot doit être actif pour redémarrer"
                    : "Redémarrer votre bot"
                }
              >
                <RotateCcw
                  className={`w-3 h-3 mr-1 ${
                    loading === "Redémarrage"
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Redémarrer
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleViewLogs}
                disabled={logsRefreshing || !isRunning}
                className={`h-8 text-xs ${
                  !isRunning
                    ? "opacity-40 cursor-not-allowed"
                    : ""
                }`}
                title={
                  !isRunning
                    ? "Le bot doit être actif pour voir les journaux"
                    : "Voir les journaux"
                }
              >
                {logsRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <FileText className="w-3 h-3 mr-1" />
                )}

                Logs
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenSettings}
                className="h-8 text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Variables
              </Button>

              {!bot.isTrial && bot.status === "expired" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRenewOpen(true)}
                  className="h-8 text-xs bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
                  title="Renouveler gratuitement le bot"
                >
                  <Timer className="w-3 h-3 mr-1" />
                  Renouveler gratuitement
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => setDeleteOpen(true)}
                disabled={!!loading || deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <LogViewer
        isOpen={logsOpen}
        onClose={() => setLogsOpen(false)}
        logs={logs}
        botName={bot.herokuAppName}
        onRefresh={handleRefreshLogs}
        refreshing={logsRefreshing}
      />

      <Modal
        isOpen={stopWarnOpen}
        onClose={() => setStopWarnOpen(false)}
        title="Arrêter le bot ?"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-full bg-yellow-900/40 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>

          <div className="text-center space-y-1">
            <p className="font-medium">
              {bot.herokuAppName}
            </p>

            <p className="text-muted-foreground text-sm">
              Arrêter ce bot le mettra en mode maintenance.
              Il sera inaccessible jusqu'à son redémarrage.
            </p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStopWarnOpen(false)}
            >
              Annuler
            </Button>

            <Button
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white border-0"
              onClick={handleConfirmStop}
              disabled={loading === "Arrêt"}
            >
              {loading === "Arrêt" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}

              Arrêter le bot
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() =>
          !deleteLoading && setDeleteOpen(false)
        }
        onConfirm={handleDelete}
        loading={deleteLoading}
        title={`Supprimer ${bot.herokuAppName} ?`}
        description="Cela supprimera définitivement le bot et cette action est irréversible."
      />

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Variables"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {settingsTip && (
            <div className="p-3 rounded-lg border border-teal-500/25 bg-teal-500/10 space-y-2">
              <p className="text-xs text-teal-200 leading-relaxed">
                Pour remplacer votre session : appuyez sur{" "}
                <span className="font-semibold">
                  Effacer
                </span>{" "}
                pour supprimer l'ancien ID de session,
                collez le nouveau, puis appuyez sur
                Enregistrer.
              </p>

              <button
                type="button"
                onClick={() => setSettingsTip(false)}
                className="text-xs font-semibold text-teal-300 hover:text-teal-200"
              >
                OK, compris
              </button>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              ID de session
            </Label>

            <div className="flex gap-2">
              <Input
                value={sessionVar}
                onChange={(e) =>
                  setSessionVar(e.target.value)
                }
                placeholder="Collez le nouvel ID de session"
                className="flex-1 font-mono text-xs"
              />

              <button
                type="button"
                onClick={() => setSessionVar("")}
                className="px-3 rounded-lg border border-border hover:bg-muted transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0"
              >
                Effacer
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5">
              Appuyez sur Effacer pour supprimer l'ID de
              session entier, puis collez-en un nouveau et
              enregistrez.
            </p>

            {displaySessionUrl && (
              <p className="text-xs text-muted-foreground mt-1">
                Obtenez une nouvelle session sur{" "}
                <a
                  href={displaySessionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:underline"
                >
                  {displaySessionUrl
                    .replace(/^https?:\/\//, "")
                    .split("/")[0]}
                </a>
              </p>
            )}
          </div>

          {isDefaultBot && (
            <div>
              <Label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Type d'appareil
              </Label>

              <Select
                value={editDevice}
                onValueChange={(v: "android" | "ios") =>
                  setEditDevice(v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="android">
                    Android
                  </SelectItem>

                  <SelectItem value="ios">
                    iOS
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {appVarsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des variables du modèle…
            </div>
          )}

          {!appVarsLoading && appVars.length > 0 && (
            <div className="space-y-3">
              {appVars.map((varDef) => {
                const current =
                  editExtraVars.find(
                    (v) => v.key === varDef.key,
                  )?.value ?? "";

                return (
                  <div key={varDef.key}>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {varDef.key}
                      {varDef.required ? " *" : ""}
                    </Label>

                    {varDef.description && (
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {varDef.description}
                      </p>
                    )}

                    <Input
                      value={current}
                      onChange={(e) =>
                        setEditExtraVars((prev) => {
                          const next = prev.filter(
                            (v) => v.key !== varDef.key,
                          );

                          next.push({
                            key: varDef.key,
                            value: e.target.value,
                          });

                          return next;
                        })
                      }
                      placeholder={
                        varDef.value || varDef.key
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setEditOpen(false)}
            >
              Annuler
            </Button>

            <Button
              className="flex-1"
              onClick={handleEditVars}
              disabled={!!loading || appVarsLoading}
            >
              {loading === "Mise à jour" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}

              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={renewOpen}
        onClose={() => setRenewOpen(false)}
        title="Renouvellement gratuit"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="font-medium">
              {bot.herokuAppName}
            </p>

            <p className="text-sm text-muted-foreground">
              Prolonger ce bot de 1 mois
            </p>
          </div>

          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-300">
            Ce renouvellement est gratuit. Aucun paiement
            ni solde n'est nécessaire.
          </div>

          <Button
            className="w-full"
            onClick={handleRenew}
            disabled={!!loading}
          >
            {loading === "Renouvellement" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}

            Renouveler gratuitement
          </Button>
        </div>
      </Modal>
    </>
  );
}
