import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  parseRecheckAttempt,
  paymentReturnService,
  PaymentReturnScreen,
  readReturnToken,
  ReturnOutcome,
  returnScreenOf,
} from '@/features/checkout'

export const metadata: Metadata = {
  title: 'Оплата',
  robots: { index: false, follow: false },
}

export default function CheckoutReturnPage({ searchParams }: PageProps<'/checkout/return'>) {
  return (
    <Suspense fallback={<ReturnSkeleton />}>
      <ReturnMessage searchParams={searchParams} />
    </Suspense>
  )
}

async function ReturnMessage({
  searchParams,
}: {
  searchParams: PageProps<'/checkout/return'>['searchParams']
}) {
  const query = await searchParams
  const token = readReturnToken(query.order)
  const attempt = parseRecheckAttempt(query.attempt)
  const view = token ? await paymentReturnService.describe(token) : null

  return (
    <PaymentReturnScreen
      screen={returnScreenOf(view?.outcome ?? ReturnOutcome.Unknown, attempt)}
      order={view?.order ?? null}
      token={view?.order ? token : null}
      attempt={attempt}
    />
  )
}

function ReturnSkeleton() {
  return (
    <div className="flex flex-col items-center gap-5 px-5 pt-20 pb-24">
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="h-10 w-full max-w-[420px] rounded-card" />
      <Skeleton className="h-5 w-full max-w-[520px] rounded-card" />
      <Skeleton className="mt-8 h-24 w-full max-w-[760px] rounded-card" />
    </div>
  )
}
