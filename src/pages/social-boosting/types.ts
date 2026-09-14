export interface BoostService {
  id: number;
  name: string;
  category: string;
  pricePer1000: number;
  currency: string;
  min: number;
  max: number;
  platformId: string;
  serviceType: string;
  isRegionVariant: boolean;
}

export interface BoostOrderRow {
  _id: string;
  serviceName: string;
  category: string;
  link: string;
  quantity: number;
  costTx: number;
  status: string;
  createdAt: string;
}

export type PayStage =
  | "closed"
  | "choose"
  | "mpesa"
  | "drc"
  | "cameroon"
  | "tanzania"
  | "card"
  | "pending"
  | "success"
  | "failed";

export interface PreparedBoostOrder {
  boostOrderId: string;
  costKes: number;
  serviceName: string;
}
