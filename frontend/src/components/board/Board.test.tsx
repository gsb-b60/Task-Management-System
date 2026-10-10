import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Board } from './Board'
import { resolveDropStatus } from './dropStatus'
import type { ProjectListItem, Task, TaskStatus } from '../../api/types'

function task(overrides: Partial<Task> & { id: string; title: string; status: TaskStatus }): Task {
  return {
    description: null,
    priority: 'MEDIUM',
    dueDate: null,
    startDate: null,
    projectId: null,
    githubIssueNumber: null,
    githubState: null,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    ...overrides,
  }
}

const COLUMNS: Record<TaskStatus, Task[]> = {
  TODO: [
    task({ id: 'task-1', title: 'Design system', status: 'TODO', projectId: 'portfolio' }),
    task({ id: 'task-4', title: 'March task', status: 'TODO', projectId: 'portfolio', dueDate: '2026-03-10T00:00:00.000Z' }),
    task({ id: 'task-5', title: 'January task', status: 'TODO', projectId: 'portfolio', dueDate: '2026-01-10T00:00:00.000Z' }),
  ],
  IN_PROGRESS: [],
  DONE: [task({ id: 'task-3', title: 'Ship it', status: 'DONE', priority: 'HIGH', projectId: 'stream' })],
}

const PROJECTS: ProjectListItem[] = [
  { id: 'portfolio', name: 'Portfolio', taskCount: 1, completedTaskCount: 0, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'stream', name: 'Stream', taskCount: 1, completedTaskCount: 1, createdAt: '2024-02-01T00:00:00Z' },
]

const META = {
  page: 1,
  pageSize: 100,
  totalItems: 4,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}

describe('Board', () => {
  it('renders every column with its cards and counts', () => {
    render(
      <Board columns={COLUMNS} meta={META} projects={PROJECTS} onTaskClick={vi.fn()} onMoveTask={async () => {}} />,
    )

    expect(screen.getByText('TODO')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('DONE')).toBeInTheDocument()
    expect(screen.getByText('Design system')).toBeInTheDocument()
    expect(screen.getByText('Ship it')).toBeInTheDocument()
    expect(screen.getAllByText('Portfolio')).toHaveLength(3)
    expect(screen.getByText('Stream')).toBeInTheDocument()
    expect(screen.getByText('No tasks')).toBeInTheDocument()
  })

  it('activates a drag on press-and-move (drop ghost appears)', async () => {
    const { container } = render(
      <Board columns={COLUMNS} meta={META} projects={PROJECTS} onTaskClick={vi.fn()} onMoveTask={async () => {}} />,
    )

    const card = screen.getByRole('button', { name: /Task #sk-1: Design system/ })
    fireEvent.pointerDown(card, {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
      button: 0,
      isPrimary: true,
    })
    fireEvent.pointerMove(container.ownerDocument, {
      pointerId: 1,
      clientX: 30,
      clientY: 30,
      buttons: 1,
    })

    // dnd-kit lifts on the next animation frame after passing the distance.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    expect(card.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('resolveDropStatus', () => {
  it('moves a card dropped on another column', () => {
    expect(resolveDropStatus('DONE', undefined, 'TODO')).toBe('DONE')
  })

  it('resolves a drop on a card to that card column', () => {
    expect(resolveDropStatus('task-9', 'IN_PROGRESS', 'TODO')).toBe('IN_PROGRESS')
  })

  it('ignores drops back into the same column', () => {
    expect(resolveDropStatus('TODO', undefined, 'TODO')).toBeNull()
    expect(resolveDropStatus('task-9', 'TODO', 'TODO')).toBeNull()
  })

  it('ignores drops outside any column', () => {
    expect(resolveDropStatus('task-9', undefined, 'TODO')).toBeNull()
    expect(resolveDropStatus('ghost', undefined, 'TODO')).toBeNull()
  })
})
