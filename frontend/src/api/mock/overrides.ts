/**
 * Manual state switches so every state in the mockup is reachable by hand
 * while the backend is still missing: append `?scenario=error` (or `slow`,
 * or `empty`) to any URL.
 */

export type MockScenario = 'ok' | 'slow' | 'error' | 'empty'

const VALID: MockScenario[] = ['ok', 'slow', 'error', 'empty']

let override: MockScenario | null = null

/** Test hook — forces a scenario without touching the URL. */
export function setScenario(scenario: MockScenario | null): void {
  override = scenario
}

export function resolveScenario(): MockScenario {
  if (override) return override
  if (typeof window === 'undefined') return 'ok'
  const requested = new URLSearchParams(window.location.search).get('scenario')
  return VALID.includes(requested as MockScenario) ? (requested as MockScenario) : 'ok'
}

let latency = Number(import.meta.env.VITE_MOCK_LATENCY ?? 250)

/** Test hook — suites set this to 0 so they do not wait on timers. */
export function setMockLatency(ms: number): void {
  latency = ms
}

export function delay(ms = latency): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export const ERROR_LATENCY_MULTIPLIER = 6