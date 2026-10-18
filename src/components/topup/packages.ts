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

export interface CameroonPackage {
  id: string;
  name: string;
  txAmount: number;
  bonusTx: number;
  xafPrice: number;
  isBestDeal: boolean;
}

export interface NigeriaPackage {
  id: string;
  name: string;
  txAmount: number;
  bonusTx: number;
  ngnPrice: number;
  isBestDeal: boolean;
}

export interface TanzaniaPackage {
  id: string;
  name: string;
  txAmount: number;
  bonusTx: number;
  tzsPrice: number;
  isBestDeal: boolean;
}

export interface DRCPackage {
  id: string;
  name: string;
  txAmount: number;
  bonusTx: number;
  usdPrice: number;
  isBestDeal: boolean;
}

export const CAMEROON_PACKAGES: CameroonPackage[] = [
  { id: "cm_starter", name: "Starter", txAmount: 10, bonusTx: 0, xafPrice: 575, isBestDeal: false },
  { id: "cm_basic", name: "Basic", txAmount: 20, bonusTx: 0, xafPrice: 1150, isBestDeal: false },
  { id: "cm_standard", name: "Standard", txAmount: 30, bonusTx: 0, xafPrice: 1725, isBestDeal: false },
  { id: "cm_pro", name: "Pro", txAmount: 50, bonusTx: 5, xafPrice: 2875, isBestDeal: true },
  { id: "cm_elite", name: "Elite", txAmount: 100, bonusTx: 10, xafPrice: 5750, isBestDeal: false },
  { id: "cm_ultimate", name: "Ultimate", txAmount: 200, bonusTx: 20, xafPrice: 11500, isBestDeal: false },
];

export const TANZANIA_PACKAGES: TanzaniaPackage[] = [
  { id: "tz_starter", name: "Starter", txAmount: 10, bonusTx: 0, tzsPrice: 1500, isBestDeal: false },
  { id: "tz_basic", name: "Basic", txAmount: 20, bonusTx: 0, tzsPrice: 3000, isBestDeal: false },
  { id: "tz_standard", name: "Standard", txAmount: 30, bonusTx: 0, tzsPrice: 4500, isBestDeal: false },
  { id: "tz_pro", name: "Pro", txAmount: 50, bonusTx: 5, tzsPrice: 7500, isBestDeal: true },
  { id: "tz_elite", name: "Elite", txAmount: 100, bonusTx: 10, tzsPrice: 15000, isBestDeal: false },
  { id: "tz_ultimate", name: "Ultimate", txAmount: 200, bonusTx: 20, tzsPrice: 30000, isBestDeal: false },
];

export const DRC_PACKAGES: DRCPackage[] = [
  { id: "cd_starter", name: "Starter", txAmount: 10, bonusTx: 0, usdPrice: 2, isBestDeal: false },
  { id: "cd_basic", name: "Basic", txAmount: 20, bonusTx: 0, usdPrice: 4, isBestDeal: false },
  { id: "cd_standard", name: "Standard", txAmount: 30, bonusTx: 0, usdPrice: 6, isBestDeal: false },
  { id: "cd_pro", name: "Pro", txAmount: 50, bonusTx: 5, usdPrice: 10, isBestDeal: true },
  { id: "cd_elite", name: "Elite", txAmount: 100, bonusTx: 10, usdPrice: 20, isBestDeal: false },
  { id: "cd_ultimate", name: "Ultimate", txAmount: 200, bonusTx: 20, usdPrice: 40, isBestDeal: false },
];

export const NIGERIA_PACKAGES: NigeriaPackage[] = [
  { id: "ng_starter", name: "Starter", txAmount: 10, bonusTx: 0, ngnPrice: 1000, isBestDeal: false },
  { id: "ng_basic", name: "Basic", txAmount: 20, bonusTx: 0, ngnPrice: 2000, isBestDeal: false },
  { id: "ng_standard", name: "Standard", txAmount: 30, bonusTx: 0, ngnPrice: 3000, isBestDeal: false },
  { id: "ng_pro", name: "Pro", txAmount: 50, bonusTx: 5, ngnPrice: 5000, isBestDeal: true },
  { id: "ng_elite", name: "Elite", txAmount: 100, bonusTx: 10, ngnPrice: 10000, isBestDeal: false },
  { id: "ng_ultimate", name: "Ultimate", txAmount: 200, bonusTx: 20, ngnPrice: 20000, isBestDeal: false },
];

export const USD_PER_TX = 0.2;

export const TX_RATE_KES = 5;

export const TX_MIN = 3;
