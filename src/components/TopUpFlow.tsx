import { CheckCircle2, Gift, ShieldCheck } from "lucide-react";

export interface TopUpFlowProps {
  requiredTx?: number;
  onSuccess?: () => void;
  compact?: boolean;
}

export function TopUpFlow({
  onSuccess,
  compact = false,
}: TopUpFlowProps) {
  const handleContinue = () => {
    onSuccess?.();
  };

  if (compact) {
    return (
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-teal-400" />
          </div>

          <div>
            <p className="font-semibold text-sm">
              Geston Hosting est gratuit
            </p>

            <p className="text-xs text-muted-foreground">
              Aucun achat ou paiement n'est nécessaire.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Gift className="w-6 h-6 text-teal-400" />
          </div>

          <div>
            <h2 className="font-bold text-lg">
              Aucun rechargement nécessaire
            </h2>

            <p className="text-sm text-muted-foreground">
              Les services sont proposés gratuitement.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />

            <div>
              <p className="text-sm font-semibold">
                Aucun paiement
              </p>

              <p className="text-xs text-muted-foreground mt-0.5">
                Aucun moyen de paiement n'est demandé pour utiliser
                Geston Hosting.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />

            <div>
              <p className="text-sm font-semibold">
                Aucun achat de Coins
              </p>

              <p className="text-xs text-muted-foreground mt-0.5">
                Les services gratuits ne nécessitent aucun solde à
                acheter.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />

            <div>
              <p className="text-sm font-semibold">
                Mode gratuit activé
              </p>

              <p className="text-xs text-muted-foreground mt-0.5">
                Les fonctionnalités gratuites restent accessibles
                directement depuis leur page respective.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full mt-6 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
