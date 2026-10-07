import { describe, expect, it } from 'vitest'
import {
  displayNameSchema,
  emailSchema,
  loginSchema,
  passwordStrength,
  registerPasswordSchema,
  registerSchema,
} from './schemas'

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? undefined : result.error?.issues[0]?.message
}

describe('emailSchema', () => {
  it('accepts an ordinary address', () => {
    expect(emailSchema.safeParse('ada@example.com').success).toBe(true)
  })

  it('rejects a malformed address with a readable message', () => {
    expect(firstIssue(emailSchema.safeParse('not-an-email'))).toBe('Enter a valid email address.')
  })

  it('rejects an empty value with its own message', () => {
    expect(firstIssue(emailSchema.safeParse('   '))).toBe('Enter your email address.')
  })

  it('rejects an address with no TLD', () => {
    expect(emailSchema.safeParse('ada@example').success).toBe(false)
  })
})

describe('displayNameSchema', () => {
  it('mirrors the 2 to 60 character rule', () => {
    expect(displayNameSchema.safeParse('A').success).toBe(false)
    expect(displayNameSchema.safeParse('Ada').success).toBe(true)
    expect(displayNameSchema.safeParse('a'.repeat(61)).success).toBe(false)
  })
})

describe('registerPasswordSchema', () => {
  it('enforces the 8 character minimum', () => {
    expect(firstIssue(registerPasswordSchema.safeParse('short'))).toBe('Password must be at least 8 characters.')
    expect(registerPasswordSchema.safeParse('longenough').success).toBe(true)
  })
})

describe('schemas', () => {
  it('rejects a register form with nothing filled in', () => {
    const result = registerSchema.safeParse({ displayName: '', email: '', password: '' })

    expect(result.success).toBe(false)
    expect(result.success === false && result.error.issues.length).toBeGreaterThanOrEqual(3)
    expect(result.success === false && result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['displayName', 'email', 'password']),
    )
  })

  it('accepts a complete register form', () => {
    expect(
      registerSchema.safeParse({ displayName: 'Ada', email: 'ada@example.com', password: 'sup3rsecret' }).success,
    ).toBe(true)
  })

  it('accepts a login form with any non-empty password, since the server owns the rule', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success).toBe(true)
  })
})

describe('passwordStrength', () => {
  it('says nothing for an empty field', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: '' })
  })

  it('rates a short password weak', () => {
    expect(passwordStrength('abc').score).toBe(1)
  })

  it('rates a mixed long password strong', () => {
    const result = passwordStrength('Sup3rsecret!')

    expect(result.score).toBe(4)
    expect(result.label).toContain('Strong')
  })

  it('rates lowercase-only long passwords below strong', () => {
    expect(passwordStrength('alllowercaseletters').score).toBeLessThan(4)
  })
})