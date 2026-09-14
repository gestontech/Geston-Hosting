import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BotTemplate } from "@/types";
import { Plus, Loader2, RefreshCw, Copy, Check, Trash2, Pencil } from "lucide-react";
import { addBotTemplate, updateBotTemplate } from "@/lib/api";

interface BotTemplatesTabProps {
  botTemplates: BotTemplate[];
  newTemplate: { name: string; githubRepo: string; sessionIdUrl: string; costTx: string };
  setNewTemplate: React.Dispatch<
    React.SetStateAction<{ name: string; githubRepo: string; sessionIdUrl: string; costTx: string }>
  >;
  addingTemplate: boolean;
  setAddingTemplate: (v: boolean) => void;
  loading: Record<string, boolean>;
  fetchData: (key: string) => void;
  setDeleteTemplateModal: (v: { open: boolean; id: string; name: string }) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function BotTemplatesTab({
  botTemplates,
  newTemplate,
  setNewTemplate,
  addingTemplate,
  setAddingTemplate,
  loading,
  fetchData,
  setDeleteTemplateModal,
  showToast,
}: BotTemplatesTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    githubRepo: "",
    sessionIdUrl: "",
    costTx: "",
  });
  const [saving, setSaving] = useState(false);

  const startEdit = (t: BotTemplate) => {
    setEditingId(t._id);
    setEditForm({
      name: t.name || "",
      githubRepo: t.githubRepo || "",
      sessionIdUrl: t.sessionIdUrl || "",
      costTx: String(t.costTx ?? 10),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", githubRepo: "", sessionIdUrl: "", costTx: "" });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.githubRepo.trim() || !editForm.sessionIdUrl.trim()) {
      showToast("Remplissez tous les champs", "error");
      return;
    }
    setSaving(true);
    try {
      const res = (await updateBotTemplate(id, {
        name: editForm.name.trim(),
        githubRepo: editForm.githubRepo.trim(),
        sessionIdUrl: editForm.sessionIdUrl.trim(),
        costTx: Number(editForm.costTx) || 10,
      })) as { ok?: boolean; error?: string };
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Modèle mis à jour", "success");
        cancelEdit();
        fetchData("bot-templates");
      }
    } catch {
      showToast("Échec de la mise à jour du modèle", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (t: BotTemplate) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/services/bots/${t.shareableSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(t._id);
      showToast("Lien du modèle copié", "success");
      setTimeout(() => setCopiedId((cur) => (cur === t._id ? null : cur)), 2000);
    } catch {
      showToast("Impossible de copier", "error");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un modèle de bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">Nom du bot</Label>
              <Input
                placeholder="ex. Geston MD"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Coût (Coins)</Label>
              <Input
                type="number"
                placeholder="10"
                value={newTemplate.costTx}
                onChange={(e) => setNewTemplate((p) => ({ ...p, costTx: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">URL du dépôt GitHub</Label>
              <Input
                placeholder="https://github.com/user/repo"
                value={newTemplate.githubRepo}
                onChange={(e) => setNewTemplate((p) => ({ ...p, githubRepo: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">URL de l'ID de session</Label>
              <Input
                placeholder="https://example.com/pairing"
                value={newTemplate.sessionIdUrl}
                onChange={(e) => setNewTemplate((p) => ({ ...p, sessionIdUrl: e.target.value }))}
              />
            </div>
          </div>
          <Button
            disabled={addingTemplate}
            onClick={async () => {
              if (!newTemplate.name || !newTemplate.githubRepo || !newTemplate.sessionIdUrl) {
                showToast("Remplissez tous les champs", "error");
                return;
              }
              setAddingTemplate(true);
              try {
                const res = (await addBotTemplate({
                  name: newTemplate.name,
                  githubRepo: newTemplate.githubRepo,
                  sessionIdUrl: newTemplate.sessionIdUrl,
                  costTx: Number(newTemplate.costTx) || 10,
                })) as { ok?: boolean; error?: string };
                if (res.error) {
                  showToast(res.error, "error");
                } else {
                  showToast("Modèle de bot ajouté !", "success");
                  setNewTemplate({ name: "", githubRepo: "", sessionIdUrl: "", costTx: "10" });
                  fetchData("bot-templates");
                }
              } catch {
                showToast("Échec de l'ajout du modèle", "error");
              }
              setAddingTemplate(false);
            }}
            className="gap-2"
          >
            {addingTemplate ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Ajout...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Ajouter le modèle
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{botTemplates.length} modèles</p>
        <Button variant="outline" size="sm" onClick={() => fetchData("bot-templates")} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </Button>
      </div>

      {loading["bot-templates"] ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : botTemplates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Aucun modèle de bot pour le moment.</div>
      ) : (
        <div className="space-y-3">
          {botTemplates.map((t) => {
            const deployCount = (t as { deployCount?: number }).deployCount ?? 0;
            const isEditing = editingId === t._id;
            return (
              <div key={t._id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      {t.isDefault && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-400 font-semibold">
                          Par défaut
                        </span>
                      )}
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/20">
                        {deployCount} déployés
                      </span>
                    </div>
                    {!isEditing && (
                      <>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.githubRepo}</p>
                        <p className="text-xs text-teal-400 mt-0.5">{t.costTx} Coins/mois</p>
                        {t.shareableSlug && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                            /services/bots/{t.shareableSlug}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(t)}
                      className="gap-1.5 min-w-[7.5rem]"
                    >
                      {copiedId === t._id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copier le lien
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (isEditing ? cancelEdit() : startEdit(t))}
                      className="gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {isEditing ? "Annuler" : "Modifier"}
                    </Button>
                    {!t.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTemplateModal({ open: true, id: t._id, name: t.name })}
                        className="text-red-400 border-red-400/20 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div>
                      <Label className="text-xs mb-1.5 block">Nom du bot</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Coût (Coins)</Label>
                      <Input
                        type="number"
                        value={editForm.costTx}
                        onChange={(e) => setEditForm((p) => ({ ...p, costTx: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">URL du dépôt GitHub</Label>
                      <Input
                        value={editForm.githubRepo}
                        onChange={(e) => setEditForm((p) => ({ ...p, githubRepo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">URL de l'ID de session</Label>
                      <Input
                        value={editForm.sessionIdUrl}
                        onChange={(e) => setEditForm((p) => ({ ...p, sessionIdUrl: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button size="sm" disabled={saving} onClick={() => saveEdit(t._id)} className="gap-2">
                        {saving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          "Enregistrer les modifications"
                        )}
                      </Button>
                    </div>
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
