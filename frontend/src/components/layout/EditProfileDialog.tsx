import { useState } from 'react'
import { toast } from 'sonner'
import { authApi } from '../../api'
import { useAuth } from '../../contexts/auth-context'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Field, TextInput } from '../ui/Input'

interface EditProfileDialogProps {
  open: boolean
  onClose: () => void
}

/** Display-name editor. The email identifies the account and never changes. */
export function EditProfileDialog({ open, onClose }: EditProfileDialogProps) {
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      await authApi.updateMe({ displayName: displayName.trim() === '' ? null : displayName.trim() })
      await refreshUser()
      toast.success('Profile updated')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="text-xs text-muted">{user.email}</div>
        <Field label="Display name" htmlFor="profile-display-name" error={error ?? undefined}>
          <TextInput
            id="profile-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user.email.split('@')[0]}
            maxLength={100}
            autoFocus
          />
        </Field>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isSaving} loadingLabel="Saving…">
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
