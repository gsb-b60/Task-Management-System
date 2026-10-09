import { z } from "zod";

// Validation happens at the HTTP boundary and nowhere else (Phase 01 §7).
export const registerBody = z.strictObject({
  email: z
    .email({ message: "Must be a valid email address." })
    .max(254, "Email must be 254 characters or fewer."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer."),
  displayName: z.string().trim().max(100, "Name must be 100 characters or fewer.").nullish(),
});

export const loginBody = z.strictObject({
  email: z.email({ message: "Must be a valid email address." }),
  password: z.string().min(1, "Password is required."),
});

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
