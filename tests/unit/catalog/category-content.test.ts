import { describe, expect, it } from 'vitest'
import {
  finishedFaq,
  parseStory,
  unfinishedFaqIndex,
} from '@/features/catalog/model/category-content'

describe('parseStory', () => {
  it('reads headings, paragraphs and lists split by blank lines', () => {
    const text = [
      '## Як обрати',
      '',
      'Перший абзац',
      'продовжується на другому рядку.',
      '',
      '- пункт один',
      '- пункт два',
      '',
      '',
      'Останній абзац.',
    ].join('\n')

    expect(parseStory(text)).toEqual([
      { type: 'heading', text: 'Як обрати' },
      { type: 'paragraph', text: 'Перший абзац продовжується на другому рядку.' },
      { type: 'list', items: ['пункт один', 'пункт два'] },
      { type: 'paragraph', text: 'Останній абзац.' },
    ])
  })

  it('lets a heading sit right above its paragraph or its list', () => {
    const text = ['## Догляд', 'Тільки ручне прання.', '- без кислот', '- без лугів', 'І сушити на повітрі.'].join('\n')

    expect(parseStory(text)).toEqual([
      { type: 'heading', text: 'Догляд' },
      { type: 'paragraph', text: 'Тільки ручне прання.' },
      { type: 'list', items: ['без кислот', 'без лугів'] },
      { type: 'paragraph', text: 'І сушити на повітрі.' },
    ])
  })

  it('is empty for an empty text', () => {
    expect(parseStory('')).toEqual([])
    expect(parseStory('  \n\n ')).toEqual([])
  })
})

describe('FAQ rows', () => {
  const fine = { question: 'Чи працює?', answer: 'Так, працює.' }

  it('skips blank rows and points at the first half-filled one', () => {
    const blank = { question: '  ', answer: '' }
    expect(unfinishedFaqIndex([fine, blank, fine])).toBe(-1)
    expect(unfinishedFaqIndex([fine, blank, { question: 'Чому?', answer: '' }])).toBe(2)
    expect(unfinishedFaqIndex([{ question: 'Чи', answer: 'Так, працює.' }])).toBe(0)
  })

  it('keeps only written rows, trimmed', () => {
    expect(finishedFaq([{ question: ' Чи працює? ', answer: 'Так. ' }, { question: '', answer: ' ' }])).toEqual([
      { question: 'Чи працює?', answer: 'Так.' },
    ])
  })
})
