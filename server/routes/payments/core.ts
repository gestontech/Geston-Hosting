import { Router, type Request, type Response } from "express";
import { isOPTGatewayAvailable } from "../../services/optgateway.js";

const router = Router();

const DRC_PACKAGES = [
  {
    _id: "cd_starter",
    name: "Starter",
    txAmount: 10,
    bonusTx: 0,
    ksPrice: 2,
    usdPrice: 2,
    isBestDeal: false,
    order: 1,
    active: true,
    country: "drc",
    currency: "USD",
  },
  {
    _id: "cd_basic",
    name: "Basic",
    txAmount: 20,
    bonusTx: 0,
    ksPrice: 4,
    usdPrice: 4,
    isBestDeal: false,
    order: 2,
    active: true,
    country: "drc",
    currency: "USD",
  },
  {
    _id: "cd_standard",
    name: "Standard",
    txAmount: 30,
    bonusTx: 0,
    ksPrice: 6,
    usdPrice: 6,
    isBestDeal: false,
    order: 3,
    active: true,
    country: "drc",
    currency: "USD",
  },
  {
    _id: "cd_pro",
    name: "Pro",
    txAmount: 50,
    bonusTx: 5,
    ksPrice: 10,
    usdPrice: 10,
    isBestDeal: true,
    order: 4,
    active: true,
    country: "drc",
    currency: "USD",
  },
  {
    _id: "cd_elite",
    name: "Elite",
    txAmount: 100,
    bonusTx: 10,
    ksPrice: 20,
    usdPrice: 20,
    isBestDeal: false,
    order: 5,
    active: true,
    country: "drc",
    currency: "USD",
  },
  {
    _id: "cd_ultimate",
    name: "Ultimate",
    txAmount: 200,
    bonusTx: 20,
    ksPrice: 40,
    usdPrice: 40,
    isBestDeal: false,
    order: 6,
    active: true,
    country: "drc",
    currency: "USD",
  },
];

router.get("/config", async (_req, res) => {
  res.json({
    country: "drc",
    currency: "USD",
    drcAvailable: isOPTGatewayAvailable(),
    optGatewayAvailable: isOPTGatewayAvailable(),
    provider: "optgateway",
    paymentMethods: [
      "illicocash",
      "mobile_money",
      "card",
      "pepele",
    ],
  });
});

router.get(
  "/packages",
  async (_req: Request, res: Response) => {
    return res.json(DRC_PACKAGES);
  },
);

export default router;
