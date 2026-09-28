import { Router } from "express";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

/**
 * Historique des opérations de la plateforme.
 *
 * Geston Hosting fonctionne en mode gratuit :
 * - aucune recharge de Coins ;
 * - aucun montant de paiement ;
 * - aucune donnée Paystack ;
 * - aucune opération financière n'est créée par les services gratuits.
 *
 * Les anciens champs financiers du modèle Transaction sont volontairement
 * ignorés ici afin de conserver la compatibilité avec les anciennes données.
 */
router.get(
  "/transactions",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const txs = await Transaction.find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      const users = await User.find({})
        .select("email username")
        .lean();

      const userMap: Record<
        string,
        {
          email: string;
          username: string;
        }
      > = {};

      for (const user of users) {
        userMap[user._id.toString()] = {
          email: user.email,
          username: user.username || "",
        };
      }

      res.json(
        txs.map((transaction) => {
          const userId = transaction.userId?.toString() || "";
          const user = userMap[userId];

          return {
            _id: transaction._id,
            type: transaction.type,
            status: transaction.status,

            // Mode gratuit : aucune valeur financière n'est exposée.
            txAmount: 0,
            ksAmount: 0,
            localAmount: 0,

            // Compatibilité frontend/API.
            localCurrency: "FREE",
            paystackRef: null,
            paystackCountry: null,

            ownerEmail: user?.email || "unknown",
            ownerUsername: user?.username || "",
            userId,

            createdAt: transaction.createdAt,
          };
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Suppression d'une ancienne entrée d'historique.
 */
router.delete(
  "/transactions/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Transaction.findByIdAndDelete(req.params.id);

      res.json({
        ok: true,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Suppression groupée d'anciennes entrées.
 */
router.delete(
  "/transactions/bulk",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids } = req.body || {};

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          error: "No IDs provided",
        });
        return;
      }

      await Transaction.deleteMany({
        _id: {
          $in: ids,
        },
      });

      res.json({
        ok: true,
        deleted: ids.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Marque les anciennes opérations pending comme failed.
 *
 * Cette route est conservée pour compatibilité avec l'administration,
 * notamment avec d'anciennes données de paiement.
 */
router.post(
  "/transactions/resolve-stale",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000);

      const result = await Transaction.updateMany(
        {
          status: "pending",
          createdAt: {
            $lt: cutoff,
          },
        },
        {
          $set: {
            status: "failed",
          },
        },
      );

      res.json({
        ok: true,
        updated: result.modifiedCount,
        resolved: result.modifiedCount,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
