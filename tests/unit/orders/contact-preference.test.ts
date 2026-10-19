import { describe, expect, it } from 'vitest'
import { ContactPreference } from '@/db/enums'
import {
  CONTACT_PREFERENCE_RU,
  contactView,
  isSpecialContact,
  messengerChatUrl,
  messengerWebChatUrl,
} from '@/features/orders/model/contact-preference'

describe('messengerChatUrl', () => {
  const phone = '+380 (66) 232-22-28'

  it('opens a chat in the messenger the buyer chose', () => {
    expect(messengerChatUrl(ContactPreference.Viber, phone)).toBe(
      'viber://chat?number=%2B380662322228',
    )
    expect(messengerChatUrl(ContactPreference.Telegram, phone)).toBe('https://t.me/+380662322228')
    expect(messengerChatUrl(ContactPreference.WhatsApp, phone)).toBe('https://wa.me/380662322228')
  })

  it('has no chat for a call or for no contact', () => {
    expect(messengerChatUrl(ContactPreference.Call, phone)).toBeNull()
    expect(messengerChatUrl(ContactPreference.NoCall, phone)).toBeNull()
  })

  it('has no chat without a Ukrainian number', () => {
    expect(messengerChatUrl(ContactPreference.Viber, null)).toBeNull()
    expect(messengerChatUrl(ContactPreference.Viber, '12345')).toBeNull()
  })
})

describe('contact preference wording', () => {
  it('names every preference for the team', () => {
    for (const preference of Object.values(ContactPreference)) {
      expect(CONTACT_PREFERENCE_RU[preference]).toBeTruthy()
    }
  })

  it('flags everything but the usual call', () => {
    expect(isSpecialContact(ContactPreference.Call)).toBe(false)
    expect(isSpecialContact(ContactPreference.NoCall)).toBe(true)
    expect(isSpecialContact(ContactPreference.Telegram)).toBe(true)
  })
})

describe('messengerWebChatUrl', () => {
  const phone = '+380662322228'

  it('links the chats that open on the web', () => {
    expect(messengerWebChatUrl(ContactPreference.Telegram, phone)).toBe(
      'https://t.me/+380662322228',
    )
    expect(messengerWebChatUrl(ContactPreference.WhatsApp, phone)).toBe(
      'https://wa.me/380662322228',
    )
  })

  it('leaves out the Viber app scheme', () => {
    expect(messengerWebChatUrl(ContactPreference.Viber, phone)).toBeNull()
  })
})

describe('contactView', () => {
  it('shows a messenger with its chat', () => {
    expect(contactView(ContactPreference.WhatsApp, '+380662322228')).toEqual({
      preference: ContactPreference.WhatsApp,
      label: 'написать в WhatsApp',
      isSpecial: true,
      chatUrl: 'https://wa.me/380662322228',
    })
  })

  it('shows the usual call quietly and without a chat', () => {
    expect(contactView(ContactPreference.Call, '+380662322228')).toMatchObject({
      isSpecial: false,
      chatUrl: null,
    })
  })
})
