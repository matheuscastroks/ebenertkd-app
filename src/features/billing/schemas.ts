import { z } from "zod";

export const billingSettingsSchema = z.object({ pixKey: z.string().trim().min(3).max(320), pixKeyType: z.enum(["cpf", "cnpj", "email", "phone", "random"]), beneficiaryName: z.string().trim().min(3).max(160), instructions: z.string().trim().max(2000).optional() });
export const proofDecisionSchema = z.object({ proofId: z.string().min(1).max(36), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(2000).optional(), paidAt: z.string().date().optional() }).superRefine((value, context) => { if (value.decision === "rejected" && !value.reason) context.addIssue({ code: "custom", path: ["reason"], message: "Motivo obrigatório" }); });
export const manualPaymentSchema = z.object({ chargeId: z.string().min(1).max(36), amountCents: z.coerce.number().int().min(1), paidAt: z.string().date(), notes: z.string().trim().min(3).max(2000) });
export const reversalSchema = z.object({ paymentId: z.string().min(1).max(36), reason: z.string().trim().min(3).max(2000) });
export const chargeAdjustmentSchema = z.object({ chargeId: z.string().min(1).max(36), amountCents: z.coerce.number().int().min(0), dueDate: z.string().date(), reason: z.string().trim().min(3).max(2000) });
