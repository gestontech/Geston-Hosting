import { ArrowLeft, Gift, CheckCircle2 } from "lucide-react";
import { useNavLoader } from "@/App";
import { TechBackground } from "@/components/TechBackground";

export default function TopUp() {
  const { navigateWithLoader } = useNavLoader();

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => navigateWithLoader("/dashboard")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Services
            </h1>

            <p className="text-sm text-muted-foreground">
              Geston Hosting fonctionne sans achat ni paiement.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-teal-400" />
            </div>

            <div>
              <h2 className="font-bold text-lg">
                Tout est gratuit
              </h2>

              <p className="text-sm text-muted-foreground">
                Aucun rechargement n'est nécessaire.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />

              <div>
                <p className="font-medium">
                  Déploiement des bots
                </p>

                <p className="text-sm text-muted-foreground">
                  Les services de déploiement disponibles sont
                  accessibles gratuitement.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />

              <div>
                <p className="font-medium">
                  Panneaux
                </p>

                <p className="text-sm text-muted-foreground">
                  Les plans disponibles ne nécessitent aucun achat.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />

              <div>
                <p className="font-medium">
                  Boost réseaux sociaux
                </p>

                <p className="text-sm text-muted-foreground">
                  Les commandes de boost ne nécessitent aucun paiement.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateWithLoader("/dashboard")}
            className="w-full mt-6 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
