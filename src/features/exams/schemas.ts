import { z } from "zod";
import { isRankKey } from "@/features/academy/ranks";

export const examEventSchema = z.object({
  name: z.string().trim().min(3).max(128),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().trim().max(160).optional(),
  defaultFeeCents: z.coerce.number().int().min(0)
});

export const examParticipantSchema = z.object({
  eventId: z.string().min(1).max(36),
  studentId: z.string().min(1).max(36),
  targetRankKey: z.string().refine(isRankKey, "Graduação inválida"),
  /** Sem valor: usa a taxa da graduação alvo ou, na falta dela, a taxa padrão da banca. */
  feeCents: z.coerce.number().int().min(0).optional()
});

export const examResultSchema = z.object({
  participantId: z.string().min(1).max(36),
  result: z.enum(["approved", "failed", "absent"]),
  notes: z.string().trim().max(2000).optional()
});
