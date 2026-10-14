import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDataApi, mockTasksApi, resetMockStore } from '../api/mock'
import { renderPage } from '../test/renderApp'
import { BoardPage } from './BoardPage'

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

function renderBoard(route = '/board') {
  return renderPage(<BoardPage />, { route })
}

describe('BoardPage project filter', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('shows every task without a filter', async () => {
    await renderBoard()

    expect(await screen.findByText('Design system')).toBeInTheDocument()
    expect(screen.getByText('API integration')).toBeInTheDocument()
    expect(screen.getByText('Database migration')).toBeInTheDocument()
  })

  it('narrows the columns to one project', async () => {
    const { router } = await renderBoard()
    await screen.findByText('Design system')

    fireEvent.change(screen.getByLabelText('Filter by project'), {
      target: { value: STREAM },
    })

    await waitFor(() => {
      expect(screen.getByText('Database migration')).toBeInTheDocument()
      expect(screen.queryByText('Design system')).not.toBeInTheDocument()
      expect(screen.queryByText('API integration')).not.toBeInTheDocument()
    })
    expect(router.state.location.search).toContain(`projectId=${STREAM}`)
  })
})

describe('BoardPage detail overlay', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('opens the task in a stacked right-side panel instead of navigating', async () => {
    const { router } = await renderBoard()
    await screen.findByText('Design system')

    await userEvent.click(screen.getByRole('button', { name: /Task #sk-1: Design system/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/board')
    expect(router.state.location.search).toContain('selected=task-1')
  })

  it('closes the panel from its close button', async () => {
    const { router } = await renderBoard()
    await screen.findByText('Design system')

    await userEvent.click(screen.getByRole('button', { name: /Task #sk-1: Design system/ }))
    await screen.findByRole('dialog')

    await userEvent.click(screen.getByRole('button', { name: 'Close details' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(router.state.location.search).not.toContain('selected=')
  })
})

describe('BoardPage TODO ordering', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('sorts the TODO column earliest due first with undated last', async () => {
    await mockTasksApi.create({ title: 'Later todo', status: 'TODO', dueDate: '2026-06-01' })
    await mockTasksApi.create({ title: 'Sooner todo', status: 'TODO', dueDate: '2026-02-01' })
    await mockTasksApi.create({ title: 'No date todo', status: 'TODO' })
    await renderBoard()
    await screen.findByText('No date todo')

    const column = document.querySelector('[data-status="TODO"]')
    expect(column).not.toBeNull()
    const html = column!.innerHTML
    const positions = ['Design system', 'Sooner todo', 'Later todo', 'No date todo'].map(
      (title) => html.indexOf(title),
    )
    expect(positions.every((pos) => pos >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })
})

describe('BoardPage sort control', () => {
  beforeEach(() => {
    resetMockStore()
  })

  function todoColumnTitles(): string[] {
    const column = document.querySelector('[data-status="TODO"]')
    if (!column) return []
    return Array.from(column.querySelectorAll('[role="button"]'))
      .map((el) => (el.getAttribute('aria-label') ?? '').replace(/^Task #[^:]+: /, ''))
      .filter((label) => label.length > 0)
  }

  it('re-sorts the board by title', async () => {
    await mockTasksApi.create({ title: 'Later todo', status: 'TODO', dueDate: '2026-06-01' })
    await mockTasksApi.create({ title: 'Sooner todo', status: 'TODO', dueDate: '2026-02-01' })
    const { router } = await renderBoard()
    await screen.findByText('Sooner todo')

    expect(todoColumnTitles()).toEqual(['Design system', 'Sooner todo', 'Later todo'])

    fireEvent.change(screen.getByLabelText('Sort by'), {
      target: { value: 'title' },
    })

    await waitFor(() => {
      expect(todoColumnTitles()).toEqual(['Design system', 'Later todo', 'Sooner todo'])
    })
    expect(router.state.location.search).toContain('sortBy=title')
  })

  it('flips the direction', async () => {
    await mockTasksApi.create({ title: 'Later todo', status: 'TODO', dueDate: '2026-06-01' })
    await mockTasksApi.create({ title: 'Sooner todo', status: 'TODO', dueDate: '2026-02-01' })
    const { router } = await renderBoard()
    await screen.findByText('Sooner todo')

    await userEvent.click(screen.getByRole('button', { name: 'Sort descending' }))

    await waitFor(() => {
      expect(todoColumnTitles()[0]).toContain('Later todo')
    })
    expect(router.state.location.search).toContain('sortOrder=desc')
  })
})
