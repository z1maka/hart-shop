'use client'

import { useId, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName, textareaClassName } from '@/components/ui/Field'
import { UaPhoneInput } from '@/components/ui/UaPhoneField'
import { submitReviewAction } from '@/features/reviews/actions/review-actions'
import { MAX_RATING } from '@/features/reviews/model/review-summary'
import { MAX_BODY_LENGTH, MIN_BODY_LENGTH } from '@/features/reviews/model/review-body'
import { cn } from '@/lib/utils'

const STAR_POSITIONS = Array.from({ length: MAX_RATING }, (_, index) => index + 1)

type ReviewFormProps = {
  readonly productSlug: string
}

export function ReviewForm({ productSlug }: ReviewFormProps) {
  const t = useTranslations('reviews.form')
  const ratingId = useId()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [body, setBody] = useState('')
  // Held in state, not read off the form: the form action resets plain
  // inputs after it runs, and a missing rating must not cost the name.
  const [authorName, setAuthorName] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const missingChars = Math.max(0, MIN_BODY_LENGTH - body.trim().length)

  function handleSubmit(formData: FormData) {
    if (rating === 0) {
      setError(t('errors.rating'))
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitReviewAction({
        productSlug,
        rating,
        body,
        authorName,
        phone: formData.get('phone') || undefined,
        website: formData.get('website') || undefined,
      })

      if (!result.ok) {
        setError(result.error.code === 'RATE_LIMITED' ? t('errors.rateLimited') : t('errors.failed'))
        return
      }
      setIsSent(true)
    })
  }

  if (isSent) {
    return (
      <div className="rounded-card border border-subtle bg-surface p-5.5">
        <h3 className="mb-2 font-display text-[20px] font-bold tracking-[0.04em] text-ink">
          {t('sentTitle')}
        </h3>
        <p className="text-[13.5px] leading-relaxed text-muted">{t('sentBody')}</p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-card border border-subtle bg-surface p-5.5">
      <h3 className="mb-1.5 font-display text-[20px] font-bold tracking-[0.04em] text-ink">
        {t('title')}
      </h3>
      <p className="mb-5 text-[13px] leading-relaxed text-muted">{t('lead')}</p>

      <div className="mb-4">
        <span id={ratingId} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          {t('rating')}
        </span>
        <div role="radiogroup" aria-labelledby={ratingId} className="flex items-center gap-1">
          {STAR_POSITIONS.map((position) => (
            <button
              key={position}
              type="button"
              role="radio"
              aria-checked={rating === position}
              aria-label={String(position)}
              onClick={() => setRating(position)}
              onMouseEnter={() => setHovered(position)}
              onMouseLeave={() => setHovered(0)}
              className={cn(
                'size-10 rounded-control border text-[20px] leading-none transition-colors',
                position <= (hovered || rating)
                  ? 'border-khaki-mark bg-khaki/15 text-khaki-ink'
                  : 'border-subtle bg-raised text-strong hover:border-khaki-mark',
              )}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-[12px] text-faint">{rating === 0 ? t('ratingHint') : null}</span>
        </div>
      </div>

      <Field label={t('body')} className="mb-4">
        <textarea
          name="body"
          required
          minLength={MIN_BODY_LENGTH}
          maxLength={MAX_BODY_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('bodyPlaceholder')}
          className={textareaClassName}
        />
        <span className="text-[11.5px] text-faint">
          {missingChars > 0 ? t('bodyHint', { count: missingChars }) : t('bodyReady')}
        </span>
      </Field>

      <Field label={t('name')} className="mb-4">
        <input
          name="authorName"
          required
          minLength={2}
          maxLength={60}
          autoComplete="nickname"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder={t('namePlaceholder')}
          className={inputClassName}
        />
      </Field>

      <Field label={`${t('phone')} (${t('phoneOptional')})`} className="mb-1.5">
        <UaPhoneInput name="phone" />
      </Field>
      <p className="mb-5 text-[11.5px] leading-relaxed text-faint">{t('phoneNote')}</p>

      {/* The honeypot: hidden from people, filled by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {error ? <p className="mb-3 text-[13px] font-semibold text-alert">{error}</p> : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? t('submitting') : t('submit')}
      </Button>
      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">{t('footnote')}</p>
    </form>
  )
}
