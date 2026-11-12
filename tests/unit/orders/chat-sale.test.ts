import { describe, expect, it } from 'vitest'
import { SalesChannel, TrafficSource } from '@/db/enums'
import {
  ChatSaleBlock,
  ChatSaleChannel,
  chatSaleBlockOf,
  chatSaleTouch,
} from '@/features/orders/model/chat-sale'

describe('chatSaleTouch', () => {
  it('counts a buyer who wrote from the ad as a Meta ad sale', () => {
    expect(chatSaleTouch(ChatSaleChannel.InstagramDirectAd)).toEqual({
      source: TrafficSource.Meta,
      detail: 'Instagram · Direct',
    })
  })

  it('counts a buyer who wrote on their own as social', () => {
    expect(chatSaleTouch(ChatSaleChannel.InstagramDirect)).toEqual({
      source: TrafficSource.Social,
      detail: 'Instagram · Direct',
    })
  })
})

describe('chatSaleBlockOf', () => {
  it('lets a site order without a Google click be named a chat sale', () => {
    expect(chatSaleBlockOf({ channel: SalesChannel.Site, googleClickId: null })).toBeNull()
  })

  it('keeps a partner order and a Google ad sale as they are', () => {
    expect(chatSaleBlockOf({ channel: SalesChannel.Dropship, googleClickId: null })).toBe(
      ChatSaleBlock.Partner,
    )
    expect(chatSaleBlockOf({ channel: SalesChannel.Site, googleClickId: 'Cj0KCQjw' })).toBe(
      ChatSaleBlock.GoogleClick,
    )
  })
})
