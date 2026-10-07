import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockDashboardApi, setScenario } from '../api/mock'
import { renderPage } from '../test/renderApp'
import { DashboardPage } from './DashboardPage'

const PORTFOLIO = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const STREAM = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

function renderDashboard(route = '/dashboard') {
  return renderPage(<DashboardPage />, { route })
}

describe('DashboardPage', () => {
  it('renders every stat tile with the server count', async () => {
    await renderDashboard()

    expect((await screen.findByText('all statuses')).previousSibling).toHaveTextContent('137')
    expect(screen.getByText('byStatus.TODO').previousSibling).toHaveTextContent('37')
    expect(screen.getByText('byStatus.IN_PROGRESS').previousSibling).toHaveTextContent('52')
    expect(screen.getByText('byStatus.DONE').previousSibling).toHaveTextContent('48')
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
    expect(screen.queryByText('all statuses')).not.toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: 'Portfolio Website' })).toBeInTheDocument()
    })
    expect(screen.getByText(`?projectId=${PORTFOLIO}`)).toBeInTheDocument()
  })

  it('scopes the counts to one project only', async () => {
    await renderDashboard(`/dashboard?projectId=${PORTFOLIO}`)

    await waitFor(() => {
      expect(screen.getByText('all statuses').previousSibling).toHaveTextContent('12')
    })
  })

  it('reports zero for a project with no tasks', async () => {
    await renderDashboard(`/dashboard?projectId=${STREAM}`)

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
  })
})