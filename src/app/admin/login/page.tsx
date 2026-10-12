import type { Metadata } from 'next'
import { SignInForm } from '@/features/admin'

export const metadata: Metadata = {
  title: 'Вход',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-card border border-subtle bg-surface p-7">
        <h1 className="mb-1.5 font-display text-h3 font-bold text-ink">FOX Admin</h1>
        <p className="mb-6 text-[13px] text-muted">Доступ только для персонала.</p>
        <SignInForm />
      </div>
    </div>
  )
}
