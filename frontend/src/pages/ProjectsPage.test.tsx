import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDataApi, resetMockStore } from '../api/mock'
import { renderPage } from '../test/renderApp'
import { ProjectsPage } from './ProjectsPage'

vi.mock('../api', () => ({
  dataApi: mockDataApi,
  authApi: {
    async me() {
      return { id: 'user-1', email: 'test@example.com', displayName: 'Test User', createdAt: '2024-01-01T00:00:00Z' }
    },
    githubAuthorizeUrl() {
      return 'https://github.com/login/oauth/authorize?client_id=test'
    },
  },
}))

describe('ProjectsPage delete', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('opens the confirm dialog from the row menu with no ?projectId= in the URL', async () => {
    // Regression: the dialog used to live behind the edit guard
    // ({projectId && selectedProject && ...}), so deleting straight from
    // /projects opened nothing.
    renderPage(<ProjectsPage />, { route: '/projects' })

    await userEvent.click(
      await screen.findByRole('button', { name: 'Project actions for Portfolio' }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: 'Delete project' })).toBeInTheDocument()
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('#1 Portfolio')
  })

  it('removes the project after confirming', async () => {
    renderPage(<ProjectsPage />, { route: '/projects' })

    await userEvent.click(
      await screen.findByRole('button', { name: 'Project actions for Portfolio' }),
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete', exact: false }),
    )

    await waitFor(() => {
      expect(screen.queryByText('#1 Portfolio')).not.toBeInTheDocument()
    })
    expect(screen.getByText('#2 Stream')).toBeInTheDocument()
  })
})
