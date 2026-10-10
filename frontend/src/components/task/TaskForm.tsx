import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextInput, Field } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { IconPlus } from '../ui/Icons'
import { toDateTimeInputValue } from '../../lib/dateOnly'
import { formatProjectLabel } from '../../lib/format'
import { useCreateProject } from '../../hooks/useProjectMutations'
import type { ProjectListItem } from '../../api/types'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
})

export type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>
  onSubmit: (values: TaskFormValues) => void
  onClose?: () => void
  submitLabel: string
  isSubmitting?: boolean
  projects?: ProjectListItem[]
}

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

export function TaskForm({ initialValues, onSubmit, onClose, submitLabel, isSubmitting, projects = [] }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      projectId: null,
      ...initialValues,
      // Stored datetimes need YYYY-MM-DDTHH:mm for native datetime inputs.
      startDate: toDateTimeInputValue(initialValues?.startDate),
      dueDate: toDateTimeInputValue(initialValues?.dueDate),
    },
  })
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [createdProjects, setCreatedProjects] = useState<{ id: string; name: string; projectNumber: number }[]>([])
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)
  const createProject = useCreateProject()

  const handleQuickCreateProject = async () => {
    const name = newProjectName.trim()
    if (!name || createProject.isPending) return
    const created = await createProject.mutateAsync({ name })
    // Listed locally so the option exists even before the parent's
    // project list refetches via query invalidation.
    setCreatedProjects((prev) =>
      prev.some((p) => p.id === created.id) ? prev : [...prev, created],
    )
    setPendingProjectId(created.id)
    setNewProjectName('')
    setIsCreatingProject(false)
  }

  const dueDate = watch('dueDate')
  const startDate = watch('startDate')

  const allProjects: { id: string; name: string; projectNumber: number }[] = [...projects]
  for (const p of createdProjects) {
    if (!allProjects.some((item) => item.id === p.id)) allProjects.push(p)
  }
  const projectOptions = [
    { value: '', label: 'No project' },
    ...allProjects.map((p) => ({ value: p.id, label: formatProjectLabel(p.projectNumber, p.name) })),
  ]

  // Select the quick-created project once its option is rendered —
  // setting a select value with no matching option is dropped by the DOM.
  useEffect(() => {
    if (pendingProjectId && allProjects.some((p) => p.id === pendingProjectId)) {
      setValue('projectId', pendingProjectId, { shouldDirty: true })
      setPendingProjectId(null)
    }
  }, [pendingProjectId, projects, createdProjects, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field
        label="Title"
        htmlFor="title"
        error={errors.title?.message}
      >
        <TextInput
          id="title"
          {...register('title')}
          placeholder="Task title"
          invalid={!!errors.title}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        error={errors.description?.message}
      >
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className={`
            w-full px-2.5 py-1.5 text-sm border border-line rounded-md bg-canvas text-fg
            placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
            ${errors.description ? 'border-bad' : ''}
          `}
          placeholder="Optional description"
        />
      </Field>

      <Field
        label="Project"
        htmlFor="projectId"
        error={errors.projectId?.message}
        labelAside={
          <button
            type="button"
            onClick={() => setIsCreatingProject((open) => !open)}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
          >
            <IconPlus className="w-3 h-3" />
            New
          </button>
        }
      >
        <Select
          id="projectId"
          options={projectOptions}
          {...register('projectId')}
        />
      </Field>

      {isCreatingProject && (
        <div className="border border-line rounded-md p-2.5 bg-subtle space-y-2">
          <TextInput
            id="new-project-name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleQuickCreateProject()
              }
            }}
            placeholder="New project name"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsCreatingProject(false)
                setNewProjectName('')
              }}
              disabled={createProject.isPending}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => void handleQuickCreateProject()}
              disabled={!newProjectName.trim() || createProject.isPending}
            >
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-fg mb-1">
            Status
          </label>
          <Select
            id="status"
            options={STATUS_OPTIONS}
            {...register('status')}
          />
        </div>

        <div>
          <label htmlFor="priority" className="block text-xs font-medium text-fg mb-1">
            Priority
          </label>
          <Select
            id="priority"
            options={PRIORITY_OPTIONS}
            {...register('priority')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Start date"
          htmlFor="startDate"
          error={errors.startDate?.message}
        >
          <TextInput
            id="startDate"
            type="datetime-local"
            {...register('startDate')}
            invalid={!!errors.startDate}
          />
        </Field>

        <Field
          label="Due date"
          htmlFor="dueDate"
          error={errors.dueDate?.message}
        >
          <TextInput
            id="dueDate"
            type="datetime-local"
            {...register('dueDate')}
            invalid={!!errors.dueDate}
          />
        </Field>
      </div>

      {(startDate && dueDate && startDate > dueDate) && (
        <p className="text-xs text-bad" role="alert">
          Due date must not be earlier than start date.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}