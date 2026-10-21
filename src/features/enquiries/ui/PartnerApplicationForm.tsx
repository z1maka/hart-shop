'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName, textareaClassName } from '@/components/ui/Field'
import { UaPhoneInput } from '@/components/ui/UaPhoneField'
import type { PartnerModelId } from '@/config/partners'
import { submitPartnerApplicationAction } from '@/features/enquiries/actions/enquiry-actions'
import { cn } from '@/lib/utils'

export type PartnerModelOption = {
  readonly id: PartnerModelId
  readonly label: string
}

type PartnerApplicationFormProps = {
  readonly models: readonly PartnerModelOption[]
}

const INITIAL_MODEL: PartnerModelId = 'undecided'

// Not reported as a lead: the ad platforms optimise for buyers, and a maker's
// application counted as one would teach them to find more makers.
export function PartnerApplicationForm({ models }: PartnerApplicationFormProps) {
  const t = useTranslations('partnersPage.form')
  const [model, setModel] = useState<PartnerModelId>(INITIAL_MODEL)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitPartnerApplicationAction({
        model,
        website: formData.get('website') || undefined,
        company: formData.get('company'),
        taxId: formData.get('taxId') || undefined,
        contactName: formData.get('contactName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        products: formData.get('products'),
        links: formData.get('links') || undefined,
      })

      if (!result.ok) {
        setError(result.error.code === 'RATE_LIMITED' ? t('rateLimited') : t('failed'))
        return
      }

      setIsSent(true)
    })
  }

  if (isSent) {
    return (
      <div className="rounded-card border border-accent-mid bg-accent-tint p-8">
        <p className="mb-2 text-[12.5px] font-semibold tracking-[0.05em] text-accent uppercase">
          {t('sentKicker')}
        </p>
        <h2 className="mb-3 font-display text-h3 font-bold text-ink">{t('sentTitle')}</h2>
        <p className="mb-6 max-w-[56ch] text-[14px] leading-relaxed text-muted">{t('sentBody')}</p>
        <Button asChild>
          <Link href="/shop/">{t('sentCta')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      action={handleSubmit}
      className="relative rounded-card border border-subtle bg-surface p-6"
    >
      <div aria-hidden="true" className="absolute top-auto -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('company')}>
          <input
            name="company"
            required
            minLength={2}
            maxLength={200}
            autoComplete="organization"
            className={inputClassName}
          />
        </Field>
        <Field label={t('taxIdOptional')}>
          <input
            name="taxId"
            inputMode="numeric"
            maxLength={14}
            pattern="[\d ]{8,14}"
            className={inputClassName}
          />
        </Field>
        <Field label={t('contactName')}>
          <input
            name="contactName"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className={inputClassName}
          />
        </Field>
        <Field label={t('phone')}>
          <UaPhoneInput name="phone" isRequired />
        </Field>
        <Field label={t('email')} className="sm:col-span-2">
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
        <Field label={t('products')} className="sm:col-span-2">
          <textarea
            name="products"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder={t('productsPlaceholder')}
            className={textareaClassName}
          />
        </Field>
        <Field label={t('linksOptional')} className="sm:col-span-2">
          <input
            name="links"
            maxLength={500}
            placeholder={t('linksPlaceholder')}
            className={inputClassName}
          />
        </Field>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-3 text-[12.5px] font-semibold text-muted">{t('modelLegend')}</legend>
        <div className="flex flex-wrap gap-2">
          {models.map((option) => (
            <label
              key={option.id}
              className={cn(
                'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control border-[1.5px] px-3.5 text-[13px] font-semibold text-ink transition-colors',
                option.id === model
                  ? 'border-accent bg-accent-tint'
                  : 'border-subtle bg-raised hover:border-accent',
              )}
            >
              <input
                type="radio"
                name="model"
                value={option.id}
                checked={option.id === model}
                onChange={() => setModel(option.id)}
                className="size-3.5 accent-accent"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? <p className="mt-4 text-[13px] font-medium text-alert">{error}</p> : null}

      <Button type="submit" size="lg" className="mt-5" disabled={isPending}>
        {isPending ? t('sending') : t('send')}
      </Button>
      <p className="mt-3 text-[12.5px] leading-relaxed text-faint">{t('promise')}</p>
    </form>
  )
}
