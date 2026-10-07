import { z } from 'zod'

/**
 * Client-side mirrors of the API's Zod rules, for feedback speed only — the
 * server remains the authority, and its `details[]` always wins on render.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .refine((value) => EMAIL_PATTERN.test(value), 'Enter a valid email address.')

export const passwordSchema = z.string().min(1, 'Enter your password.')

export const registerPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(60, 'Name must be at most 60 characters.')

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: registerPasswordSchema,
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

/**
 * Drives the strength meter on SC-01. Deliberately coarse — a real strength
 * estimate invites users to trust a score the server does not compute.
 */
export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: string
} {
  if (password.length === 0) return { score: 0, label: '' }

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^\w\s]/.test(password),
  ]
  const passed = checks.filter(Boolean).length

  if (password.length < 8) return { score: 1, label: 'Weak — 8+ characters' }
  if (passed <= 2) return { score: 1, label: 'Weak' }
  if (passed === 3) return { score: 2, label: 'Fair' }
  if (passed === 4) return { score: 3, label: 'Good' }
  return { score: 4, label: 'Strong · 8+ chars, upper, lower, digit' }
}