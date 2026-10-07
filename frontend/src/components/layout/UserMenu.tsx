import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import { initialsOf } from '../../lib/format'
import { IconArrowOut, IconChevronDown, IconGear, IconGithub } from '../ui/Icons'
import { useMenu } from './useMenu'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { ref, open, setOpen, close } = useMenu()

  if (!user) return null

  const initials = initialsOf(user.displayName, user.email)
  const displayName = user.displayName?.trim() || user.email.split('@')[0]

  async function handleSignOut() {
    close()
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={ref} className="ml-auto relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full border border-line bg-canvas hover:bg-subtle"
      >
        <span className="w-5 h-5 rounded-full bg-inset text-[9px] font-semibold text-muted flex items-center justify-center">
          {initials}
        </span>
        <span className="text-xs text-fg font-medium hidden sm:inline">{displayName}</span>
        <IconChevronDown className="w-3 h-3 text-faint" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-56 border border-line rounded-md bg-canvas shadow-lg overflow-hidden z-10 text-xs"
        >
          <div className="px-3 py-2.5 border-b border-line">
            <div className="text-xs font-semibold text-fg">{displayName}</div>
            <div className="text-[11px] text-muted">{user.email}</div>
          </div>

          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              disabled
              className="w-full px-2 py-1.5 rounded flex items-center gap-2 text-fg cursor-not-allowed"
            >
              <IconGear className="w-3.5 h-3.5 text-faint" />
              Settings
              <span className="ml-auto text-[10px] text-faint">deferred</span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled
              className="w-full px-2 py-1.5 rounded flex items-center gap-2 text-fg cursor-not-allowed"
            >
              <IconGithub className="w-3.5 h-3.5 text-faint" />
              Disconnect GitHub
              <span className="ml-auto text-[10px] text-faint">phase 11</span>
            </button>
          </div>

          <div className="border-t border-line p-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="w-full px-2 py-1.5 rounded hover:bg-badbg text-bad flex items-center gap-2 font-medium"
            >
              <IconArrowOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}