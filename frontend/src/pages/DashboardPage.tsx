import { useSearchParams } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import { useProjects } from '../hooks/useProjects'
import { dueLabel, errorMessage, formatDateOnly } from '../lib/format'
import type { TaskPriority, TaskStatus, TaskSummary } from '../api/types'
import { IconCalendar, IconRetry } from '../components/ui/Icons'

const TILE = 'border border-line rounded-md p-3'
const TILE_LABEL =
  'flex items-center gap-1.5 text-[10px] font-semibold text-faint uppercase tracking-wide'
const TILE_VALUE = 'text-2xl font-semibold text-fg mt-1.5'

const STATUS_STYLE: Record<TaskStatus, { pill: string; dot: string }> = {
  TODO: { pill: 'border border-line rounded-full bg-subtle text-muted', dot: 'bg-faint' },
  IN_PROGRESS: { pill: 'border border-info rounded-full bg-infobg text-info', dot: 'bg-info' },
  DONE: { pill: 'border border-ok rounded-full bg-okbg text-ok', dot: 'bg-ok' },
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: 'border border-line rounded-full bg-subtle text-muted',
  MEDIUM: 'border border-warn rounded-full bg-warnbg text-warn',
  HIGH: 'border border-bad rounded-full bg-badbg text-bad',
}

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined
  const { data, isPending, isError, error, refetch } = useDashboard(projectId)
  const { data: projects = [] } = useProjects()

  const project = projects.find((item) => item.id === projectId)

  return (
    <div>
      {project && (
        <span className="border border-line rounded bg-subtle text-[10px] text-muted px-2 py-1 font-mono mb-2 inline-block">
          ?projectId={project.id}
        </span>
      )}

      <h1 className="text-lg font-semibold text-fg">{project ? project.name : 'Dashboard'}</h1>
      <p className="text-xs text-muted mt-1">
        {project
          ? `Counts for ${project.name} only.`
          : 'Every task you own, across all projects.'}
      </p>

      {isPending && <DashboardSkeleton />}

      {isError && (
        <div className="mt-4 border border-bad rounded-md bg-badbg px-4 py-5 text-center">
          <h2 className="mt-2.5 text-sm font-semibold text-fg">Could not load the dashboard</h2>
          <p className="text-xs text-muted mt-1">{errorMessage(error, 'Please try again.')}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 border border-line rounded-md px-3 py-1.5 text-xs font-medium text-fg bg-canvas hover:bg-subtle inline-flex items-center gap-1.5"
          >
            <IconRetry className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {data.stats.total === 0 ? (
            <div className="mt-4 border border-line rounded-md px-4 py-8 text-center">
              <h2 className="mt-2.5 text-sm font-semibold text-fg">No tasks yet</h2>
              <p className="text-xs text-muted mt-1">
                {project
                  ? `${project.name} has no tasks yet.`
                  : 'Create your first task and it will appear here.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Total" value={data.stats.total} sub="all statuses" />
                <StatTile
                  label="Todo"
                  value={data.stats.byStatus.TODO}
                  sub="byStatus.TODO"
                  dot="bg-faint"
                />
                <StatTile
                  label="In progress"
                  value={data.stats.byStatus.IN_PROGRESS}
                  sub="byStatus.IN_PROGRESS"
                  dot="bg-info"
                />
                <StatTile label="Done" value={data.stats.byStatus.DONE} sub="byStatus.DONE" dot="bg-ok" />
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AlertTile
                  label="Overdue"
                  value={data.stats.overdue}
                  tone={data.stats.overdue > 0 ? 'bad' : 'muted'}
                  hint="Past the due date and not done"
                />
                <AlertTile
                  label="Due today"
                  value={data.stats.dueToday}
                  tone={data.stats.dueToday > 0 ? 'warn' : 'muted'}
                  hint="daysUntilDue = 0, server-computed"
                />
              </div>

              <UpcomingPanel tasks={data.upcoming} />
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  sub,
  dot,
}: {
  label: string
  value: number
  sub: string
  dot?: string
}) {
  return (
    <div className={TILE}>
      <div className={TILE_LABEL}>
        {dot && <span className={`w-2 h-2 rounded-full flex-none ${dot}`} />}
        {label}
      </div>
      {/* Absent counts render 0, never blank. */}
      <div className={TILE_VALUE}>{value}</div>
      <div className="text-[10px] text-faint mt-0.5">{sub}</div>
    </div>
  )
}

function AlertTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: number
  tone: 'bad' | 'warn' | 'muted'
  hint: string
}) {
  const tones = {
    bad: 'border-bad bg-badbg',
    warn: 'border-warn bg-warnbg',
    muted: 'border-line bg-canvas',
  }
  const labelTones = { bad: 'text-bad', warn: 'text-warn', muted: 'text-faint' }
  const valueTones = { bad: 'text-bad', warn: 'text-warn', muted: 'text-muted' }

  return (
    <div className={`border rounded-md px-3 py-2.5 flex items-center gap-2.5 ${tones[tone]}`}>
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-wide ${labelTones[tone]}`}>
          {label}
        </div>
        <div className={`text-lg font-semibold leading-tight ${valueTones[tone]}`}>{value}</div>
      </div>
      <span className="text-[10px] text-faint ml-auto text-right">{hint}</span>
    </div>
  )
}

function UpcomingPanel({ tasks }: { tasks: TaskSummary[] }) {
  return (
    <div className="mt-4 border border-line rounded-md">
      <div className="px-4 py-2.5 border-b border-line bg-subtle">
        <h2 className="text-xs font-semibold text-fg">Upcoming</h2>
      </div>

      {tasks.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-muted">Nothing due. Enjoy the quiet.</p>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-faint">
            <tr className="text-left">
              <th className="px-4 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Task</th>
              <th className="px-2 py-2 font-semibold">Priority</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold text-right">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-subtle">
                <td className="px-4 py-2 font-mono text-[10px] text-faint">
                  {task.id.slice(-4)}
                </td>
                <td className="px-2 py-2 text-fg font-medium">{task.title}</td>
                <td className="px-2 py-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[task.priority]}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[task.status].pill}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[task.status].dot}`} />
                    {task.status === 'IN_PROGRESS' ? 'In progress' : task.status === 'TODO' ? 'Todo' : 'Done'}
                  </span>
                </td>
                <td
                  className={`px-4 py-2 text-right ${
                    task.isOverdue ? 'text-bad font-semibold' : 'text-muted'
                  }`}
                >
                  {/* Verbatim from the server — never recomputed from the browser clock. */}
                  <span className="inline-flex items-center gap-1">
                    <IconCalendar className="w-3 h-3" />
                    {formatDateOnly(task.dueDate)}
                    <span className="text-[10px]">{dueLabel(task.daysUntilDue)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** Loading renders skeleton rows, never a spinner. */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={TILE}>
            <div className="skeleton h-2 w-16" />
            <div className="skeleton h-6 w-10 mt-2" />
            <div className="skeleton h-2 w-20 mt-2" />
          </div>
        ))}
      </div>
      <div className="mt-4 border border-line rounded-md divide-y">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="px-4 py-3 flex items-center gap-3">
            <div className="skeleton h-2.5 w-8" />
            <div className="skeleton h-2.5 flex-1" />
            <div className="skeleton h-2.5 w-12" />
            <div className="skeleton h-2.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}