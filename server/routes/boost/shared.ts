import { BoostOrder } from "../../models/BoostOrder.js";

export function getParam(
  val: string | string[],
): string {
  return Array.isArray(val) ? val[0] : val;
}

/**
 * Charge une commande appartenant à l'utilisateur
 * et encore en attente de paiement.
 *
 * Cette fonction est conservée pour les anciennes routes
 * de paiement afin de ne pas casser les commandes historiques.
 */
export async function loadAwaitingOrder(
  userId: string,
  boostOrderId: string,
) {
  return BoostOrder.findOne({
    _id: boostOrderId,
    userId,
    status: "awaiting_payment",
  });
}
