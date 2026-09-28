import { BoostOrder } from "../models/BoostOrder.js";
import { User } from "../models/User.js";
import { placeProviderOrder } from "./boostProvider.js";
import { normalizeBoostStatus } from "../utils/boostStatus.js";
import {
  syncBoostCatalogue,
  listCachedServices,
} from "./boostCatalogSync.js";
import { createNotification } from "./notifications.js";
import { notifyOwner } from "./notify.js";

async function resolveServiceIds(order: {
  providerServiceId: number;
  providerCode: string;
  serviceName: string;
}): Promise<{ service_id: number; provider: string }> {
  let serviceId = order.providerServiceId;
  let provider = order.providerCode;

  try {
    const cached = await listCachedServices();

    const byId = cached.find(
      (service) => service.providerId === serviceId
    );

    if (byId) {
      return {
        service_id: byId.providerId,
        provider: byId.provider || provider,
      };
    }

    const name = (order.serviceName || "")
      .toLowerCase()
      .trim();

    if (name) {
      const byName =
        cached.find(
          (service) =>
            service.name.toLowerCase().trim() === name
        ) ||
        cached.find(
          (service) =>
            service.name
              .toLowerCase()
              .includes(name) ||
            name.includes(
              service.name.toLowerCase()
            )
        );

      if (byName) {
        return {
          service_id: byName.providerId,
          provider:
            byName.provider || provider,
        };
      }
    }
  } catch {
    // Le catalogue local peut être indisponible.
  }

  return {
    service_id: serviceId,
    provider,
  };
}

/**
 * Traite une commande de boost gratuite.
 *
 * Il n'existe aucun paiement dans ce flux.
 */
export async function fulfillBoostOrder(
  boostOrderId: string
): Promise<void> {
  const order = await BoostOrder.findById(
    boostOrderId
  );

  if (!order) return;

  if (
    order.status === "completed" ||
    order.status === "cancelled"
  ) {
    return;
  }

  try {
    let ids = await resolveServiceIds(order);
    let result;

    try {
      result = await placeProviderOrder({
        service_id: ids.service_id,
        provider: ids.provider,
        link: order.link,
        quantity: order.quantity,
      });
    } catch (firstError) {
      const message =
        firstError instanceof Error
          ? firstError.message
          : "";

      if (
        /not found|not priced|invalid service|unknown service/i.test(
          message
        )
      ) {
        await syncBoostCatalogue().catch(
          () => {}
        );

        ids = await resolveServiceIds(order);

        order.providerServiceId =
          ids.service_id;

        order.providerCode =
          ids.provider;

        result = await placeProviderOrder({
          service_id: ids.service_id,
          provider: ids.provider,
          link: order.link,
          quantity: order.quantity,
        });
      } else {
        throw firstError;
      }
    }

    order.providerOrderId =
      String(result.order_id);

    order.providerServiceId =
      ids.service_id;

    order.providerCode =
      ids.provider;

    order.status = normalizeBoostStatus(
      result.status,
      "pending"
    );

    order.updatedAt = new Date();

    await order.save();

    await createNotification(
      order.userId,
      "boost",
      "Commande de boost créée",
      `Votre commande de ${order.quantity} ${order.serviceName} est maintenant ${order.status}.`
    );

    const owner = await User.findById(
      order.userId
    )
      .select("email username")
      .lean()
      .catch(() => null);

    notifyOwner(
      `📈 *Boost gratuit créé*\n\n` +
        `Commande: \`${order._id}\`\n` +
        `Utilisateur: \`${owner?.email || order.userId}\` (@${owner?.username || "n/a"})\n` +
        `Service: \`${order.serviceName}\`\n` +
        `Catégorie: ${order.category || "n/a"}\n` +
        `Quantité: ${order.quantity}\n` +
        `Lien: ${order.link}\n` +
        `Provider order: \`${order.providerOrderId || "n/a"}\`\n` +
        `Statut: ${order.status}`
    ).catch(() => {});
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Order failed";

    order.status = "pending";
    order.updatedAt = new Date();

    await order.save();

    await createNotification(
      order.userId,
      "boost",
      "Commande de boost en attente",
      `Votre commande gratuite de ${order.quantity} ${order.serviceName} est en attente de traitement.`
    );

    const owner = await User.findById(
      order.userId
    )
      .select("email username")
      .lean()
      .catch(() => null);

    notifyOwner(
      `⚠️ *Boost gratuit à traiter manuellement*\n\n` +
        `Le fournisseur n'a pas pu créer automatiquement la commande.\n\n` +
        `Commande: \`${order._id}\`\n` +
        `Utilisateur: \`${owner?.email || order.userId}\` (@${owner?.username || "n/a"})\n` +
        `Service: \`${order.serviceName}\`\n` +
        `Quantité: ${order.quantity}\n` +
        `Lien: ${order.link}\n` +
        `Raison: ${message}\n` +
        `Statut: *pending*`
    ).catch(() => {});
  }
}
