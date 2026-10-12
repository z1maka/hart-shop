import { reservationRepository } from '@/features/inventory/repository/reservation-repository'
import { OutOfStockError } from '@/lib/errors'

export const RESERVATION_TTL_MINUTES = 30

export const inventoryService = {
  async reserveCart(cartId: string): Promise<Date> {
    const lines = await reservationRepository.findCartLines(cartId)

    if (lines.length === 0) {
      throw new Error(`Cart ${cartId} has nothing to reserve`)
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000)
    const result = await reservationRepository.reserve(cartId, lines, expiresAt)

    if (result.status === 'out_of_stock') {
      const line = lines.find((entry) => entry.variantId === result.variantId)
      throw new OutOfStockError(result.variantId, line?.quantity ?? 0, result.available)
    }

    return result.expiresAt
  },

  async commitCart(cartId: string): Promise<void> {
    await reservationRepository.commitForCart(cartId)
  },

  async releaseCart(cartId: string): Promise<void> {
    await reservationRepository.releaseForCart(cartId)
  },
}
