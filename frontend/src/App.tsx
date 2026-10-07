import { Navigate, createBrowserRouter } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicRoute } from './routes/PublicRoute'
import { GitHubCallbackPage } from './pages/auth/GitHubCallbackPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

/**
 * Exported as data rather than baked into a browser router so tests can mount
 * the same tree with `createMemoryRouter`.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  {
    element: <PublicRoute />,
    children: [
      { path: '/register', element: <RegisterPage /> },
      { path: '/login', element: <LoginPage /> },
    ],
  },

  {
    // Outside PublicRoute on purpose: this route *is* the session check, so
    // gating it behind the splash would replace its own waiting state with
    // "GET /api/auth/me" and a spinner.
    path: '/auth/github/callback',
    element: <GitHubCallbackPage />,
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/tasks', element: <PlaceholderPage /> },
          { path: '/tasks/:id', element: <PlaceholderPage /> },
          { path: '/board', element: <PlaceholderPage /> },
          { path: '/roadmap', element: <PlaceholderPage /> },
          { path: '/projects', element: <PlaceholderPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)