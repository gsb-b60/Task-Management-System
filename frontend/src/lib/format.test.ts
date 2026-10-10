import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { dueLabel, errorMessage, formatDateOnly, initialsOf } from './format'

describe('dueLabel', () => {
  it('says due today for zero', () => {
    expect(dueLabel(0)).toBe('due today')
  })

  it('counts up for a future date', () => {
    expect(dueLabel(1)).toBe('in 1 day')
    expect(dueLabel(9)).toBe('in 9 days')
  })

  it('counts down for a past date', () => {
    expect(dueLabel(-1)).toBe('overdue by 1 day')
    expect(dueLabel(-4)).toBe('overdue by 4 days')
  })

  it('says so when there is no due date', () => {
    expect(dueLabel(null)).toBe('No due date')
    expect(dueLabel(undefined)).toBe('No due date')
  })
})

describe('formatDateOnly', () => {
  it('renders a date-only value as a local date', () => {
    expect(formatDateOnly('2026-10-15')).toBe('15 Oct')
  })

  it('reduces a full ISO datetime to its calendar date', () => {
    expect(formatDateOnly('2026-10-23T00:00:00.000Z')).toBe('23 Oct')
  })

  it('passes unrecognised values through instead of blanking them', () => {
    expect(formatDateOnly('not-a-date')).toBe('not-a-date')
  })

  it('renders an em dash for a missing date', () => {
    expect(formatDateOnly(null)).toBe('—')
  })
})

describe('errorMessage', () => {
  it('uses the ApiError message', () => {
    expect(errorMessage(new ApiError('INTERNAL_ERROR', 'Could not load the dashboard.', 500))).toBe(
      'Could not load the dashboard.',
    )
  })

  it('falls back for anything unrecognised', () => {
    expect(errorMessage('nope', 'Fallback.')).toBe('Fallback.')
  })
})

describe('initialsOf', () => {
  it('uses both name parts', () => {
    expect(initialsOf('Ada Lovelace', 'ada@example.com')).toBe('AL')
  })

  it('falls back to the email when there is no name', () => {
    expect(initialsOf(null, 'ada.lovelace@example.com')).toBe('AL')
  })

  it('handles a single-word name', () => {
    expect(initialsOf('Ada', 'ada@example.com')).toBe('AD')
  })
})