export interface Package {
  _id: string;
  name: string;
  txAmount: number;
  bonusTx: number;
  ksPrice: number;
  isBestDeal: boolean;
  order: number;
  active: boolean;
}

export interface DRCPackage {
  id: string;
  name: string;
  txAmount: number;
  bonusTx: number;
  usdPrice: number;
  isBestDeal: boolean;
}

export const DRC_PACKAGES: DRCPackage[] = [
  { id: "cd_starter", name: "Starter", txAmount: 10, bonusTx: 0, usdPrice: 2, isBestDeal: false },
  { id: "cd_basic", name: "Basic", txAmount: 20, bonusTx: 0, usdPrice: 4, isBestDeal: false },
  { id: "cd_standard", name: "Standard", txAmount: 30, bonusTx: 0, usdPrice: 6, isBestDeal: false },
  { id: "cd_pro", name: "Pro", txAmount: 50, bonusTx: 5, usdPrice: 10, isBestDeal: true },
  { id: "cd_elite", name: "Elite", txAmount: 100, bonusTx: 10, usdPrice: 20, isBestDeal: false },
  { id: "cd_ultimate", name: "Ultimate", txAmount: 200, bonusTx: 20, usdPrice: 40, isBestDeal: false },
];

export const USD_PER_TX = 0.2;

export const TX_RATE_KES = 5;

export const TX_MIN = 3;
