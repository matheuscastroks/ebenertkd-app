import { z } from "zod";
import { WEEKDAYS } from "@/features/classes/types";

export const trainingClassSchema = z.object({
  name: z.string().trim().min(3).max(96),
  weekdays: z.array(z.enum(WEEKDAYS)).min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  capacity: z.coerce.number().int().min(1).max(500).optional()
}).refine((value) => value.endTime > value.startTime, { path: ["endTime"], message: "O término deve ser posterior ao início" });
