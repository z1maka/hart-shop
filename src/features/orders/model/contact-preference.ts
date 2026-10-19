import { ContactPreference } from '@/db/enums'
import { toUkrainianMsisdn } from '@/features/orders/model/phone'

// What the team reads in the admin, the orders chat and the shop mail —
// Russian, like the rest of the admin.
export const CONTACT_PREFERENCE_RU: Record<ContactPreference, string> = {
  [ContactPreference.Call]: 'позвонить для подтверждения',
  [ContactPreference.NoCall]: 'не звонить — покупатель уверен в заказе',
  [ContactPreference.Viber]: 'написать в Viber',
  [ContactPreference.Telegram]: 'написать в Telegram',
  [ContactPreference.WhatsApp]: 'написать в WhatsApp',
}

// The links each messenger opens a chat by: Viber only through its own app
// scheme, Telegram and WhatsApp through their web addresses.
const CHAT_URL_BY_PREFERENCE: Partial<Record<ContactPreference, (msisdn: string) => string>> = {
  [ContactPreference.Viber]: (msisdn) => `viber://chat?number=%2B${msisdn}`,
  [ContactPreference.Telegram]: (msisdn) => `https://t.me/+${msisdn}`,
  [ContactPreference.WhatsApp]: (msisdn) => `https://wa.me/${msisdn}`,
}

// A chat with the buyer, opened straight from the admin; null when they want
// a call or no contact, or when the number is not a Ukrainian one.
export function messengerChatUrl(
  preference: ContactPreference,
  phone: string | null | undefined,
): string | null {
  const build = CHAT_URL_BY_PREFERENCE[preference]
  if (!build || !phone) return null

  const msisdn = toUkrainianMsisdn(phone)
  return msisdn ? build(msisdn) : null
}

const WEB_URL_PREFIX = 'https://'

// Telegram links web addresses inside a message; Viber's app scheme is kept
// out so it cannot get the whole order notice refused — the phone line next
// to it is enough to find the buyer there.
export function messengerWebChatUrl(
  preference: ContactPreference,
  phone: string | null | undefined,
): string | null {
  const url = messengerChatUrl(preference, phone)
  return url?.startsWith(WEB_URL_PREFIX) ? url : null
}

// The usual call needs no reminder; anything else changes what the team does
// with the order, so it is worth saying.
export function isSpecialContact(preference: ContactPreference): boolean {
  return preference !== ContactPreference.Call
}

export type ContactView = {
  readonly preference: ContactPreference
  readonly label: string
  readonly isSpecial: boolean
  readonly chatUrl: string | null
}

// How to reach the buyer, as the order page and the orders list show it.
export function contactView(
  preference: ContactPreference,
  phone: string | null | undefined,
): ContactView {
  return {
    preference,
    label: CONTACT_PREFERENCE_RU[preference],
    isSpecial: isSpecialContact(preference),
    chatUrl: messengerChatUrl(preference, phone),
  }
}
