import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement, ReactNode } from 'react'
import { routes } from '../App'
import type { AuthApi } from '../api'
import { mockAuthApi } from '../api/mock'
import { AuthProvider } from '../contexts/AuthContext'
import { createQueryClient } from '../lib/queryClient'

function Providers({ children, api }: { children: ReactNode; api: AuthApi }) {
  const queryClient = createQueryClient()
  // The production client retries 5xx twice; in tests that only adds latency
  // to assertions about the error state itself.
  queryClient.setDefaultOptions({ queries: { retry: false } })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider api={api}>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

/**
 * Mounts the real route table in memory, so guard behaviour is exercised
 * through the same wiring the browser gets.
 */
export function renderApp(
  initialEntries: string[] = ['/'],
  api: AuthApi = mockAuthApi,
): RenderResult & { router: ReturnType<typeof createMemoryRouter> } {
  const router = createMemoryRouter(routes, { initialEntries })

  const result = render(
    <Providers api={api}>
      <RouterProvider router={router} />
    </Providers>,
  )

  return { ...result, router }
}

/** For a single page that still needs router context and a session check. */
export function renderPage(
  ui: ReactElement,
  { api = mockAuthApi, route = '/' }: { api?: AuthApi; route?: string } = {},
): RenderResult & { router: ReturnType<typeof createMemoryRouter> } {
  const router = createMemoryRouter(
    [{ path: '*', element: ui } satisfies RouteObject],
    { initialEntries: [route] },
  )

  const result = render(
    <Providers api={api}>
      <RouterProvider router={router} />
    </Providers>,
  )

  return { ...result, router }
}