import { beforeEach, describe, expect, it, vi } from 'vitest'

const jar = vi.hoisted(() => new Map<string, string>())

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
  }),
}))

import { serializeTouch } from '@/features/analytics/model/traffic-source'
import { readTrafficTouch } from '@/features/analytics/session'

const TOUCH = { source: 'google_ads', detail: 'PMax' } as const

beforeEach(() => {
  jar.clear()
})

describe('readTrafficTouch at checkout', () => {
  it('names the channel the shopper came from', async () => {
    jar.set('fox_source', serializeTouch(TOUCH))

    await expect(readTrafficTouch()).resolves.toEqual(TOUCH)
  })

  it('drops it once the shopper has refused tracking', async () => {
    jar.set('fox_source', serializeTouch(TOUCH))
    jar.set('fox_consent', 'denied')

    await expect(readTrafficTouch()).resolves.toBeNull()
  })

  it('is null without a recorded visit', async () => {
    await expect(readTrafficTouch()).resolves.toBeNull()
  })
})
