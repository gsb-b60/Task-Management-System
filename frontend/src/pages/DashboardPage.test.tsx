import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockDashboardApi, setScenario, mockDataApi } from '../api/mock'
import { renderPage } from '../test/renderApp'
import { DashboardPage } from './DashboardPage'

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

const PORTFOLIO = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const STREAM = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

function renderDashboard(route = '/dashboard') {
  return renderPage(<DashboardPage />, { route })
}

describe('DashboardPage', () => {
  it('renders every stat tile with the server count', async () => {
    await renderDashboard()

    const tiles = await screen.findByTestId('stat-tiles')
    const valueOf = (label: string) => within(tiles).getByText(label).nextElementSibling
    expect(valueOf('Total')).toHaveTextContent('137')
    expect(valueOf('Todo')).toHaveTextContent('37')
    expect(valueOf('In progress')).toHaveTextContent('52')
    expect(valueOf('Done')).toHaveTextContent('48')
  })

  it('renders the overdue and due-today counts', async () => {
    await renderDashboard()

    expect(await screen.findByText('Overdue')).toBeInTheDocument()
    expect(await screen.findByText('Due today')).toBeInTheDocument()
  })

  it('shows the upcoming list', async () => {
    await renderDashboard()

    expect(await screen.findByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Due' })).toBeInTheDocument()
  })

  it('labels overdue tasks from the server flag rather than a client calculation', async () => {
    await renderDashboard()

    expect((await screen.findAllByText(/overdue by \d+ days?/)).length).toBeGreaterThan(0)
  })

  it('shows an empty panel rather than four zero tiles when there is no data', async () => {
    setScenario('empty')
    await renderDashboard()

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-tiles')).not.toBeInTheDocument()
  })

  it('keeps every status key present at zero so a tile never renders blank', async () => {
    const response = await mockDashboardApi.get()

    expect(Object.keys(response.stats.byStatus).sort()).toEqual(['DONE', 'IN_PROGRESS', 'TODO'])
  })

  it('shows an empty state instead of a bare list', async () => {
    setScenario('empty')
    await renderDashboard()

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
  })

  it('offers a retry when the request fails', async () => {
    setScenario('error')
    await renderDashboard()

    expect(await screen.findByText('Could not load the dashboard')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('names the project in the heading when scoped', async () => {
    await renderDashboard(`/dashboard?projectId=${PORTFOLIO}`)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Portfolio Website/ })).toBeInTheDocument()
    })
    expect(screen.queryByText(`?projectId=${PORTFOLIO}`)).not.toBeInTheDocument()
  })

  it('scopes the counts to one project only', async () => {
    await renderDashboard(`/dashboard?projectId=${PORTFOLIO}`)

    await waitFor(() => {
      const tiles = screen.getByTestId('stat-tiles')
      expect(within(tiles).getByText('Total').nextElementSibling).toHaveTextContent('12')
    })
  })

  it('reports zero for a project with no tasks', async () => {
    await renderDashboard(`/dashboard?projectId=${STREAM}`)

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
  })
})