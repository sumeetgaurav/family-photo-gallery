import { z } from "zod";

export const nameRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "That name is too long.")
    .regex(/^[\p{L}\p{M} '.-]+$/u, "Use only letters, spaces, and - ' . characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Enter your email.")
    .max(254, "That email is too long.")
    .email("Enter a valid email address."),
});

export const photoUploadSchema = z.object({
  caption: z.string().trim().max(280, "Caption is too long.").optional(),
  albumId: z.string().uuid().optional().or(z.literal("")),
});

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB
