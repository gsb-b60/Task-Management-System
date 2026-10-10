import { formatDateOnly, formatProjectLabel } from '../../lib/format'
import { Markdown } from '../ui/Markdown'
import { useMenu } from '../layout/useMenu'
import type { ProjectListItem } from '../../api/types'
import { IconCalendar, IconDots, IconRepo } from '../ui/Icons'

interface ProjectCardProps {
  project: ProjectListItem
  onClick: () => void
  isSelected: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ProjectCard({ project, onClick, isSelected, onEdit, onDelete }: ProjectCardProps) {
  const { name, description, color, repository, startDate, targetDate, taskCount, completedTaskCount } = project
  const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0
  const { ref, open, setOpen, close } = useMenu()
  const hasMenu = onEdit !== undefined || onDelete !== undefined

  return (
    <div
      className={`
        relative border border-line rounded-md p-4 cursor-pointer bg-canvas transition-all duration-150
        ${isSelected ? 'ring-2 ring-accent border-accent' : 'hover:border-muted'}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {color && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fg">{formatProjectLabel(project.projectNumber, name)}</h3>
            {description && (
              <div className="text-xs text-muted mt-0.5 line-clamp-2">
                <Markdown text={description} className="text-xs text-muted" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-none">
          {repository && (
            <a
              href={`https://github.com/${repository.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold border border-info rounded-full bg-infobg text-info hover:bg-infobg/80"
            >
              <IconRepo className="w-3 h-3" />
              {repository.fullName}
            </a>
          )}
          {hasMenu && (
            <div ref={ref} className="relative">
              <button
                type="button"
                aria-label={`Project actions for ${name}`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(!open)
                }}
                className="p-2 rounded-md border border-line bg-subtle text-muted hover:text-fg hover:bg-inset"
              >
                <IconDots className="w-5 h-5" />
              </button>
              {open && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 w-36 border border-line rounded-md bg-canvas shadow-lg overflow-hidden z-10 text-xs py-1"
                >
                  {onEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation()
                        close()
                        onEdit()
                      }}
                      className="w-full px-3 py-1.5 text-left text-fg hover:bg-subtle"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation()
                        close()
                        onDelete()
                      }}
                      className="w-full px-3 py-1.5 text-left text-bad hover:bg-badbg font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between text-muted">
          <span>Tasks</span>
          <span className="font-mono text-fg">{completedTaskCount} / {taskCount}</span>
        </div>
        <div className="w-full bg-subtle rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-faint">
          <div className="flex items-center gap-1">
            <IconCalendar className="w-3 h-3" />
            <span>
              {startDate ? formatDateOnly(startDate) : '—'}
              {' '}
              →{' '}
              {targetDate ? formatDateOnly(targetDate) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}