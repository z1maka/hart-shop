'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { signInAction } from '@/features/admin/actions/auth-actions'
import { errorText } from '@/features/admin/ui/messages'

export function SignInForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signInAction({
        email: formData.get('email'),
        password: formData.get('password'),
      })

      // A successful sign-in redirects, so reaching here always means failure.
      if (!result || result.ok) return

      // Here UNAUTHORIZED means the pair was rejected, not that a session ran
      // out — the shared dictionary would say the wrong thing.
      setError(
        result.error.code === 'UNAUTHORIZED'
          ? 'Неверная почта или пароль.'
          : errorText(result.error),
      )
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
        Почта
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="min-h-11 rounded-control border-[1.5px] border-strong bg-raised px-3.5 text-[14px] font-normal text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
        Пароль
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 rounded-control border-[1.5px] border-strong bg-raised px-3.5 text-[14px] font-normal text-ink"
        />
      </label>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Входим…' : 'Войти'}
      </Button>

      {error ? <p className="text-[13px] font-medium text-alert">{error}</p> : null}
    </form>
  )
}
