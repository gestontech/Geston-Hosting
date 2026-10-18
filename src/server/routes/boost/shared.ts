import { BoostOrder } from "../../models/BoostOrder.js";

export function getParam(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

export async function loadAwaitingOrder(userId: string, boostOrderId: string) {
  const order = await BoostOrder.findOne({ _id: boostOrderId, userId });
  if (!order || order.status !== "awaiting_payment") return null;
  return order;
}
