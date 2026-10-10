import { useState, useMemo } from 'react'
import { computeWindow, getTimeAxisTicks, getTodayPosition, type RoadmapScale } from '../../lib/roadmapScale'
import type { Task } from '../../api/types'

/**
 * Roadmap component for Phase 09
 * 
 * Displays a visual roadmap with:
 * - Time axis (weekly, monthly, quarterly)
 * - Status-based grouping
 * - Task bars showing start/due dates
 * - Today's position marker
 */
export function Roadmap({ tasks, initialScale = 'month' }: RoadmapProps) {
  const [scale, setScale] = useState<RoadmapScale>(initialScale)
  const [range, setRange] = useState<'current' | '30d' | '90d' | '180d' | '365d'>('90d')
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'project' | 'none'>('status')

  const roadmapWindow = useMemo(() => computeWindow(scale, new Date(), range), [scale, range])
  const todayPosition = useMemo(() => getTodayPosition(roadmapWindow), [roadmapWindow])

  const groups = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    tasks.forEach((task) => {
      let key = 'Other'
      if (groupBy === 'status') key = task.status
      else if (groupBy === 'priority') key = task.priority
      else if (groupBy === 'project') key = (task.projectId ?? 'Unassigned') as string
      (grouped[key] ??= []).push(task)
    })
    return grouped
  }, [tasks, groupBy])

  const scaleOptions: RoadmapScale[] = ['week', 'month', 'quarter']
  const rangeOptions = ['current', '30d', '90d', '180d', '365d'] as const
  const groupOptions = ['status', 'priority', 'project', 'none'] as const

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Scale:</span>
          <div className="flex gap-1">
            {scaleOptions.map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`px-3 py-1.5 text-xs rounded ${
                  scale === s ? 'bg-accent text-white' : 'bg-canvas text-fg hover:bg-subtle'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Range:</span>
          <div className="flex gap-1">
            {rangeOptions.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs rounded ${
                  range === r ? 'bg-accent text-white' : 'bg-canvas text-fg hover:bg-subtle'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Group by:</span>
          <div className="flex gap-1">
            {groupOptions.map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1.5 text-xs rounded ${
                  groupBy === g ? 'bg-accent text-white' : 'bg-canvas text-fg hover:bg-subtle'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time axis + Tasks */}
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: '1200px' }}>
          {/* Time axis header */}
          <div className="flex">
            <div className="w-48 flex-shrink-0 border-r border-line bg-subtle">
              <div className="px-3 py-2 text-xs font-semibold text-faint uppercase tracking-wide">
                Group
              </div>
            </div>
            <div className="flex-1 border-t border-line">
              <div className="flex" style={{ minWidth: '1200px' }}>
                {getTimeAxisTicks(roadmapWindow, scale).map((tick, index) => (
                  <div
                    key={index}
                    className={`border-b border-line ${tick.major ? 'border-line' : 'border-linesoft'}`}
                    style={{ flex: '0 0 auto', width: `${100 / getTimeAxisTicks(roadmapWindow, scale).length}%` }}
                  >
                    {tick.major && (
                      <div className="px-2 py-1 text-[10px] font-semibold text-faint">
                        {tick.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today line */}
          <div
            className="absolute top-0 bottom-0 z-10 w-0.5 bg-accent"
            style={{ left: `${todayPosition * 100}%` }}
          />
          <div
            className="absolute top-0 z-20 flex items-center gap-1 px-1 py-0.5 bg-accent text-white text-[10px] rounded"
            style={{ left: `calc(${todayPosition * 100}% - 20px)` }}
          >
            Today
          </div>

          {/* Task rows */}
          <div className="space-y-1">
            {Object.entries(groups).map(([groupName, groupTasks]) => (
              <div key={groupName} className="flex">
                <div className="w-48 flex-shrink-0 border-r border-line bg-subtle px-3 py-2">
                  <span className="text-xs font-medium text-fg">{groupName}</span>
                </div>
                <div className="flex-1 relative" style={{ minWidth: '1200px' }}>
                  {groupTasks.map((task) => {
                    const windowMs = roadmapWindow.end.getTime() - roadmapWindow.start.getTime()
                    let left = 0
                    let width = 2

                    // The wire format is a full ISO datetime; position bars by
                    // the calendar-date part as a local midnight.
                    const startOfLocalDay = (value: string): number =>
                      new Date(`${value.slice(0, 10)}T00:00:00`).getTime()

                    if (task.startDate && task.dueDate) {
                      const taskStart = startOfLocalDay(task.startDate)
                      const taskEnd = startOfLocalDay(task.dueDate)
                      left = Math.max(0, Math.min(100, ((taskStart - roadmapWindow.start.getTime()) / windowMs) * 100))
                      width = Math.max(2, Math.min(100, ((taskEnd - taskStart) / windowMs) * 100))
                    } else if (task.dueDate) {
                      const taskEnd = startOfLocalDay(task.dueDate)
                      left = Math.max(0, Math.min(100, ((taskEnd - roadmapWindow.start.getTime()) / windowMs) * 100))
                      width = 2
                    } else if (task.startDate) {
                      const taskStart = startOfLocalDay(task.startDate)
                      left = Math.max(0, Math.min(100, ((taskStart - roadmapWindow.start.getTime()) / windowMs) * 100))
                      width = Math.max(2, Math.min(100, ((roadmapWindow.end.getTime() - taskStart) / windowMs) * 100))
                    }

                    return (
                      <div
                        key={task.id}
                        className="absolute h-6 rounded cursor-pointer transition-all hover:shadow-md"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: task.status === 'DONE' ? '#28a745' : task.status === 'IN_PROGRESS' ? '#0366d6' : '#6a737d',
                          top: '4px',
                        }}
                        title={`${task.title} (${task.status})`}
                      >
                        <span className="text-[10px] text-white px-1 truncate block">
                          {task.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface RoadmapProps {
  tasks: Task[]
  initialScale?: RoadmapScale
}