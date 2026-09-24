import { z } from "zod";

export const contractTemplateSchema = z.object({
  name: z.string().trim().min(3).max(128),
  content: z.string().trim().min(100).max(50000)
});

export const signatureInputSchema = z.object({
  contractId: z.string().min(1).max(36),
  accepted: z.literal("on"),
  readConfirmed: z.literal("true"),
  signatureDataUrl: z.string().max(300000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
});

export const cancellationRequestSchema = z.object({
  contractId: z.string().min(1).max(36),
  targetExitMonth: z.string().regex(/^\d{4}-\d{2}$/),
  reason: z.string().trim().max(2000).optional()
});

export const cancellationDecisionSchema = z.object({
  requestId: z.string().min(1).max(36),
  decision: z.enum(["approved", "rejected"]),
  feeCents: z.coerce.number().int().min(0),
  notes: z.string().trim().min(3).max(2000)
});

export const renewalSchema = z.object({
  studentId: z.string().min(1).max(36),
  endsAt: z.string().date()
});
