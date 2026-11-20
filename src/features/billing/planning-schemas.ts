import { z } from "zod";

const cents = z.number().int().min(0).max(1_000_000_000);
const percent = z.number().min(0).max(100);
const rowId = z.string().trim().min(1).max(36).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);

export const fixedCostSchema = z.object({
  label: z.string().trim().min(1).max(48),
  amountCents: cents
});

export const financeScenarioSchema = z.object({
  id: rowId.optional(),
  name: z.string().trim().min(2).max(64),
  fixedCosts: z.array(fixedCostSchema).max(20),
  variableCostCents: cents,
  paymentFeePercent: percent,
  proLaboreCents: cents,
  reserveCents: cents,
  defaultRatePercent: percent
});

export type FinanceScenarioInput = z.infer<typeof financeScenarioSchema>;

export const financeScenarioIdSchema = z.object({ id: rowId });

export const adjustmentItemInputSchema = z.object({
  enrollmentId: rowId,
  newFeeCents: z.number().int().min(1).max(100_000_000),
  excluded: z.boolean()
});

export const adjustmentInputSchema = z
  .object({
    mode: z.enum(["percent", "fixed", "rounded"]),
    percent: z.number().min(0).max(1000).optional(),
    referenceIndexLabel: z.string().trim().max(128).optional(),
    effectiveFrom: z.string().date(),
    messageTemplate: z.string().trim().min(20).max(4000),
    items: z.array(adjustmentItemInputSchema).min(1).max(1000)
  })
  .superRefine((value, ctx) => {
    const ids = value.items.map((item) => item.enrollmentId);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["items"], message: "duplicate_enrollment" });
    if (value.items.every((item) => item.excluded)) ctx.addIssue({ code: "custom", path: ["items"], message: "no_included_items" });
  });

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;

export const adjustmentIdSchema = z.object({ adjustmentId: rowId });

export const markNotifiedSchema = z.object({
  adjustmentId: rowId,
  enrollmentId: rowId,
  notified: z.boolean()
});
