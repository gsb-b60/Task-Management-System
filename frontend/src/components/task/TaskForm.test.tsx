import { screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDataApi, setScenario } from '../../api/mock'
import { renderPage } from '../../test/renderApp'
import { TaskForm } from './TaskForm'

vi.mock('../../api', () => ({
  dataApi: mockDataApi,
}))

describe('TaskForm project quick-create', () => {
  beforeEach(() => {
    setScenario('default')
  })

  it('creates a project inline and selects it for the task', async () => {
    renderPage(
      <TaskForm onSubmit={vi.fn()} submitLabel="Create task" projects={[]} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^new$/i }))
    const nameInput = screen.getByPlaceholderText('New project name')
    expect(screen.getByRole('button', { name: /create project/i })).toBeDisabled()

    fireEvent.change(nameInput, { target: { value: 'Side Quest' } })
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('New project name')).not.toBeInTheDocument()
    })
    const projectSelect = screen.getByLabelText('Project') as HTMLSelectElement
    expect(projectSelect.value).toMatch(/^project-/)
  })

  it('cancelling the quick-create leaves the project untouched', async () => {
    renderPage(
      <TaskForm onSubmit={vi.fn()} submitLabel="Create task" projects={[]} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^new$/i }))
    fireEvent.change(screen.getByPlaceholderText('New project name'), {
      target: { value: 'Abandoned' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('New project name')).not.toBeInTheDocument()
    })
    expect(
      (screen.getByLabelText('Project') as HTMLSelectElement).value,
    ).toBe('')
  })
})
