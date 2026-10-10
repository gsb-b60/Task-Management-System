import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../api'
import { useAuth } from '../../contexts/auth-context'
import { useGitHubRateLimit } from '../../hooks/useGitHubRateLimit'
import { initialsOf } from '../../lib/format'
import { queryKeys } from '../../lib/queryKeys'
import { IconArrowOut, IconChevronDown, IconGear, IconGithub } from '../ui/Icons'
import { EditProfileDialog } from './EditProfileDialog'
import { useMenu } from './useMenu'

export function UserMenu() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { ref, open, setOpen, close } = useMenu()
  const { data: rateLimit } = useGitHubRateLimit()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  if (!user) return null

  const initials = initialsOf(user.displayName, user.email)
  const displayName = user.displayName?.trim() || user.email.split('@')[0]

  async function handleSignOut() {
    close()
    await logout()
    navigate('/login', { replace: true })
  }

  function handleEditProfile() {
    close()
    setIsEditOpen(true)
  }

  async function handleDisconnectGitHub() {
    close()
    setIsDisconnecting(true)
    try {
      await authApi.disconnectGitHub()
      await refreshUser()
      await queryClient.invalidateQueries({ queryKey: queryKeys.githubRateLimit() })
      toast.success('GitHub disconnected')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disconnect GitHub.')
    } finally {
      setIsDisconnecting(false)
    }
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
              onClick={handleEditProfile}
              className="w-full px-2 py-1.5 rounded hover:bg-subtle flex items-center gap-2 text-fg"
            >
              <IconGear className="w-3.5 h-3.5 text-faint" />
              Edit profile
            </button>
            {rateLimit ? (
              <button
                type="button"
                role="menuitem"
                onClick={handleDisconnectGitHub}
                disabled={isDisconnecting}
                className="w-full px-2 py-1.5 rounded hover:bg-subtle flex items-center gap-2 text-fg disabled:opacity-50"
              >
                <IconGithub className="w-3.5 h-3.5 text-faint" />
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect GitHub'}
              </button>
            ) : (
              <a
                role="menuitem"
                href={authApi.githubAuthorizeUrl()}
                className="w-full px-2 py-1.5 rounded hover:bg-subtle flex items-center gap-2 text-fg"
              >
                <IconGithub className="w-3.5 h-3.5 text-faint" />
                Connect GitHub
              </a>
            )}
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

      {isEditOpen && <EditProfileDialog open onClose={() => setIsEditOpen(false)} />}
    </div>
  )
}
