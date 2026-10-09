import { formatDateOnly } from '../../lib/format'
import type { ProjectListItem } from '../../api/types'
import { IconCalendar, IconRepo } from '../ui/Icons'

interface ProjectCardProps {
  project: ProjectListItem
  onClick: () => void
  isSelected: boolean
}

export function ProjectCard({ project, onClick, isSelected }: ProjectCardProps) {
  const { name, description, color, repository, startDate, targetDate, taskCount, completedTaskCount } = project
  const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0

  return (
    <div
      className={`
        border border-line rounded-md p-4 cursor-pointer bg-canvas transition-all duration-150
        ${isSelected ? 'ring-2 ring-accent border-accent' : 'hover:border-muted'}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {color && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <div>
            <h3 className="text-sm font-semibold text-fg">{name}</h3>
            {description && (
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
        </div>
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