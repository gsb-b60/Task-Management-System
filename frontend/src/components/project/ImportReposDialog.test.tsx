import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDataApi, mockProjectsApi, resetMockStore } from '../../api/mock'
import { renderPage } from '../../test/renderApp'
import { ImportReposDialog } from './ImportReposDialog'
import type { ProjectListItem } from '../../api/types'

vi.mock('../../api', () => ({
  dataApi: mockDataApi,
  isApiError: (value: unknown) => value instanceof Error && 'code' in value,
  authApi: {
    async me() {
      return { id: 'user-1', email: 'test@example.com', displayName: 'Test User', createdAt: '2024-01-01T00:00:00Z' }
    },
    githubAuthorizeUrl() {
      return 'https://github.com/login/oauth/authorize?client_id=test'
    },
  },
}))

function renderDialog(props: Partial<{ onClose: () => void; projects: ProjectListItem[] }> = {}) {
  return renderPage(
    <ImportReposDialog open onClose={() => {}} projects={[]} {...props} />,
    { route: '/projects' },
  )
}

describe('ImportReposDialog', () => {
  beforeEach(() => {
    resetMockStore()
    vi.restoreAllMocks()
  })

  it('lists repositories from the linked GitHub account', async () => {
    await renderDialog()

    expect(await screen.findByText('octocat/Hello-World')).toBeInTheDocument()
    expect(screen.getByText('octocat/Spoon-Knife')).toBeInTheDocument()
    expect(screen.getByText('My first repository')).toBeInTheDocument()
  })

  it('filters repositories by search', async () => {
    const user = userEvent.setup()
    await renderDialog()

    await screen.findByText('octocat/Hello-World')
    await user.type(screen.getByLabelText('Search repositories'), 'spoon')

    expect(screen.queryByText('octocat/Hello-World')).not.toBeInTheDocument()
    expect(screen.getByText('octocat/Spoon-Knife')).toBeInTheDocument()
  })

  it('badges repositories that are already linked', async () => {
    await renderDialog({
      projects: [
        {
          id: 'p1',
          name: 'Hello',
          description: null,
          startDate: null,
          targetDate: null,
          color: null,
          projectNumber: 1,
          taskCount: 0,
          completedTaskCount: 0,
          repository: { githubId: '1296269', fullName: 'octocat/Hello-World', isPrivate: false },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    })

    await screen.findByText('octocat/Hello-World')
    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(screen.getByLabelText('Select octocat/Hello-World')).toBeDisabled()
  })

  it('adds selected repositories with edited titles', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const spy = vi.spyOn(mockProjectsApi, 'createFromGitHub')
    await renderDialog({ onClose })

    await screen.findByText('octocat/Hello-World')
    await user.click(screen.getByLabelText('Select octocat/Hello-World'))

    const titleInput = screen.getByLabelText('Project title for octocat/Hello-World')
    expect(titleInput).toHaveValue('Hello-World')
    fireEvent.change(titleInput, { target: { value: 'My Hello' } })

    await user.click(screen.getByRole('button', { name: /add 1 project/i }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith([
        { githubId: '1296269', name: 'My Hello', description: 'My first repository' },
      ])
    })
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('keeps the add button disabled with nothing selected', async () => {
    await renderDialog()

    await screen.findByText('octocat/Hello-World')
    expect(screen.getByRole('button', { name: /add projects/i })).toBeDisabled()
  })
})
