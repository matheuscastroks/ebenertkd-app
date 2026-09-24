import { z } from "zod";
import { BELT_OPTIONS, GUB_OPTIONS } from "@/features/students/options";

export const examEventSchema = z.object({
  name: z.string().trim().min(3).max(128),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().trim().max(160).optional(),
  defaultFeeCents: z.coerce.number().int().min(0)
});

export const examParticipantSchema = z.object({
  eventId: z.string().min(1).max(36),
  studentId: z.string().min(1).max(36),
  targetBelt: z.enum(BELT_OPTIONS),
  targetGub: z.coerce.number().refine((value) => GUB_OPTIONS.includes(value as (typeof GUB_OPTIONS)[number])),
  feeCents: z.coerce.number().int().min(0)
});

export const examResultSchema = z.object({
  participantId: z.string().min(1).max(36),
  result: z.enum(["approved", "failed", "absent"]),
  notes: z.string().trim().max(2000).optional()
});
