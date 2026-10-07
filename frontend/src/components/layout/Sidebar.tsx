import { NavLink, useSearchParams } from 'react-router-dom'
import { useDashboard } from '../../hooks/useDashboard'
import { useGitHubRateLimit, useProjects } from '../../hooks/useProjects'
import { IconCheck } from '../ui/Icons'
import { SIDEBAR_VIEWS } from './nav'

const ITEM = 'flex items-center gap-2 text-xs px-2 py-1.5 rounded-md'
const ACTIVE = 'font-semibold text-fg bg-inset'
const INACTIVE = 'text-muted hover:bg-subtle'

const SECTION = 'text-[10px] font-semibold text-faint uppercase tracking-wide'

export function Sidebar() {
  const { data: projects = [] } = useProjects()
  const { data: dashboard } = useDashboard()
  const { data: rateLimit } = useGitHubRateLimit()

  return (
    <aside className="hidden lg:block w-56 flex-none border-r border-line p-3 bg-canvas">
      <div className={`${SECTION} mb-1.5`}>Views</div>
      {SIDEBAR_VIEWS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          className={({ isActive }) => `${ITEM} ${isActive ? ACTIVE : INACTIVE}`}
        >
          {item.label}
          {item.to === '/tasks' && (
            <span className="ml-auto text-[10px] text-faint">{dashboard?.stats.total ?? 0}</span>
          )}
        </NavLink>
      ))}

      <div className={`${SECTION} mt-4 mb-1.5`}>Projects</div>
      <SidebarProjects projects={projects} />

      <div className="mt-4 border border-line rounded-md p-2 bg-subtle">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
          <IconCheck className="w-3.5 h-3.5 text-ok" />
          GitHub connected
        </div>
        {/* The counter stays hidden until the API exposes the quota, rather
            than showing a number nothing is enforcing. */}
        {rateLimit && (
          <div className="text-[10px] text-faint mt-0.5 ml-5">
            {rateLimit.remaining.toLocaleString('en-GB')} /{' '}
            {rateLimit.limit.toLocaleString('en-GB')} requests left
          </div>
        )}
      </div>
    </aside>
  )
}

function SidebarProjects({ projects }: { projects: ReturnType<typeof useProjects>['data'] }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get('projectId')

  function select(projectId: string | null) {
    const next = new URLSearchParams(searchParams)
    if (projectId === null) {
      next.delete('projectId')
    } else {
      next.set('projectId', projectId)
    }
    setSearchParams(next)
  }

  if (!projects || projects.length === 0) {
    return <div className="text-[11px] text-faint px-2 py-1">No projects yet.</div>
  }

  return (
    <>
      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          onClick={() => select(project.id)}
          aria-pressed={project.id === activeId}
          className={`${ITEM} w-full text-left ${project.id === activeId ? ACTIVE : INACTIVE}`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-none"
            style={{ backgroundColor: project.color ?? 'var(--color-line)' }}
          />
          <span className="truncate">{project.name}</span>
          <span className="ml-auto text-[10px] text-faint">{project.taskCount}</span>
        </button>
      ))}
    </>
  )
}