import { Package } from "../models/Package.js";
import { PanelPlan } from "../models/PanelPlan.js";
import { getDisabledServices, getDisabledPaymentMethods } from "./featureFlags.js";
import type { PromptContext } from "../prompts/shared.js";

const KSH_PER_TX = Number(process.env.KSH_PER_TX || "10");

export async function buildPromptContext(
  isOwner: boolean,
  isUnrestricted = false
): Promise<PromptContext> {
  const [packages, panelPlans, disabledServices, disabledPaymentMethods] = await Promise.all([
    Package.find({ active: true }).sort({ order: 1 }).lean().catch(() => []),
    PanelPlan.find({ active: true }).sort({ order: 1 }).lean().catch(() => []),
    getDisabledServices(),
    getDisabledPaymentMethods(),
  ]);
  return {
    isOwner,
    isUnrestricted: !!isUnrestricted,
    disabledServices,
    disabledPaymentMethods,
    pricing: {
      kshPerTx: KSH_PER_TX,
      packages: (packages as Array<{ name: string; ksPrice: number; txAmount: number; bonusTx?: number }>).map(
        (p) => ({
          name: p.name,
          ksh: p.ksPrice,
          tx: p.txAmount + (p.bonusTx || 0),
        })
      ),
      panelPlans: (panelPlans as Array<{ name: string; txCost: number }>).map((p) => ({
        name: p.name,
        ksh: p.txCost * KSH_PER_TX,
      })),
      boostNote:
        "Boosting prices vary by platform and service — check the live catalog on the site or type/say 'boost'.",
    },
  };
}
