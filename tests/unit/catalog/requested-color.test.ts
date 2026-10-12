import { describe, expect, it } from 'vitest'
import { requestedColorOf } from '@/features/catalog/model/requested-color'

const COVER_COLORS = ['Мультикам', 'Олива', 'Піксель']
const PONCHO_COLORS = ['Мультикам', 'Олива', 'Зимовий мультикам']

describe('requestedColorOf', () => {
  it('reads the colour the page names itself', () => {
    expect(requestedColorOf({ color: 'Олива' }, COVER_COLORS)).toBe('Олива')
  })

  it('translates a WooCommerce colour slug from a WordPress-era link', () => {
    expect(requestedColorOf({ attribute_pa_color: 'oliva' }, COVER_COLORS)).toBe('Олива')
    expect(requestedColorOf({ attribute_pa_color: 'multikam' }, COVER_COLORS)).toBe('Мультикам')
    expect(requestedColorOf({ attribute_pa_color: 'Pixel' }, COVER_COLORS)).toBe('Піксель')
  })

  it('prefers the page’s own colour over a legacy slug', () => {
    expect(requestedColorOf({ color: 'Піксель', attribute_pa_color: 'oliva' }, COVER_COLORS)).toBe(
      'Піксель',
    )
  })

  it('falls back on the legacy slug when ?color= is empty or not a colour of the product', () => {
    expect(requestedColorOf({ color: '', attribute_pa_color: 'oliva' }, COVER_COLORS)).toBe('Олива')
    expect(requestedColorOf({ color: 'Койот', attribute_pa_color: 'oliva' }, COVER_COLORS)).toBe(
      'Олива',
    )
  })

  it('matches the old winter colour to the product’s longer name for it', () => {
    expect(requestedColorOf({ attribute_pa_color: 'zimoviy' }, PONCHO_COLORS)).toBe(
      'Зимовий мультикам',
    )
    // An exact name wins over a longer one that merely starts the same way.
    expect(requestedColorOf({ attribute_pa_color: 'multikam' }, PONCHO_COLORS)).toBe('Мультикам')
  })

  it('opens on the default colour for an unknown slug, a missing colour or a repeated parameter', () => {
    expect(requestedColorOf({ attribute_pa_color: 'purple' }, COVER_COLORS)).toBeNull()
    expect(requestedColorOf({ attribute_pa_color: 'coyote' }, COVER_COLORS)).toBeNull()
    expect(requestedColorOf({ attribute_pa_color: ['oliva', 'pixel'] }, COVER_COLORS)).toBeNull()
    expect(requestedColorOf({ gclid: 'abc' }, COVER_COLORS)).toBeNull()
  })

  it('never returns what every object inherits', () => {
    for (const slug of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      expect(requestedColorOf({ attribute_pa_color: slug }, COVER_COLORS)).toBeNull()
    }
  })
})
