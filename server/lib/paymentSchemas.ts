import { z } from "zod";

export const initiateSchema = z.object({
  packageId: z.string(),
});

export const initiateNgSchema = z.object({
  ngnAmount: z.number().min(100),
  txAmount: z.number().min(1),
  bonusTx: z.number().min(0).default(0),
  packageName: z.string().optional(),
});

export const chargeSchema = z.object({
  packageId: z.string(),
  phone: z.string().min(9),
  provider: z.enum(["mpesa", "airtel"]),
});

export const chargeCustomSchema = z.object({
  txAmount: z.number().min(3),
  ksAmount: z.number().min(15).optional(),
  phone: z.string().min(9),
  provider: z.enum(["mpesa", "airtel"]),
});

export const verifySchema = z.object({
  reference: z.string(),
});

export const prepareCardSchema = z.object({
  packageId: z.string(),
});

export const initiateCustomSchema = z.object({
  txAmount: z.number().min(3),
  ksAmount: z.number().min(15).optional(),
});
