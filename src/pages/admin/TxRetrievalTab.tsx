import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Geston Hosting — Free Mode
 *
 * L'ancien système de récupération/remboursement de Coins
 * n'est plus utilisé.
 *
 * Tous les services étant gratuits, cette section ne doit :
 * - calculer aucun remboursement ;
 * - créditer aucun Coin ;
 * - créer aucune transaction ;
 * - envoyer aucun e-mail de remboursement.
 *
 * Le composant est conservé pour compatibilité avec l'interface
 * d'administration existante.
 */
export function TxRetrievalTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">
                Mode gratuit activé
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                La récupération de Coins n'est plus nécessaire.
                Tous les services de Geston Hosting sont désormais
                gratuits pour les utilisateurs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-base">
                Ancien système désactivé
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Les anciens crédits, remboursements et opérations
                financières ne sont plus exécutés. Cette page ne
                modifie aucun solde utilisateur et ne crée aucune
                transaction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
