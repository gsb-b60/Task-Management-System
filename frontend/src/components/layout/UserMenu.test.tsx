import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockAuthApi, mockDataApi, mockGitHubApi, resetMockStore } from '../../api/mock'
import { renderPage } from '../../test/renderApp'
import { UserMenu } from './UserMenu'

vi.mock('../../api', () => ({
  dataApi: mockDataApi,
  isApiError: (value: unknown) => value instanceof Error && 'code' in value,
  authApi: mockAuthApi,
}))

function renderMenu() {
  return renderPage(<UserMenu />, { api: mockAuthApi, route: '/dashboard' })
}

async function openMenu() {
  const user = userEvent.setup()
  renderMenu()
  await user.click(await screen.findByRole('button', { name: 'Account menu' }))
  return user
}

describe('UserMenu', () => {
  beforeEach(() => {
    resetMockStore()
    vi.restoreAllMocks()
  })

  it('edits the display name from the profile dialog', async () => {
    const user = await openMenu()
    await user.click(screen.getByRole('menuitem', { name: 'Edit profile' }))

    const input = await screen.findByLabelText('Display name')
    fireEvent.change(input, { target: { value: 'Ada Second' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(screen.getByText('Ada Second')).toBeInTheDocument()
    })
  })

  it('disconnects GitHub when the account is linked', async () => {
    const spy = vi.spyOn(mockAuthApi, 'disconnectGitHub')
    const user = await openMenu()

    await user.click(await screen.findByRole('menuitem', { name: 'Disconnect GitHub' }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  it('offers to connect GitHub when the account is not linked', async () => {
    vi.spyOn(mockGitHubApi, 'rateLimit').mockResolvedValueOnce(null)
    await openMenu()

    const link = await screen.findByRole('menuitem', { name: 'Connect GitHub' })
    expect(link).toHaveAttribute('href', expect.stringContaining('github.com'))
  })

  it('still signs out from the menu', async () => {
    const user = await openMenu()
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
    })
  })
})
