import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useNavLoader } from "@/App";
import { useToast } from "@/hooks/useToast";
import { fetchWithAuth } from "@/lib/apiClient";
import { PageLoader } from "@/components/PageLoader";
import { TechBackground } from "@/components/TechBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Bug,
  Loader2,
  CheckCircle2,
} from "lucide-react";

type MineReport = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

export function ReportBug() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { navigateWithLoader } = useNavLoader();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.href : ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<MineReport[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const loadMine = async () => {
    setLoadingMine(true);

    try {
      const res = await fetchWithAuth("/bug-reports/mine");
      const data = await res.json();

      if (data?.success && Array.isArray(data.data)) {
        setMine(data.data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMine();
    }
  }, [user]);

  const submit = async () => {
    if (title.trim().length < 5) {
      showToast(
        "Le titre doit contenir au moins 5 caractères",
        "error"
      );
      return;
    }

    if (description.trim().length < 20) {
      showToast(
        "Veuillez décrire le bug plus en détail (20 caractères minimum)",
        "error"
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetchWithAuth("/bug-reports", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          pageUrl: pageUrl.trim().slice(0, 500),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        showToast(
          data?.error || "Échec de l'envoi",
          "error"
        );
        return;
      }

      showToast(
        data?.data?.message ||
          "Signalement envoyé. Merci de contribuer à améliorer Geston Hosting.",
        "success"
      );

      setTitle("");
      setDescription("");

      await loadMine();
    } catch {
      showToast(
        "Échec de l'envoi du signalement",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return <PageLoader />;
  }

  const statusColor = (status: string) => {
    if (status === "rejected" || status === "closed") {
      return "text-red-400";
    }

    if (status === "reviewing") {
      return "text-amber-400";
    }

    if (status === "resolved") {
      return "text-green-400";
    }

    return "text-muted-foreground";
  };

  const statusLabel: Record<string, string> = {
    resolved: "Résolu",
    rejected: "Rejeté",
    closed: "Fermé",
    reviewing: "En cours d'examen",
    open: "Ouvert",
    pending: "En attente",
  };

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex items-center h-14 gap-3">
            <button
              type="button"
              onClick={() =>
                navigateWithLoader("/dashboard")
              }
              className="p-2 -ml-2 rounded-lg hover:bg-muted"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h1 className="font-bold text-base flex items-center gap-2">
              <Bug className="w-4 h-4 text-green-400" />
              Signaler un bug
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5 relative z-[1]">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />

            <div>
              <p className="text-sm font-semibold text-green-400">
                Aidez-nous à améliorer Geston Hosting
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Vous avez trouvé un problème ? Décrivez-le avec
                suffisamment de détails pour permettre à notre équipe
                de le reproduire et de le corriger.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div>
            <label
              htmlFor="bug-title"
              className="text-xs text-muted-foreground"
            >
              Titre
            </label>

            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Le bouton Déployer reste bloqué sur mobile"
              maxLength={120}
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="bug-description"
              className="text-xs text-muted-foreground"
            >
              Que s'est-il passé ?
            </label>

            <textarea
              id="bug-description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Étapes pour reproduire, comportement attendu et comportement observé..."
              maxLength={4000}
              rows={5}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="bug-url"
              className="text-xs text-muted-foreground"
            >
              URL de la page (facultatif)
            </label>

            <Input
              id="bug-url"
              value={pageUrl}
              onChange={(e) =>
                setPageUrl(e.target.value)
              }
              placeholder="https://..."
              maxLength={500}
              className="mt-1"
            />
          </div>

          <Button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                Envoyer le signalement
              </>
            )}
          </Button>
        </div>

        <div className="rounded-xl bg-card border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold">
              Vos signalements
            </h2>
          </div>

          {loadingMine ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : mine.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Aucun signalement pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {mine.map((report) => (
                <li
                  key={report.id}
                  className="p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {report.title}
                    </p>

                    <p
                      className={`text-xs mt-0.5 capitalize ${statusColor(
                        report.status
                      )}`}
                    >
                      {statusLabel[report.status] ||
                        report.status}
                    </p>
                  </div>

                  {report.status === "resolved" && (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
