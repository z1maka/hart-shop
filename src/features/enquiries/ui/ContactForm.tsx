'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName, textareaClassName } from '@/components/ui/Field'
import { UaPhoneInput } from '@/components/ui/UaPhoneField'
import type { ContactTopic } from '@/config/contact'
import { submitContactMessageAction } from '@/features/enquiries/actions/enquiry-actions'
import { trackEvent } from '@/features/analytics'
import { cn } from '@/lib/utils'

type ContactFormProps = {
  readonly topics: readonly ContactTopic[]
  readonly initialTopic: string
}

export function ContactForm({ topics, initialTopic }: ContactFormProps) {
  const t = useTranslations('contact.form')
  const [topic, setTopic] = useState(initialTopic)
  const selectedTopic = topics.find((entry) => entry.id === topic)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitContactMessageAction({
        topic,
        website: formData.get('website') || undefined,
        email: formData.get('email'),
        phone: formData.get('phone') || undefined,
        telegram: formData.get('telegram') || undefined,
        message: formData.get('message'),
      })

      if (!result.ok) {
        setError(result.error.code === 'RATE_LIMITED' ? t('rateLimited') : result.error.message)
        return
      }

      trackEvent({ name: 'generate_lead', leadType: 'contact' })
      setIsSent(true)
    })
  }

  if (isSent) {
    return (
      <div className="rounded-card border border-subtle bg-surface p-8">
        <p className="mb-2 font-display text-[12.5px] font-semibold tracking-[0.12em] text-khaki-ink">
          {t('sentKicker')}
        </p>
        <h2 className="mb-3 font-display text-h3 font-bold text-ink">{t('sentTitle')}</h2>
        <p className="mb-6 max-w-[60ch] text-[14px] leading-relaxed text-muted">{t('sentBody')}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/shop/">{t('backToShop')}</Link>
          </Button>
          <Button variant="quiet" onClick={() => setIsSent(false)}>
            {t('sendAnother')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      action={handleSubmit}
      className="relative rounded-card border border-subtle bg-raised p-6"
    >
      <div
        aria-hidden="true"
        className="absolute top-auto -left-[9999px] h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <fieldset className="mb-5">
        <legend className="mb-3 font-display text-[16px] font-semibold tracking-[0.08em] text-ink">
          {t('whatAbout')}
        </legend>
        {/* Compact choices; the explanation shows for the chosen topic only,
            so five topics no longer read as five paragraphs. */}
        <div className="flex flex-wrap gap-2">
          {topics.map((entry) => (
            <label
              key={entry.id}
              className={cn(
                'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control border-[1.5px] px-3.5 text-[13px] text-ink transition-colors',
                entry.id === topic
                  ? 'border-accent bg-accent-tint font-extrabold'
                  : 'border-subtle bg-raised font-semibold hover:border-strong',
              )}
            >
              <input
                type="radio"
                name="topic"
                value={entry.id}
                checked={entry.id === topic}
                onChange={() => setTopic(entry.id)}
                className="size-3.5 accent-accent"
              />
              {entry.label}
            </label>
          ))}
        </div>
        {selectedTopic ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{selectedTopic.detail}</p>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('email')}>
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClassName}
          />
        </Field>
        <Field label={t('phoneOptional')}>
          <UaPhoneInput name="phone" />
        </Field>
        <Field label={t('telegramOptional')} className="sm:col-span-2">
          <input name="telegram" maxLength={80} placeholder="@handle" className={inputClassName} />
        </Field>
        <Field label={t('yourMessage')} className="sm:col-span-2">
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={4000}
            placeholder={t('messagePlaceholder')}
            className={textareaClassName}
          />
        </Field>
      </div>

      {error ? <p className="mt-4 text-[13px] font-medium text-alert">{error}</p> : null}

      <Button type="submit" size="lg" className="mt-5" disabled={isPending}>
        {t('send')}
      </Button>
    </form>
  )
}
