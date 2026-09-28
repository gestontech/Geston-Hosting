/**
 * Geston Hosting — Free Mode
 *
 * L'ancien système de récupération de Coins après incident
 * n'est plus utilisé.
 *
 * Tous les services étant gratuits, aucun remboursement financier
 * ou crédit de Coins ne doit être effectué.
 *
 * Le service est conservé avec la même API publique afin d'éviter
 * de casser les anciennes routes d'administration.
 */

export type OutageRefundLine = {
  kind: "bot";
  id: string;
  userId: string;
  email: string;
  label: string;
  cost: number;
  refundTx: number;
  remainingDays: number;
  totalDays: number;
  expiresAt: string | null;
};

export type OutageRefundResult = {
  dryRun: boolean;
  botsConsidered: number;
  panelsConsidered: number;
  lines: OutageRefundLine[];
  totalTx: number;
  usersAffected: number;
  refunded: number;
  emailed: number;
  errors: string[];
};

/**
 * Aperçu conservé pour compatibilité.
 *
 * En mode gratuit, aucun remboursement n'est calculé.
 */
export async function previewOutageRefunds(
  _includePanels = false
): Promise<OutageRefundResult> {
  return emptyResult(true);
}

/**
 * Exécution conservée pour compatibilité.
 *
 * En mode gratuit, cette fonction ne crédite aucun compte,
 * ne crée aucune transaction et n'envoie aucun remboursement.
 */
export async function executeOutageRefunds(
  _includePanels = false
): Promise<OutageRefundResult> {
  return emptyResult(false);
}

function emptyResult(
  dryRun: boolean
): OutageRefundResult {
  return {
    dryRun,

    botsConsidered: 0,
    panelsConsidered: 0,

    lines: [],

    totalTx: 0,
    usersAffected: 0,

    refunded: 0,
    emailed: 0,

    errors: [],
  };
}
