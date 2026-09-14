import { getSetting, setSetting } from "../models/AppSettings.js";
import type { Request, Response, NextFunction } from "express";

export async function getDisabledServices(): Promise<string[]> {
  const val = await getSetting("disabledServices", []);
  return Array.isArray(val) ? (val as string[]) : [];
}

export async function getDisabledPaymentMethods(): Promise<string[]> {
  const val = await getSetting("disabledPaymentMethods", []);
  return Array.isArray(val) ? (val as string[]) : [];
}

export async function isServiceDisabled(key: string): Promise<boolean> {
  const disabled = await getDisabledServices();
  return disabled.includes(key);
}

export async function isPaymentMethodDisabled(key: string): Promise<boolean> {
  const disabled = await getDisabledPaymentMethods();
  return disabled.includes(key);
}

export async function setDisabledServices(keys: string[]): Promise<void> {
  await setSetting("disabledServices", keys);
}

export async function setDisabledPaymentMethods(keys: string[]): Promise<void> {
  await setSetting("disabledPaymentMethods", keys);
}

export function requirePaymentMethod(key: string) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    if (await isPaymentMethodDisabled(key)) {
      res.status(503).json({ error: "This payment method is currently unavailable", paymentMethodDisabled: key });
      return;
    }
    next();
  };
}
