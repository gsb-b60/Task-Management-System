import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import { useDashboard } from '../../hooks/useDashboard'
import { BrandMark } from '../ui/BrandMark'
import { IconClose, IconMenu } from '../ui/Icons'
import { NAV_ITEMS, SIDEBAR_VIEWS } from './nav'
import { ProjectSwitcher } from './ProjectSwitcher'
import { UserMenu } from './UserMenu'
import { useMenu } from './useMenu'

const VIEW_ACTIVE = 'px-2.5 py-1.5 rounded-md text-xs font-semibold text-fg bg-inset'
const VIEW_INACTIVE = 'px-2.5 py-1.5 rounded-md text-xs text-muted hover:bg-subtle'

export function Header() {
  const { open: drawerOpen, setOpen: setDrawerOpen } = useMenu()
  const { data: dashboard } = useDashboard()

  return (
    <header className="bg-canvas border-b border-line">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Phone swaps the brand mark for the drawer trigger. */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
          className="md:hidden text-muted"
        >
          {drawerOpen ? <IconClose className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
        </button>

        <BrandMark size="lg" className="hidden md:inline-flex" />
        <NavLink to="/dashboard" className="text-base font-semibold text-fg">
          Task Stream
        </NavLink>

        <nav aria-label="Views" className="hidden md:flex items-center gap-1 ml-4">
          {SIDEBAR_VIEWS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => (isActive ? VIEW_ACTIVE : VIEW_INACTIVE)}
            >
              <span className="inline-flex items-center gap-1.5">
                {item.label}
                {item.to === '/tasks' && (
                  <span className="text-[10px] text-faint">{dashboard?.stats.total ?? 0}</span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <ProjectSwitcher />
        </div>
        <div className="hidden md:block lg:hidden">
          <ProjectSwitcher compact />
        </div>

        <UserMenu />
      </div>

      {drawerOpen && <MobileDrawer onNavigate={() => setDrawerOpen(false)} />}
    </header>
  )
}

function MobileDrawer({ onNavigate }: { onNavigate: () => void }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    onNavigate()
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="md:hidden border-t border-line bg-subtle px-3 py-2.5">
      <ProjectSwitcher compact />
      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              isActive
                ? 'px-2 py-1.5 rounded bg-inset text-fg font-semibold'
                : 'px-2 py-1.5 rounded text-muted'
            }
          >
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleSignOut}
          className="px-2 py-1.5 rounded text-bad font-medium text-left"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}