import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi, isApiError } from '../../api'
import type { ApiErrorDetail } from '../../api/types'
import { CenteredPanel } from '../../components/layout/CenteredPanel'
import { Alert } from '../../components/ui/Alert'
import { BrandMark } from '../../components/ui/BrandMark'
import { Button } from '../../components/ui/Button'
import { Divider, PasswordStrength } from '../../components/ui/Divider'
import { Field, TextInput } from '../../components/ui/Input'
import { IconGithub } from '../../components/ui/Icons'
import { useAuth } from '../../contexts/auth-context'
import { redirectFromSearch } from '../../lib/redirect'
import { passwordStrength, registerSchema } from '../../lib/validation/schemas'
import type { RegisterValues } from '../../lib/validation/schemas'

export function RegisterPage() {
  const { register: signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [formError, setFormError] = useState<{ title: string; body: string } | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
    defaultValues: { displayName: '', email: '', password: '' },
  })

  // useWatch subscribes to one field rather than re-rendering on every keystroke
  // anywhere in the form.
  const password = useWatch({ control, name: 'password' })
  const strength = passwordStrength(password ?? '')

  async function onSubmit(values: RegisterValues) {
    setFormError(null)
    try {
      await signUp({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      })
      navigate(redirectFromSearch(searchParams.toString()), { replace: true })
    } catch (error) {
      if (!isApiError(error)) {
        setFormError({ title: 'Could not create your account', body: 'Please try again.' })
        return
      }

      if (error.code === 'CONFLICT') {
        // Branch on the code, never on message text.
        setError('email', { message: error.fieldError('email') ?? error.message })
        setFormError({
          title: 'Email is already in use.',
          body: 'Try signing in instead, or reset the password.',
        })
        return
      }

      if (error.code === 'VALIDATION_ERROR' && error.details.length > 0) {
        // The server is the authority; its details[] always win.
        applyServerErrors(error.details, setError)
        return
      }

      setFormError({ title: error.message, body: 'Please try again.' })
    }
  }

  return (
    <CenteredPanel>
      <div className="flex flex-col items-center text-center">
        <BrandMark size="md" />
        <h1 className="mt-3 text-xl font-semibold text-fg">Create your account</h1>
        <p className="text-sm text-muted mt-1">
          Track projects, tasks and GitHub issues in one place.
        </p>
      </div>

      {formError && (
        <Alert kind="error" title={formError.title} className="mt-5 mb-4">
          {formError.body}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
        <Field label="Name" htmlFor="displayName" error={errors.displayName?.message} helper="2 – 60 characters.">
          <TextInput
            id="displayName"
            autoComplete="name"
            placeholder="Ada Lovelace"
            invalid={Boolean(errors.displayName)}
            {...register('displayName')}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ada@example.com"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {strength.label && <PasswordStrength score={strength.score} label={strength.label} />}
        </Field>

        <Button type="submit" loading={isSubmitting} loadingLabel="Creating account…" className="mt-2">
          Create account
        </Button>
      </form>

      <Divider />

      {/* A real navigation, not a form post — the backend owns the OAuth hop. */}
      <a
        href={authApi.githubAuthorizeUrl()}
        className="w-full border border-line rounded-md px-4 py-2 text-sm font-medium text-fg bg-canvas hover:bg-subtle flex items-center justify-center gap-2"
      >
        <IconGithub className="w-4 h-4" />
        Continue with GitHub
      </a>

      <p className="text-center text-sm text-muted mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </CenteredPanel>
  )
}

/**
 * Routes each `details[]` entry to its field. A null `field` means a whole-body
 * problem, which cannot be shown against an input.
 */
function applyServerErrors(
  details: ApiErrorDetail[],
  setError: UseFormSetError<RegisterValues>,
) {
  for (const detail of details) {
    if (detail.field === 'displayName' || detail.field === 'email' || detail.field === 'password') {
      setError(detail.field, { message: detail.message })
    }
  }
}