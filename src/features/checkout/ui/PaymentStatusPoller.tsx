'use client'

import { useEffect } from 'react'
import { checkPaymentAction } from '@/features/checkout/actions/payment-return-actions'
import {
  nextPollStep,
  RECHECK_DELAY_SECONDS,
  ReturnOutcome,
} from '@/features/checkout/model/payment-return'

// Asks for the outcome every few seconds without reloading the page: one
// acquirer call per check, and the page is left only once there is news.
export function PaymentStatusPoller({
  token,
  attempt,
}: {
  readonly token: string
  readonly attempt: number
}) {
  useEffect(() => {
    let checks = attempt
    let isStopped = false
    let timer = setTimeout(poll, RECHECK_DELAY_SECONDS * 1000)

    async function poll() {
      checks += 1
      const result = await checkPaymentAction({ token })
      if (isStopped) return

      // A refused or failed check says nothing about the money: keep waiting.
      const step = nextPollStep(result.ok ? result.data : ReturnOutcome.Processing, checks, token)
      if (step.isDone) {
        window.location.replace(step.path)
        return
      }
      timer = setTimeout(poll, RECHECK_DELAY_SECONDS * 1000)
    }

    return () => {
      isStopped = true
      clearTimeout(timer)
    }
  }, [token, attempt])

  return null
}
