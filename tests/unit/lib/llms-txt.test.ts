import { describe, expect, it } from 'vitest'
import { buildLlmsTxt } from '@/lib/llms-txt'

describe('buildLlmsTxt', () => {
  it('writes the title, the summary as a quote and each section as a link list', () => {
    const text = buildLlmsTxt({
      title: 'Гарт (hart-shop.com)',
      summary: 'Антитепловізійні пончо',
      details: ['Продавець: ФОП'],
      sections: [
        {
          heading: 'Каталог',
          links: [
            {
              title: 'Чохли для Starlink',
              url: 'https://hart-shop.com/product-category/chokhly-dlya-starlink/',
              note: 'Gen 2, Gen 3, Mini',
            },
          ],
        },
      ],
    })

    expect(text).toBe(
      [
        '# Гарт (hart-shop.com)',
        '',
        '> Антитепловізійні пончо',
        '',
        'Продавець: ФОП',
        '',
        '## Каталог',
        '- [Чохли для Starlink](https://hart-shop.com/product-category/chokhly-dlya-starlink/): Gen 2, Gen 3, Mini',
        '',
      ].join('\n'),
    )
  })

  it('keeps a multi-line note on one line, so the list item does not end early', () => {
    const text = buildLlmsTxt({
      title: 'Гарт',
      summary: 'Перший рядок\nдругий рядок',
      details: [],
      sections: [
        { heading: 'Покупцям', links: [{ title: 'Доставка', url: 'https://x/', note: 'а\n\nб' }] },
      ],
    })

    expect(text).toContain('> Перший рядок другий рядок')
    expect(text).toContain('- [Доставка](https://x/): а б')
  })

  it('drops the colon for a link without a note and skips an empty section', () => {
    const text = buildLlmsTxt({
      title: 'Гарт',
      summary: 'Магазин',
      details: [],
      sections: [
        { heading: 'Порожня', links: [] },
        { heading: 'Покупцям', links: [{ title: 'Контакти', url: 'https://x/contact/', note: ' ' }] },
      ],
    })

    expect(text).not.toContain('## Порожня')
    expect(text).toContain('- [Контакти](https://x/contact/)\n')
  })
})
