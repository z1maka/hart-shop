import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/Button'
import { COMPANY } from '@/config/company'
import {
  paymentReturnPath,
  returnPagePath,
  ReturnScreen,
} from '@/features/checkout/model/payment-return'
import type { PaymentReturnView } from '@/features/checkout/services/payment-return'
import { PaymentStateIcon } from '@/features/checkout/ui/PaymentStateIcon'
import { PaymentStatusPoller } from '@/features/checkout/ui/PaymentStatusPoller'
import {
  BoxGlyph,
  MessageGlyph,
  PhoneGlyph,
  ShieldGlyph,
  TruckGlyph,
  type GlyphProps,
} from '@/features/checkout/ui/return-glyphs'
import { cn } from '@/lib/utils'

type Translator = Awaited<ReturnType<typeof getTranslations<'checkoutReturn'>>>
type ActionKey =
  | 'viewOrder'
  | 'keepShopping'
  | 'checkNow'
  | 'tryAgain'
  | 'toCart'
  | 'backToCart'
  | 'toShop'
  | 'contact'

type ScreenAction = {
  readonly label: ActionKey
  readonly href: string
  // The return route is a handler, not a page: it needs a full navigation.
  readonly isDocument?: boolean
}

type PaymentReturnScreenProps = {
  readonly screen: ReturnScreen
  readonly order: PaymentReturnView['order']
  readonly token: string | null
  readonly attempt: number
}

// The page tints itself after the outcome: a warm olive glow for money that
// arrived, the alert tone for a refusal, a quiet grey when nothing is known.
const GLOW: Record<ReturnScreen, string> = {
  [ReturnScreen.Paid]: 'color-mix(in oklab, var(--color-accent-mid) 70%, transparent)',
  [ReturnScreen.Processing]: 'var(--color-accent-soft)',
  [ReturnScreen.Slow]: 'var(--color-accent-soft)',
  [ReturnScreen.Unpaid]: 'color-mix(in oklab, var(--color-alert-edge) 32%, transparent)',
  [ReturnScreen.Expired]: 'var(--color-hover)',
  [ReturnScreen.Unknown]: 'var(--color-hover)',
}

const STATUS_PILL: Record<ReturnScreen, string> = {
  [ReturnScreen.Paid]: 'bg-accent text-white',
  [ReturnScreen.Processing]: 'bg-accent-soft text-accent-hover',
  [ReturnScreen.Slow]: 'bg-accent-soft text-accent-hover',
  [ReturnScreen.Unpaid]: 'bg-alert-soft text-alert',
  [ReturnScreen.Expired]: 'bg-sunken text-muted',
  [ReturnScreen.Unknown]: 'bg-sunken text-muted',
}

export async function PaymentReturnScreen({
  screen,
  order,
  token,
  attempt,
}: PaymentReturnScreenProps) {
  const t = await getTranslations('checkoutReturn')
  const [primary, secondary] = actionsFor(screen, token, attempt)

  return (
    <section className="relative isolate overflow-hidden px-5 pt-14 pb-16 sm:px-7 sm:pt-20 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
        style={{
          background: `radial-gradient(ellipse 70% 62% at 50% 0%, ${GLOW[screen]}, transparent)`,
        }}
      />

      <div className="mx-auto flex max-w-[640px] flex-col items-center text-center">
        <PaymentStateIcon screen={screen} />
        {order ? (
          <p className="mt-7 rounded-pill border border-subtle bg-surface/80 px-3.5 py-1.5 text-[12.5px] font-semibold text-muted backdrop-blur-sm">
            {t('orderKicker', { number: order.number })}
          </p>
        ) : null}
        <h1 className="mt-4 animate-rise-in font-display text-h1 font-bold text-ink">
          {t(`screens.${screen}.title`)}
        </h1>
        <p className="mt-3 max-w-[52ch] animate-rise-in text-[15px] leading-relaxed text-muted [animation-delay:80ms]">
          {t(`screens.${screen}.body`)}
        </p>

        {screen === ReturnScreen.Processing && token ? (
          <CheckingBar label={t('checking')} token={token} attempt={attempt} />
        ) : null}

        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          {primary ? <ActionButton action={primary} t={t} /> : null}
          {secondary ? <ActionButton action={secondary} t={t} variant="secondary" /> : null}
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-[760px] gap-4">
        {order && screen !== ReturnScreen.Unknown ? (
          <Summary screen={screen} order={order} t={t} />
        ) : null}
        {screen === ReturnScreen.Processing || screen === ReturnScreen.Slow ? (
          <DontPayTwice t={t} />
        ) : null}
        {screen === ReturnScreen.Paid ? <NextSteps t={t} /> : null}
        <HelpLine label={t('help')} />
      </div>
    </section>
  )
}

const NO_ORDER_ACTIONS: readonly ScreenAction[] = [
  { label: 'toShop', href: '/shop/' },
  { label: 'contact', href: '/contact/' },
]

// Each screen offers the one step that moves the buyer on, and a way out.
function actionsFor(
  screen: ReturnScreen,
  token: string | null,
  attempt: number,
): readonly ScreenAction[] {
  if (!token) return NO_ORDER_ACTIONS

  const byScreen: Record<ReturnScreen, readonly ScreenAction[]> = {
    [ReturnScreen.Paid]: [
      { label: 'viewOrder', href: paymentReturnPath(token), isDocument: true },
      { label: 'keepShopping', href: '/shop/' },
    ],
    [ReturnScreen.Processing]: [{ label: 'checkNow', href: returnPagePath(token, attempt + 1) }],
    [ReturnScreen.Slow]: [
      { label: 'viewOrder', href: `/order/${token}/` },
      { label: 'contact', href: '/contact/' },
    ],
    [ReturnScreen.Unpaid]: [
      { label: 'tryAgain', href: '/checkout/' },
      { label: 'toCart', href: '/cart/' },
    ],
    [ReturnScreen.Expired]: [
      { label: 'backToCart', href: '/cart/' },
      { label: 'toShop', href: '/shop/' },
    ],
    [ReturnScreen.Unknown]: NO_ORDER_ACTIONS,
  }

  return byScreen[screen]
}

function ActionButton({
  action,
  t,
  variant = 'primary',
}: {
  readonly action: ScreenAction
  readonly t: Translator
  readonly variant?: 'primary' | 'secondary'
}) {
  const label = t(`actions.${action.label}`)

  return (
    <Button asChild size="lg" variant={variant} className="w-full sm:w-auto">
      {action.isDocument ? (
        <a href={action.href}>{label}</a>
      ) : (
        <Link href={action.href}>{label}</Link>
      )}
    </Button>
  )
}

// A bar that keeps moving while the page asks the bank again in the
// background; the button next to it asks right away.
function CheckingBar({
  label,
  token,
  attempt,
}: {
  readonly label: string
  readonly token: string
  readonly attempt: number
}) {
  return (
    <div className="mt-7 w-full max-w-[320px]" role="status">
      <div className="h-1.5 overflow-hidden rounded-pill bg-accent-soft">
        <div className="h-full w-2/5 animate-indeterminate rounded-pill bg-accent" />
      </div>
      <p className="mt-2.5 text-[12.5px] font-medium text-faint">{label}</p>
      <PaymentStatusPoller token={token} attempt={attempt} />
    </div>
  )
}

function Summary({
  screen,
  order,
  t,
}: {
  readonly screen: ReturnScreen
  readonly order: NonNullable<PaymentReturnView['order']>
  readonly t: Translator
}) {
  const provider =
    order.providerId === 'mono' || order.providerId === 'wayforpay' ? order.providerId : 'other'

  return (
    <dl className="grid overflow-hidden rounded-card border border-subtle bg-surface/90 shadow-card backdrop-blur-sm sm:grid-cols-3">
      <SummaryCell label={t('summary.amount')}>
        <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-ink">
          {order.totalLabel}
        </span>
      </SummaryCell>
      <SummaryCell label={t('summary.method')}>
        <span className="text-[14.5px] font-semibold text-ink">{t(`providers.${provider}`)}</span>
      </SummaryCell>
      <SummaryCell label={t('summary.status')}>
        <span
          className={cn(
            'inline-flex rounded-pill px-3 py-1 text-[12.5px] font-semibold',
            STATUS_PILL[screen],
          )}
        >
          {t(`screens.${screen}.status`)}
        </span>
      </SummaryCell>
    </dl>
  )
}

function SummaryCell({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 border-subtle px-6 py-5 not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l">
      <dt className="text-[11.5px] font-semibold tracking-[0.04em] text-faint uppercase">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  )
}

function DontPayTwice({ t }: { readonly t: Translator }) {
  return (
    <div className="flex items-start gap-4 rounded-card border border-accent-soft bg-accent-tint px-6 py-5">
      <IconBubble glyph={ShieldGlyph} />
      <div>
        <p className="text-[14.5px] font-semibold text-ink">{t('dontPayTwice.title')}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{t('dontPayTwice.body')}</p>
      </div>
    </div>
  )
}

const NEXT_STEPS = [
  { key: 'sms', glyph: MessageGlyph },
  { key: 'workshop', glyph: BoxGlyph },
  { key: 'delivery', glyph: TruckGlyph },
] as const

function NextSteps({ t }: { readonly t: Translator }) {
  return (
    <div className="rounded-card border border-subtle bg-surface/90 px-6 py-6 backdrop-blur-sm">
      <h2 className="mb-5 font-display text-h3 font-bold text-ink">{t('nextTitle')}</h2>
      <ol className="grid gap-5 sm:grid-cols-3 sm:gap-6">
        {NEXT_STEPS.map((step, index) => (
          <li
            key={step.key}
            className="flex animate-rise-in gap-3.5 sm:flex-col sm:gap-3"
            style={{ animationDelay: `${200 + index * 120}ms` }}
          >
            <IconBubble glyph={step.glyph} number={index + 1} />
            <div>
              <p className="text-[14px] font-semibold text-ink">{t(`next.${step.key}.title`)}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {t(`next.${step.key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function IconBubble({
  glyph: Glyph,
  number,
}: {
  readonly glyph: (props: GlyphProps) => ReactNode
  readonly number?: number
}) {
  return (
    <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-hover">
      <Glyph className="size-5.5" />
      {number ? (
        <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-ink text-[10.5px] font-bold text-on-dark">
          {number}
        </span>
      ) : null}
    </span>
  )
}

function HelpLine({ label }: { readonly label: string }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-2 text-[13.5px] text-muted">
      <PhoneGlyph className="size-4 text-faint" />
      {label}
      <a
        href={COMPANY.phoneHref}
        className="font-semibold text-ink underline-offset-4 hover:underline"
      >
        {COMPANY.phone}
      </a>
    </p>
  )
}
