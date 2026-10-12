'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ReviewStatus } from '@/db/enums'
import { moderateReviewAction, replyToReviewAction } from '@/features/admin/actions/review-actions'
import { errorText } from '@/features/admin/ui/messages'
import type { ActionResult } from '@/lib/action-result'
import { cn } from '@/lib/utils'

type ReviewModerationControlsProps = {
  readonly reviewId: string
  readonly status: ReviewStatus
  readonly reply: string | null
}

// Publish or reject, and a rejected review can come back. There is no edit:
// the shop either shows the buyer's words as they are or keeps them off.
const NEXT_ACTIONS: Record<
  ReviewStatus,
  readonly { status: ReviewStatus; label: string; isPrimary: boolean }[]
> = {
  [ReviewStatus.Pending]: [
    { status: ReviewStatus.Published, label: 'Опубликовать', isPrimary: true },
    { status: ReviewStatus.Rejected, label: 'Отклонить', isPrimary: false },
  ],
  [ReviewStatus.Published]: [
    { status: ReviewStatus.Rejected, label: 'Снять с публикации', isPrimary: false },
  ],
  [ReviewStatus.Rejected]: [
    { status: ReviewStatus.Published, label: 'Вернуть и опубликовать', isPrimary: true },
  ],
}

const BUTTON_CLASS =
  'min-h-9 rounded-control px-3.5 text-[12px] font-semibold disabled:opacity-60'

export function ReviewModerationControls({ reviewId, status, reply }: ReviewModerationControlsProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isReplying, setIsReplying] = useState(false)
  const [replyDraft, setReplyDraft] = useState(reply ?? '')
  const [isPending, startTransition] = useTransition()

  function run(task: () => Promise<ActionResult<null>>) {
    setError(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      setIsReplying(false)
      router.refresh()
    })
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-[220px]">
      {NEXT_ACTIONS[status].map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={isPending}
          onClick={() => run(() => moderateReviewAction({ reviewId, status: action.status }))}
          className={cn(
            BUTTON_CLASS,
            action.isPrimary
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'border border-strong bg-surface text-ink hover:border-faint',
          )}
        >
          {isPending ? 'Сохраняем…' : action.label}
        </button>
      ))}

      {isReplying ? (
        <form
          className="grid gap-2"
          action={() => run(() => replyToReviewAction({ reviewId, body: replyDraft }))}
        >
          <textarea
            value={replyDraft}
            onChange={(event) => setReplyDraft(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ответ увидят все под отзывом"
            className="rounded-control border-[1.5px] border-strong bg-raised px-3 py-2 text-[12.5px] text-ink focus-visible:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || replyDraft.trim().length < 2}
              className={cn(BUTTON_CLASS, 'flex-1 bg-ink text-on-dark hover:bg-ink-hover')}
            >
              Сохранить ответ
            </button>
            <button
              type="button"
              onClick={() => setIsReplying(false)}
              className={cn(BUTTON_CLASS, 'border border-subtle text-muted hover:text-ink')}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsReplying(true)}
          className="text-right text-[12px] font-semibold text-accent-hover hover:underline"
        >
          {reply ? 'Изменить ответ магазина' : 'Ответить от магазина'}
        </button>
      )}

      {error ? <span className="text-[12px] font-medium text-alert">{error}</span> : null}
    </div>
  )
}
