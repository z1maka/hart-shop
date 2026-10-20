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
      { color: 'Мультикам', href: `/product/poncho-multicam/?color=${encodeURIComponent('Мультикам')}` },
      { color: 'Піксель', href: `/product/poncho-pixel/?color=${encodeURIComponent('Піксель')}` },
    ])
  })

  it('leaves a colour the product sells itself to its own tile', () => {
    expect(colorLinksOf('poncho-olive', ['Олива', 'Піксель'], SIBLINGS)).toEqual([
      { color: 'Мультикам', href: `/product/poncho-multicam/?color=${encodeURIComponent('Мультикам')}` },
    ])
  })

  it('shows a colour two siblings share once, linked to the first', () => {
    const siblings = [...SIBLINGS, { slug: 'poncho-pixel-old', color: 'Піксель' }]

    expect(colorLinksOf('poncho-multicam', ['Мультикам'], siblings)).toEqual([
      { color: 'Олива', href: `/product/poncho-olive/?color=${encodeURIComponent('Олива')}` },
      { color: 'Піксель', href: `/product/poncho-pixel/?color=${encodeURIComponent('Піксель')}` },
    ])
  })

  it('skips a sibling whose variants name no colour', () => {
    const siblings = [...SIBLINGS, { slug: 'poncho-plain', color: null }]

    expect(colorLinksOf('poncho-pixel', ['Піксель'], siblings)).toHaveLength(2)
  })

  it('opens a sibling selling several colours on the one clicked', () => {
    const siblings = [
      { slug: 'cover-gen-2-4', color: 'Мультикам' },
      { slug: 'cover-gen-2-4', color: 'Олива' },
      { slug: 'cover-winter', color: 'Зимова клякса' },
    ]

    expect(colorLinksOf('cover-winter', ['Зимова клякса'], siblings).map((link) => link.href)).toEqual([
      '/product/cover-gen-2-4/?color=%D0%9C%D1%83%D0%BB%D1%8C%D1%82%D0%B8%D0%BA%D0%B0%D0%BC',
      '/product/cover-gen-2-4/?color=%D0%9E%D0%BB%D0%B8%D0%B2%D0%B0',
    ])
  })

  it('has nothing to link when the product is the only one of its model', () => {
    expect(colorLinksOf('poncho-olive', ['Олива'], [{ slug: 'poncho-olive', color: 'Олива' }])).toEqual([])
  })
})
