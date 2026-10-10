import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextInput, Field } from '../ui/Input'
import { Button } from '../ui/Button'
import { toDateInputValue } from '../../lib/dateOnly'

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  initialValues?: Partial<ProjectFormValues>
  onSubmit: (values: ProjectFormValues) => void
  onClose?: () => void
  submitLabel: string
  isSubmitting?: boolean
}

export function ProjectForm({ initialValues, onSubmit, onClose, submitLabel, isSubmitting }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      ...initialValues,
      // Stored dates arrive as ISO datetimes; native date inputs need YYYY-MM-DD.
      startDate: toDateInputValue(initialValues?.startDate),
      targetDate: toDateInputValue(initialValues?.targetDate),
    },
  })

  const startDate = watch('startDate')
  const targetDate = watch('targetDate')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field
        label="Name"
        htmlFor="name"
        error={errors.name?.message}
      >
        <TextInput
          id="name"
          {...register('name')}
          placeholder="Project name"
          invalid={!!errors.name}
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

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Start date"
          htmlFor="startDate"
          error={errors.startDate?.message}
        >
          <TextInput
            id="startDate"
            type="date"
            {...register('startDate')}
            invalid={!!errors.startDate}
          />
        </Field>

        <Field
          label="Target date"
          htmlFor="targetDate"
          error={errors.targetDate?.message}
        >
          <TextInput
            id="targetDate"
            type="date"
            {...register('targetDate')}
            invalid={!!errors.targetDate}
          />
        </Field>
      </div>

      {(startDate && targetDate && startDate > targetDate) && (
        <p className="text-xs text-bad" role="alert">
          Target date must not be earlier than start date.
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