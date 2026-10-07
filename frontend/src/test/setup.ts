import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { setUnauthorizedHandler } from '../api/client'
import { resetDb, setMockLatency, setScenario } from '../api/mock'

/**
 * Zero latency keeps suites fast; the delay itself is the mock layer's
 * behaviour, not something these tests need to wait through. `resetDb` per
 * test stops one spec's registrations or rate-limit attempts leaking into the
 * next.
 */
beforeEach(() => {
  setMockLatency(0)
  setScenario(null)
  resetDb()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  setUnauthorizedHandler(null)
})