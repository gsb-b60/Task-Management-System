import { Link, useSearchParams } from 'react-router-dom'
import { useProjects } from '../../hooks/useProjects'
import { IconCheck, IconChevronDown, IconRepo } from '../ui/Icons'
import { useMenu } from './useMenu'

const ALL = '__all__'

/**
 * Scoping lives in `?projectId=` (Phase 08 §4.3), so switching is a URL
 * change rather than state — the selection survives a refresh and is
 * shareable.
 */
export function ProjectSwitcher({ compact = false }: { compact?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: projects = [] } = useProjects()
  const { ref, open, setOpen, close } = useMenu()

  const activeId = searchParams.get('projectId')
  const active = projects.find((project) => project.id === activeId)
  const label = active?.name ?? 'All projects'

  function select(projectId: string) {
    close()
    const next = new URLSearchParams(searchParams)
    if (projectId === ALL) {
      next.delete('projectId')
    } else {
      next.set('projectId', projectId)
    }
    setSearchParams(next)
  }

  const trigger =
    compact ? (
      <>
        <IconRepo className="w-3 h-3 text-faint" />
        <span className="text-[10px] text-fg truncate">{label}</span>
        <IconChevronDown className="w-2.5 h-2.5 text-faint ml-auto" />
      </>
    ) : (
      <>
        <IconRepo className="w-3.5 h-3.5 text-faint" />
        <span className="text-xs text-fg font-medium">{label}</span>
        <IconChevronDown className="w-3 h-3 text-faint" />
      </>
    )

  const triggerClasses = compact
    ? 'border border-line rounded bg-canvas px-2 py-1 flex items-center gap-1.5 w-full'
    : 'flex items-center gap-1.5 border border-line rounded-md pl-2 pr-1.5 py-1 bg-canvas hover:bg-subtle'

  const panelClasses = compact
    ? 'absolute left-0 top-full mt-1 w-64 border border-line rounded-md bg-canvas shadow-lg overflow-hidden z-10 text-xs'
    : 'absolute left-0 top-full mt-1 w-64 border border-line rounded-md bg-canvas shadow-lg overflow-hidden z-10 text-xs'

  return (
    <div ref={ref} className={`relative ${compact ? 'w-full' : 'ml-4'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch project"
        className={triggerClasses}
      >
        {trigger}
      </button>

      {open && (
        <div role="menu" className={panelClasses}>
          <div className="px-2.5 py-1.5 text-[10px] font-semibold text-faint uppercase tracking-wide bg-subtle border-b border-line">
            Scope
          </div>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={!activeId}
            onClick={() => select(ALL)}
            className={`w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-subtle ${
              activeId ? 'text-fg' : 'bg-subtle font-semibold text-accent'
            }`}
          >
            All projects
            {!activeId && <IconCheck className="w-3.5 h-3.5 text-accent" />}
          </button>

          <div className="border-t border-line">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                role="menuitemradio"
                aria-checked={project.id === activeId}
                onClick={() => select(project.id)}
                className={`w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-subtle ${
                  project.id === activeId ? 'bg-subtle font-semibold text-accent' : 'text-fg'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {project.color ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-none"
                      style={{ backgroundColor: project.color }}
                    />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-line flex-none" />
                  )}
                  <span className="truncate">{project.name}</span>
                {project.repository && (
                  <IconRepo className="w-3 h-3 text-faint flex-none" aria-label="GitHub linked" />
                )}
                </span>
                <span className="text-[10px] text-muted ml-2 flex-none">
                  {project.taskCount} tasks
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-line">
            <Link to="/projects" onClick={close} className="block px-2.5 py-1.5 text-accent hover:underline">
              Manage projects
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}