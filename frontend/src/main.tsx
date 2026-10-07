import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { createQueryClient } from './lib/queryClient.ts'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider sits above the router: the guards read the session to
          decide which side of it a request lands on. */}
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)