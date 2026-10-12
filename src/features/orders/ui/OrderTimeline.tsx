import { useTranslations } from 'next-intl'
import type { TimelineStep } from '@/features/orders/model/timeline'
import { cn } from '@/lib/utils'

const DOT_CLASSES: Record<TimelineStep['state'], string> = {
  done: 'border-accent bg-accent',
  current: 'border-accent-edge bg-accent-mid',
  upcoming: 'border-strong bg-transparent',
}

const TEXT_CLASSES: Record<TimelineStep['state'], string> = {
  done: 'text-ink',
  current: 'text-ink',
  upcoming: 'text-faint',
}

// A vertical list on phones, a stepper strip on wider screens: four short
// steps in a row read at a glance and stop stretching the page downward.
export function OrderTimeline({ steps }: { steps: readonly TimelineStep[] }) {
  const t = useTranslations('orderTimeline')

  return (
    <ol className="grid gap-4 sm:grid-cols-4 sm:gap-4">
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-3.5 sm:flex-col sm:gap-2.5">
          <span className="flex flex-col items-center sm:w-full sm:flex-row">
            <span
              className={cn(
                'mt-1 size-3.5 shrink-0 rounded-full border-2 sm:mt-0',
                DOT_CLASSES[step.state],
              )}
              aria-hidden
            />
            {index < steps.length - 1 ? (
              <span
                className="mt-1 w-px flex-1 bg-subtle sm:mt-0 sm:ml-2 sm:h-px sm:w-auto"
                aria-hidden
              />
            ) : null}
          </span>
          <span>
            <span className={cn('block text-[14px] font-semibold', TEXT_CLASSES[step.state])}>
              {t(`${step.key}.label`)}
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
              {t(`${step.key}.body`)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
