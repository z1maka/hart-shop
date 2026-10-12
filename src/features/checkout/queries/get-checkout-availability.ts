import { Carrier } from '@/db/enums'
import { getActiveBankAccount } from '@/features/billing'
import { availableCardProviders } from '@/features/checkout/services/payment-provider'
import { isNovaPostConfigured } from '@/lib/nova-post'

export type CheckoutAvailability = {
  readonly isCardPaymentAvailable: boolean
  // One entry per acquirer the shop runs; the buyer picks between them.
  readonly cardProviders: readonly string[]
  // Carriers whose branch and locker directory answers. Without one the
  // checkout offers courier delivery only, rather than a picker that cannot
  // list anything.
  readonly pickupCarriers: readonly Carrier[]
  // Paying by transfer needs an account to pay to; with none in the admin the
  // route is not offered rather than promised and left empty.
  readonly isBankTransferAvailable: boolean
}

export async function getCheckoutAvailability(): Promise<CheckoutAvailability> {
  const providers = availableCardProviders()

  return {
    isCardPaymentAvailable: providers.length > 0,
    cardProviders: providers.map((provider) => provider.id),
    pickupCarriers: isNovaPostConfigured() ? [Carrier.NovaPost] : [],
    isBankTransferAvailable: (await getActiveBankAccount()) !== null,
  }
}
