import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDataApi, mockTasksApi, resetMockStore } from '../api/mock'
import { renderPage } from '../test/renderApp'
import { TasksPage } from './TasksPage'

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

const STREAM = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

function renderTasks(route = '/tasks') {
  return renderPage(<TasksPage />, { route })
}

describe('TasksPage project column and filter', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('shows a project column with each task project', async () => {
    await renderTasks()

    expect(await screen.findByRole('columnheader', { name: 'Project' })).toBeInTheDocument()
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Design system')).toBeInTheDocument()
    expect(within(table).getAllByText('#1 Portfolio').length).toBe(2)
    expect(within(table).getByText('#2 Stream')).toBeInTheDocument()
  })

  it('filters the list by project', async () => {
    const { router } = await renderTasks()
    await screen.findByText('Design system')

    fireEvent.change(screen.getByLabelText('Filter by project'), {
      target: { value: STREAM },
    })

    await waitFor(() => {
      expect(screen.getByText('Database migration')).toBeInTheDocument()
      expect(screen.queryByText('Design system')).not.toBeInTheDocument()
    })
    expect(router.state.location.search).toContain(`projectId=${STREAM}`)
  })
})

describe('TasksPage inline row editing', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('changes the status from the row without opening the drawer', async () => {
    await renderTasks()
    await screen.findByText('Design system')

    await userEvent.click(screen.getByRole('button', { name: 'Todo' }))

    fireEvent.change(screen.getByLabelText('Status for Design system'), {
      target: { value: 'DONE' },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })
    // The row click must not have leaked through to the drawer.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('changes the priority from the row', async () => {
    await renderTasks()
    await screen.findByText('Design system')
    const row = screen.getByRole('row', { name: 'Open details for Design system' })

    await userEvent.click(within(row).getByRole('button', { name: 'HIGH' }))

    fireEvent.change(screen.getByLabelText('Priority for Design system'), {
      target: { value: 'LOW' },
    })

    await waitFor(() => {
      expect(within(row).getByRole('button', { name: 'LOW' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('TasksPage detail drawer', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('opens the task in a side panel instead of navigating', async () => {
    const { router } = await renderTasks()
    await screen.findByText('Design system')

    await userEvent.click(screen.getByRole('link', { name: 'Design system' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    // Floating popup, not modal: the list stays visible and usable behind it.
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/tasks')
    expect(router.state.location.search).toContain('selected=task-1')
  })

  it('closes the panel and drops the selection from the URL', async () => {
    const { router } = await renderTasks()
    await screen.findByText('Design system')

    await userEvent.click(screen.getByRole('link', { name: 'Design system' }))
    await screen.findByRole('dialog')

    await userEvent.click(screen.getByRole('button', { name: 'Close details' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(router.state.location.search).not.toContain('selected=')
  })

  it('toggles the popup when clicking the open task again', async () => {
    await renderTasks()
    await screen.findByText('Design system')

    await userEvent.click(screen.getByRole('link', { name: 'Design system' }))
    await screen.findByRole('dialog')

    await userEvent.click(screen.getByRole('link', { name: 'Design system' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('opens the details when clicking anywhere on the row', async () => {
    const { router } = await renderTasks()
    await screen.findByText('API integration')

    await userEvent.click(
      screen.getByRole('row', { name: 'Open details for API integration' }),
    )

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(router.state.location.search).toContain('selected=task-2')
  })
})

describe('TasksPage inline project assignment', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('assigns a project to an unassigned task from the row', async () => {
    await mockTasksApi.create({ title: 'Orphan task' })
    await renderTasks()
    await screen.findByText('Orphan task')
    const row = screen.getByRole('row', { name: 'Open details for Orphan task' })

    await userEvent.click(within(row).getByTitle('Assign project'))

    fireEvent.change(screen.getByLabelText('Project for Orphan task'), {
      target: { value: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' },
    })

    await waitFor(() => {
      expect(within(row).getByText('#1 Portfolio')).toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('TasksPage drawer inline editing', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('edits the title in place', async () => {
    await renderTasks()
    await screen.findByText('Design system')

    await userEvent.click(screen.getByRole('link', { name: 'Design system' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('button', { name: '#sk-1 Design system' }))
    const titleInput = within(dialog).getByLabelText('Task title')
    fireEvent.change(titleInput, { target: { value: 'Design system v2' } })
    fireEvent.keyDown(titleInput, { key: 'Enter' })

    await waitFor(() => {
      expect(within(dialog).getByText('#sk-1 Design system v2')).toBeInTheDocument()
    })
  })

  it('edits the status in place', async () => {
    await renderTasks()
    await screen.findByText('API integration')

    await userEvent.click(screen.getByRole('link', { name: 'API integration' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'In progress' }))
    fireEvent.change(within(dialog).getByLabelText('Status for API integration'), {
      target: { value: 'DONE' },
    })

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })
  })
})

describe('TasksPage status and priority filters', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('filters the list when picking a status option', async () => {
    const { router } = await renderTasks()
    await screen.findByText('Database migration')

    await userEvent.click(screen.getByRole('button', { name: /status: all/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Todo' }))

    await waitFor(() => {
      expect(screen.getByText('Design system')).toBeInTheDocument()
      expect(screen.queryByText('API integration')).not.toBeInTheDocument()
      expect(screen.queryByText('Database migration')).not.toBeInTheDocument()
    })
    expect(router.state.location.search).toContain('status=TODO')
  })

  it('filters the list when picking a priority option', async () => {
    const { router } = await renderTasks()
    await screen.findByText('Database migration')

    await userEvent.click(screen.getByRole('button', { name: /priority: all/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'High' }))

    await waitFor(() => {
      expect(screen.getByText('Design system')).toBeInTheDocument()
      expect(screen.queryByText('API integration')).not.toBeInTheDocument()
    })
    expect(router.state.location.search).toContain('priority=HIGH')
  })
})

describe('TasksPage inline date editing', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('changes the due date from the row', async () => {
    await renderTasks()
    await screen.findByText('Design system')
    const row = screen.getByRole('row', { name: 'Open details for Design system' })

    await userEvent.click(within(row).getByTitle('Change due time'))
    fireEvent.change(within(row).getByLabelText('Due time for Design system'), {
      target: { value: '2026-12-01T14:30' },
    })
    await userEvent.click(within(row).getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(within(row).getByText('1 Dec, 14:30')).toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('changes the start date from the row', async () => {
    await renderTasks()
    await screen.findByText('Design system')
    const row = screen.getByRole('row', { name: 'Open details for Design system' })

    await userEvent.click(within(row).getByTitle('Change start time'))
    fireEvent.change(within(row).getByLabelText('Start time for Design system'), {
      target: { value: '2026-02-05T09:15' },
    })
    await userEvent.click(within(row).getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(within(row).getByText('5 Feb, 09:15')).toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('TasksPage sorting', () => {
  beforeEach(() => {
    resetMockStore()
  })

  function firstRowTitle(): string | null {
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    return rows.length > 0 ? (rows[0].textContent ?? null) : null
  }

  it('lists TODO and dated tasks first by due date ascending', async () => {
    await renderTasks()
    await screen.findByRole('table')

    await waitFor(() => {
      expect(firstRowTitle()).toContain('Database migration')
    })
  })

  it('re-sorts by title and flips direction', async () => {
    const { router } = await renderTasks()
    await screen.findByRole('table')

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'title' },
    })

    await waitFor(() => {
      expect(firstRowTitle()).toContain('API integration')
    })
    expect(router.state.location.search).toContain('sortBy=title')

    await userEvent.click(screen.getByRole('button', { name: 'Sort descending' }))

    await waitFor(() => {
      expect(firstRowTitle()).toContain('Design system')
    })
    expect(router.state.location.search).toContain('sortOrder=desc')
  })
})
