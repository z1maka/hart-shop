import type { PaymentProvider } from '@/features/checkout/model/payment'
import { monoPaymentProvider } from '@/features/checkout/services/mono-provider'
import { isMonoConfigured } from '@/lib/mono'

// The acquirers this shop runs, in the order checkout offers them. Only mono
// since 16.10.2026 (the owner dropped WayForPay); a second one is a new
// provider added here, and the order records which one took the money.
export function availableCardProviders(): readonly PaymentProvider[] {
  return isMonoConfigured() ? [monoPaymentProvider] : []
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
