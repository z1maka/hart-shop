import { z } from 'zod'
import { CONTACT_TOPIC_IDS } from '@/config/contact'
import { CUSTOM_ORDER_ITEM_IDS } from '@/config/custom-order'

const topicIds = CONTACT_TOPIC_IDS as [string, ...string[]]
const itemIds = CUSTOM_ORDER_ITEM_IDS as unknown as [string, ...string[]]

// Enough digits to be a phone at all; the shop calls the number rather than
// validating it into a shape the buyer did not expect.
const PHONE_MIN_DIGITS = 9
const QUANTITY_MAX = 5000

export const MAX_MESSAGE_LENGTH = 2000

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined))

// Bots fill every field they see; people never see this one. Optional and
// unbounded on purpose — its only meaning is "non-empty means machine".
export const HoneypotSchema = z.string().max(500).optional()

export const ContactMessageSchema = z.object({
  website: HoneypotSchema,
  topic: z.enum(topicIds),
  email: z.email(),
  // A custom order is settled by phone here; the address is what the reply
  // goes to, so both are kept and only one is required.
  phone: optionalText(40),
  telegram: optionalText(80),
  message: z.string().trim().min(10).max(MAX_MESSAGE_LENGTH),
})

export type ContactMessageInput = z.infer<typeof ContactMessageSchema>

// A request to sew something that is not in the catalogue. The phone is the
// required one here: this is settled by a call, and asking for an address
// first costs requests the workshop would rather have.
export const CustomOrderSchema = z.object({
  website: HoneypotSchema,
  item: z.enum(itemIds),
  details: z.string().trim().min(10).max(MAX_MESSAGE_LENGTH),
  quantity: z.coerce.number().int().min(1).max(QUANTITY_MAX),
  deadline: optionalText(80),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((value) => value.replace(/\D/g, '').length >= PHONE_MIN_DIGITS),
  email: z
    .union([z.email(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
  telegram: optionalText(80),
  // Which product page the request came from, so the reply knows what the
  // person was looking at.
  fromProduct: optionalText(200),
})

export type CustomOrderInput = z.infer<typeof CustomOrderSchema>
