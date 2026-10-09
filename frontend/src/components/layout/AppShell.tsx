import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/**
 * Every protected screen renders inside this shell. The sidebar collapses at
 * 1024px, below which the nav moves into the header.
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-5">
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-right" theme="light" toastOptions={{ duration: 4000 }} />
    </div>
  )
}