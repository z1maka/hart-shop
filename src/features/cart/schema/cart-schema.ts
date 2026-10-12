import { z } from 'zod'

export const AddToCartSchema = z.object({
  variantId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
})

export const UpdateCartItemSchema = z.object({
  itemId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
})

export const RemoveCartItemSchema = z.object({
  itemId: z.uuid(),
})

export type AddToCartInput = z.infer<typeof AddToCartSchema>

