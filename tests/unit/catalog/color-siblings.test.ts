import { describe, expect, it } from 'vitest'
import { colorLinksOf } from '@/features/catalog/model/color-siblings'

const SIBLINGS = [
  { slug: 'poncho-multicam', color: 'Мультикам' },
  { slug: 'poncho-olive', color: 'Олива' },
  { slug: 'poncho-pixel', color: 'Піксель' },
]

describe('colorLinksOf', () => {
  it('links every other colour of the model to its own page', () => {
    expect(colorLinksOf('poncho-olive', ['Олива'], SIBLINGS)).toEqual([
      { color: 'Мультикам', href: '/product/poncho-multicam' },
      { color: 'Піксель', href: '/product/poncho-pixel' },
    ])
  })

  it('leaves a colour the product sells itself to its own tile', () => {
    expect(colorLinksOf('poncho-olive', ['Олива', 'Піксель'], SIBLINGS)).toEqual([
      { color: 'Мультикам', href: '/product/poncho-multicam' },
    ])
  })

  it('shows a colour two siblings share once, linked to the first', () => {
    const siblings = [...SIBLINGS, { slug: 'poncho-pixel-old', color: 'Піксель' }]

    expect(colorLinksOf('poncho-multicam', ['Мультикам'], siblings)).toEqual([
      { color: 'Олива', href: '/product/poncho-olive' },
      { color: 'Піксель', href: '/product/poncho-pixel' },
    ])
  })

  it('skips a sibling whose variants name no colour', () => {
    const siblings = [...SIBLINGS, { slug: 'poncho-plain', color: null }]

    expect(colorLinksOf('poncho-pixel', ['Піксель'], siblings)).toHaveLength(2)
  })

  it('has nothing to link when the product is the only one of its model', () => {
    expect(colorLinksOf('poncho-olive', ['Олива'], [{ slug: 'poncho-olive', color: 'Олива' }])).toEqual([])
  })
})
