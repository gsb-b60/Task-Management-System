import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { setUnauthorizedHandler } from '../api/client'

/**
 * Tests run against the real API. The backend must be running at
 * http://localhost:5004 for these tests to pass.
 */
beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  setUnauthorizedHandler(null)
})