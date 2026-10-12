import type { PaymentProvider } from '@/features/checkout/model/payment'
import { monoPaymentProvider } from '@/features/checkout/services/mono-provider'
import { wayforpayPaymentProvider } from '@/features/checkout/services/wayforpay-provider'
import { isMonoConfigured } from '@/lib/mono'
import { isWayforpayConfigured } from '@/lib/wayforpay'

// The shop runs both acquirers and the buyer picks one at checkout; mono
// leads because it is the shop's own, and the order records which one took
// the money.
export function availableCardProviders(): readonly PaymentProvider[] {
  return [
    ...(isMonoConfigured() ? [monoPaymentProvider] : []),
    ...(isWayforpayConfigured() ? [wayforpayPaymentProvider] : []),
  ]
}

// What a buyer who expressed no preference gets, and what an older client
// that sends no provider falls back to.
export function activePaymentProvider(): PaymentProvider {
  const [first] = availableCardProviders()
  return first ?? monoPaymentProvider
}

// Only a provider this shop actually runs: an id from the client is never
// trusted to name something the configuration does not have.
export function paymentProviderById(id: string | null | undefined): PaymentProvider {
  return availableCardProviders().find((provider) => provider.id === id) ?? activePaymentProvider()
}

export function isCardPaymentConfigured(): boolean {
  return availableCardProviders().length > 0
}
