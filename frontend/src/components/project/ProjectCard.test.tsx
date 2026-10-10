import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockDataApi, resetMockStore } from '../../api/mock'
import { renderPage } from '../../test/renderApp'
import { beforeEach } from 'vitest'
import { ProjectCard } from './ProjectCard'
import type { ProjectListItem } from '../../api/types'

vi.mock('../../api', () => ({
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

const project: ProjectListItem = {
  id: 'p1',
  name: 'Portfolio',
  description: null,
  startDate: null,
  targetDate: null,
  color: '#3b82f6',
  projectNumber: 3,
  taskCount: 0,
  completedTaskCount: 0,
  repository: null,
  createdAt: '2024-01-01T00:00:00Z',
}

describe('ProjectCard', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('shows the stable project number before the name', async () => {
    renderPage(<ProjectCard project={project} onClick={() => {}} isSelected={false} />, {
      route: '/projects',
    })

    expect(await screen.findByText('#3 Portfolio')).toBeInTheDocument()
  })

  it('renders Markdown in the description', async () => {
    renderPage(
      <ProjectCard
        project={{ ...project, description: 'Ships **fast** with *style*' }}
        onClick={() => {}}
        isSelected={false}
      />,
      { route: '/projects' },
    )

    expect(await screen.findByText('fast')).toBeInTheDocument()
    expect(screen.getByText('fast').tagName).toBe('STRONG')
  })

  it('opens Edit and Delete from the 3-dot menu', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderPage(
      <ProjectCard project={project} onClick={() => {}} isSelected={false} onEdit={onEdit} onDelete={onDelete} />,
      { route: '/projects' },
    )

    await user.click(await screen.findByLabelText('Project actions for Portfolio'))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)

    await user.click(screen.getByLabelText('Project actions for Portfolio'))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
