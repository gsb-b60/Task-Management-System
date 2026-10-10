import { NavLink, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { authApi } from '../../api'
import { useDashboard } from '../../hooks/useDashboard'
import { useGitHubRateLimit } from '../../hooks/useGitHubRateLimit'
import { useProjects } from '../../hooks/useProjects'
import { useCreateProject } from '../../hooks/useProjectMutations'
import { IconCheck, IconGithub, IconPlus } from '../ui/Icons'
import { TextInput } from '../ui/Input'
import { formatProjectLabel } from '../../lib/format'

const ITEM = 'flex items-center gap-2 text-xs px-2 py-1.5 rounded-md'
const ACTIVE = 'font-semibold text-fg bg-inset'
const INACTIVE = 'text-muted hover:bg-subtle'

const SECTION = 'text-[10px] font-semibold text-faint uppercase tracking-wide'

export function Sidebar() {
  const { data: projects = [] } = useProjects()
  const { data: dashboard } = useDashboard()
  const { data: rateLimit, isLoading: isGitHubLoading } = useGitHubRateLimit()
  const createProject = useCreateProject()

  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get('projectId')
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  function handleSelect(projectId: string | null) {
    const next = new URLSearchParams(searchParams)
    if (projectId === null) {
      next.delete('projectId')
    } else {
      next.set('projectId', projectId)
    }
    setSearchParams(next, { replace: true })
  }

  function handleClear() {
    const next = new URLSearchParams(searchParams)
    next.delete('projectId')
    setSearchParams(next, { replace: true })
  }

  async function handleQuickAddProject(e: React.FormEvent) {
    e.preventDefault()
    const name = newProjectName.trim()
    if (!name) return

    try {
      await createProject.mutateAsync({ name })
      setNewProjectName('')
      setIsAddingProject(false)
    } catch {
      // Error handled by toast in mutation
    }
  }

  function handleCancelQuickAdd() {
    setNewProjectName('')
    setIsAddingProject(false)
  }

  return (
    <aside className="hidden lg:block w-56 flex-none border-r border-line p-3 bg-canvas">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`${SECTION}`}>Projects</span>
        {!isAddingProject && (
          <button
            type="button"
            onClick={() => setIsAddingProject(true)}
            className="text-accent hover:text-accent-dark text-sm font-medium flex items-center gap-1"
            aria-label="Add project"
          >
            <IconPlus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => handleClear()}
          className={`${ITEM} w-full text-left ${activeId === null ? ACTIVE : INACTIVE}`}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-none bg-line" />
          <span className="truncate">All projects</span>
          <span className="ml-auto text-[10px] text-faint">{dashboard?.stats.total ?? 0}</span>
        </button>
        {isAddingProject ? (
          <form onSubmit={handleQuickAddProject} className="flex gap-1 px-1">
            <TextInput
              id="quick-add-project"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelQuickAdd()
              }}
              placeholder="Project name"
              className="flex-1 min-w-0"
              autoFocus
              required
              maxLength={100}
            />
            <button
              type="submit"
              className="px-2 py-1 text-xs font-medium text-fg bg-canvas hover:bg-subtle border border-line rounded-md disabled:opacity-50"
              disabled={createProject.isPending || !newProjectName.trim()}
            >
              {createProject.isPending ? '…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={handleCancelQuickAdd}
              className="px-2 py-1 text-xs text-muted hover:text-fg"
              aria-label="Cancel"
            >
              ✕
            </button>
          </form>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => handleSelect(project.id)}
              className={`${ITEM} w-full text-left ${project.id === activeId ? ACTIVE : INACTIVE}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-none"
                style={{ backgroundColor: project.color ?? 'var(--color-line)' }}
              />
              <span className="truncate">{formatProjectLabel(project.projectNumber, project.name)}</span>
              <span className="ml-auto text-[10px] text-faint">{project.taskCount}</span>
            </button>
          )))
        }
      </div>
      <NavLink
        to="/projects"
        className="mt-1.5 inline-block px-2 text-[11px] font-medium text-accent hover:text-accent-dark hover:underline"
      >
        Manage projects →
      </NavLink>

      <div className="mt-4 border border-line rounded-md p-2 bg-subtle">
        {isGitHubLoading ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-faint">
            <IconGithub className="w-3.5 h-3.5" />
            Checking GitHub…
          </div>
        ) : rateLimit ? (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
              <IconCheck className="w-3.5 h-3.5 text-ok" />
              GitHub connected
            </div>
            <div className="text-[10px] text-faint mt-0.5 ml-5">
              {rateLimit.limit !== null ? (
                <>
                  {rateLimit.remaining.toLocaleString('en-GB')} /{' '}
                  {rateLimit.limit.toLocaleString('en-GB')} requests left
                </>
              ) : (
                <>{rateLimit.remaining.toLocaleString('en-GB')} requests left</>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
              <IconGithub className="w-3.5 h-3.5 text-faint" />
              GitHub not connected
            </div>
            <p className="text-[10px] text-faint mt-0.5 ml-5">
              Connect to import issues.
            </p>
            <a
              href={authApi.githubAuthorizeUrl()}
              className="ml-5 mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-dark"
            >
              Connect GitHub
            </a>
          </>
        )}
      </div>
    </aside>
  )
}