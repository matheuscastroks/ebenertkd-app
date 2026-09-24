import { z } from "zod";
import { normalizeEmail, normalizeUsername } from "@/lib/auth/auth-utils";

const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(128);

export const adultLoginSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  password
});

export const minorLoginSchema = z.object({
  username: z.string().transform(normalizeUsername).pipe(z.string().min(3).max(32)),
  password
});

export const adultRegistrationSchema = z.object({
  fullName: z.string().trim().min(3).max(128),
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  password,
  accountType: z.enum(["adult_student", "guardian"])
});

export const minorRegistrationSchema = z.object({
  fullName: z.string().trim().min(3).max(128),
  username: z
    .string()
    .transform(normalizeUsername)
    .pipe(z.string().min(3).max(32).regex(/^[a-z0-9][a-z0-9._-]+$/)),
  password
});

export const recoverySchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email())
});

export const recoveryConfirmationSchema = z.object({
  userId: z.string().min(1),
  secret: z.string().min(1),
  password
});
