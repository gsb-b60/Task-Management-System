import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDataApi, mockTasksApi, resetMockStore } from '../api/mock'
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

function renderDashboard(route = '/dashboard') {
  return renderPage(<DashboardPage />, { route })
}

describe('DashboardPage undated tasks', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('hides the section when every task has a due date', async () => {
    await renderDashboard()

    expect(await screen.findByText('Upcoming')).toBeInTheDocument()
    expect(screen.queryByText('No due date')).not.toBeInTheDocument()
  })

  it('lists unfinished tasks without a due date', async () => {
    await mockTasksApi.create({ title: 'Undated work' })
    await renderDashboard()

    expect(await screen.findByText('No due date')).toBeInTheDocument()
    expect(screen.getByText('Undated work')).toBeInTheDocument()
  })
})
