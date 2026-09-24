import { z } from "zod";
import { isValidCpf, normalizeCpf } from "@/lib/auth/auth-utils";

const optionalText = z.string().trim().max(2000).optional().transform((value) => value || undefined);
const requiredText = (min = 2, max = 255) => z.string().trim().min(min).max(max);

export const studentDraftSchema = z.object({
  fullName: requiredText(3, 128),
  cpf: z.string().transform(normalizeCpf).refine((value) => !value || isValidCpf(value), "CPF inválido").optional(),
  birthDate: z.string().optional(),
  whatsapp: z.string().trim().max(24).optional(),
  address: optionalText,
  emergencyContactName: z.string().trim().max(128).optional(),
  emergencyContactRelationship: z.string().trim().max(64).optional(),
  emergencyContactPhone: z.string().trim().max(24).optional(),
  startedAtTkd: z.string().optional(),
  currentBelt: z.string().trim().max(64).optional(),
  trainingClass: z.string().trim().max(64).optional(),
  gub: z.coerce.number().int().min(1).max(10).optional(),
  healthCondition: z.enum(["yes", "no"]).optional(),
  healthDetails: optionalText,
  medications: optionalText,
  allergies: optionalText,
  injuries: optionalText,
  guardianContact: z.string().trim().max(160).optional(),
  requestedDueDay: z.coerce.number().int().min(1).max(28).optional()
});

export const studentSubmissionSchema = studentDraftSchema.extend({
  cpf: z.string().transform(normalizeCpf).refine(isValidCpf, "CPF inválido"),
  birthDate: requiredText(10, 10),
  whatsapp: requiredText(8, 24),
  address: requiredText(5, 2000),
  emergencyContactName: requiredText(3, 128),
  emergencyContactRelationship: requiredText(2, 64),
  emergencyContactPhone: requiredText(8, 24),
  startedAtTkd: requiredText(10, 10),
  currentBelt: requiredText(3, 64),
  gub: z.coerce.number().int().min(1).max(10),
  healthCondition: z.enum(["yes", "no"]),
  requestedDueDay: z.coerce.number().int().min(1).max(28)
});

export const financialReviewSchema = z.object({
  monthlyFeeCents: z.coerce.number().int().min(0),
  discountCents: z.coerce.number().int().min(0).default(0),
  approvedDueDay: z.coerce.number().int().min(1).max(28),
  firstDueDate: requiredText(10, 10),
  contractStart: requiredText(10, 10),
  contractEnd: requiredText(10, 10)
}).superRefine((value, context) => {
  if (value.discountCents > value.monthlyFeeCents) context.addIssue({ code: "custom", path: ["discountCents"], message: "Desconto maior que a mensalidade" });
  if (value.contractEnd < value.contractStart) context.addIssue({ code: "custom", path: ["contractEnd"], message: "Término anterior ao início" });
});

export type StudentDraftInput = z.infer<typeof studentDraftSchema>;
