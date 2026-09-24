import { z } from "zod";
import { WEEKDAYS } from "@/features/classes/types";

export const trainingClassSchema = z.object({
  name: z.string().trim().min(3).max(96),
  weekdays: z.array(z.enum(WEEKDAYS)).min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: z.string().trim().max(160).optional(),
  capacity: z.coerce.number().int().min(1).max(500).optional()
}).refine((value) => value.endTime > value.startTime, { path: ["endTime"], message: "O término deve ser posterior ao início" });

export const lessonSchema = z.object({
  trainingClassId: z.string().min(1).max(36),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  lessonType: z.enum(["regular", "makeup"]).default("regular")
}).refine((value) => value.endTime > value.startTime, { path: ["endTime"], message: "O término deve ser posterior ao início" });

export const attendanceBatchSchema = z.object({
  lessonId: z.string().min(1).max(36),
  correctionReason: z.string().trim().min(3).max(1000).optional(),
  records: z.array(z.object({
    classEnrollmentId: z.string().min(1).max(36),
    status: z.enum(["present", "absent", "excused"])
  })).min(1)
});
