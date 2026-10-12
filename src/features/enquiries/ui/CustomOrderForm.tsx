'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName, textareaClassName } from '@/components/ui/Field'
import { UaPhoneInput } from '@/components/ui/UaPhoneField'
import type { CustomOrderItemId } from '@/config/custom-order'
import { submitCustomOrderAction } from '@/features/enquiries/actions/enquiry-actions'
import { trackEvent } from '@/features/analytics'
import { cn } from '@/lib/utils'

export type CustomOrderItem = {
  readonly id: CustomOrderItemId
  readonly label: string
}

type CustomOrderFormProps = {
  readonly items: readonly CustomOrderItem[]
  // Chosen by the card the visitor came from, so the form opens on the thing
  // they were already looking at.
  readonly initialItem: CustomOrderItemId
  // The product page that sent them here, shown back to them and passed on
  // to the workshop.
  readonly fromProduct: string | null
}

export function CustomOrderForm({ items, initialItem, fromProduct }: CustomOrderFormProps) {
  const t = useTranslations('customOrderPage.form')
  const [item, setItem] = useState<CustomOrderItemId>(initialItem)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitCustomOrderAction({
        item,
        website: formData.get('website') || undefined,
        details: formData.get('details'),
        quantity: formData.get('quantity'),
        deadline: formData.get('deadline') || undefined,
        phone: formData.get('phone'),
        email: formData.get('email') || undefined,
        telegram: formData.get('telegram') || undefined,
        fromProduct: fromProduct ?? undefined,
      })

      if (!result.ok) {
        setError(result.error.code === 'RATE_LIMITED' ? t('rateLimited') : t('failed'))
        return
      }

      trackEvent({ name: 'generate_lead', leadType: 'custom_order' })
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
          <Link href="/shop">{t('sentCta')}</Link>
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

      <fieldset className="mb-5">
        <legend className="mb-3 text-[12.5px] font-semibold text-muted">{t('whatToSew')}</legend>
        <div className="flex flex-wrap gap-2">
          {items.map((entry) => (
            <label
              key={entry.id}
              className={cn(
                'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control border-[1.5px] px-3.5 text-[13px] font-semibold text-ink transition-colors',
                entry.id === item
                  ? 'border-accent bg-accent-tint'
                  : 'border-subtle bg-raised hover:border-accent',
              )}
            >
              <input
                type="radio"
                name="item"
                value={entry.id}
                checked={entry.id === item}
                onChange={() => setItem(entry.id)}
                className="size-3.5 accent-accent"
              />
              {entry.label}
            </label>
          ))}
        </div>
      </fieldset>

      {fromProduct ? (
        <p className="mb-5 rounded-card border border-subtle bg-sunken px-4 py-3 text-[12.5px] text-muted">
          {t('fromProduct', { product: fromProduct })}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('details')} className="sm:col-span-2">
          <textarea
            name="details"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder={t('detailsPlaceholder')}
            className={textareaClassName}
          />
        </Field>
        <Field label={t('quantity')}>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            defaultValue={1}
            required
            className={inputClassName}
          />
        </Field>
        <Field label={t('deadline')}>
          <input
            name="deadline"
            maxLength={80}
            placeholder={t('deadlinePlaceholder')}
            className={inputClassName}
          />
        </Field>
        <Field label={t('phone')}>
          <UaPhoneInput name="phone" isRequired />
        </Field>
        <Field label={t('contactOptional')}>
          <input
            name="email"
            type="email"
            maxLength={200}
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClassName}
          />
        </Field>
        <Field label={t('telegramOptional')} className="sm:col-span-2">
          <input name="telegram" maxLength={80} placeholder="@handle" className={inputClassName} />
        </Field>
      </div>

      {error ? <p className="mt-4 text-[13px] font-medium text-alert">{error}</p> : null}

      <Button type="submit" size="lg" className="mt-5" disabled={isPending}>
        {isPending ? t('sending') : t('send')}
      </Button>
      <p className="mt-3 text-[12.5px] leading-relaxed text-faint">{t('promise')}</p>
    </form>
  )
}
