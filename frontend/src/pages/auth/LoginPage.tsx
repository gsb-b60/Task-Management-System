import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi, isApiError } from '../../api'
import { CenteredPanel } from '../../components/layout/CenteredPanel'
import { Alert } from '../../components/ui/Alert'
import { BrandMark } from '../../components/ui/BrandMark'
import { Button } from '../../components/ui/Button'
import { Divider } from '../../components/ui/Divider'
import { Field, TextInput } from '../../components/ui/Input'
import { IconArrowRight, IconGithub } from '../../components/ui/Icons'
import { useAuth } from '../../contexts/auth-context'
import { redirectFromSearch } from '../../lib/redirect'
import { loginSchema } from '../../lib/validation/schemas'
import type { LoginValues } from '../../lib/validation/schemas'

type Banner = { kind: 'error' | 'warning'; title?: string; body: string }

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [banner, setBanner] = useState<Banner | null>(null)

  const redirectTo = redirectFromSearch(searchParams.toString())

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    setBanner(null)
    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (!isApiError(error)) {
        setBanner({ kind: 'error', body: 'Could not sign you in. Please try again.' })
        return
      }

      if (error.code === 'UNAUTHENTICATED') {
        // Deliberately form-level and field-agnostic. The 401 is identical for
        // an unknown account and a wrong password, so marking either field
        // would leak which one was wrong.
        setBanner({
          kind: 'error',
          title: 'Invalid email or password.',
          body: 'Neither field is marked — the message never reveals which one was wrong.',
        })
        return
      }

      if (error.code === 'RATE_LIMITED') {
        setBanner({
          kind: 'warning',
          title: 'Too many attempts.',
          body: error.details[0]?.message ?? 'Try again shortly.',
        })
        return
      }

      if (error.code === 'VALIDATION_ERROR' && error.details.length > 0) {
        setBanner({ kind: 'error', title: error.message, body: 'Check the fields and try again.' })
        return
      }

      setBanner({ kind: 'error', title: error.message, body: 'Please try again.' })
    }
  }

  return (
    <CenteredPanel>
      <div className="flex flex-col items-center text-center">
        <BrandMark size="md" />
        <h1 className="mt-3 text-xl font-semibold text-fg">Sign in to your account</h1>
        <p className="text-sm text-muted mt-1">
          {redirectTo === '/dashboard'
            ? 'Track projects, tasks and GitHub issues in one place.'
            : "You'll be returned to the page you requested."}
        </p>
      </div>

      {redirectTo !== '/dashboard' && (
        <Alert kind="info" className="mt-4 mb-4">
          <span className="inline-flex items-center gap-2">
            Continuing to <span className="font-mono text-fg">{redirectTo}</span>
            <IconArrowRight className="w-3 h-3 flex-none" />
          </span>
        </Alert>
      )}

      {banner && (
        <Alert kind={banner.kind} title={banner.title} className="mt-4 mb-4">
          {banner.body}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            placeholder="you@example.com"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          labelAside={<span className="text-[11px] text-faint">password reset deferred</span>}
        >
          <TextInput
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>

        <Button type="submit" loading={isSubmitting} loadingLabel="Signing in…" className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <Divider />

      <a
        href={authApi.githubAuthorizeUrl()}
        className="w-full border border-line rounded-md px-4 py-2 text-sm font-medium text-fg bg-canvas hover:bg-subtle flex items-center justify-center gap-2"
      >
        <IconGithub className="w-4 h-4" />
        Continue with GitHub
      </a>

      <p className="text-center text-sm text-muted mt-5">
        New to Task Stream?{' '}
        <Link to="/register" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </CenteredPanel>
  )
}