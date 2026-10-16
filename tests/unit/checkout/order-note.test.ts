import { describe, expect, it } from 'vitest'
import { normalizeOrderNote, ORDER_NOTE_MAX_LENGTH } from '@/features/checkout/model/order-note'
import { QuickOrderSchema } from '@/features/checkout/schema/checkout-schema'

describe('normalizeOrderNote', () => {
  it('keeps what the buyer wrote, without the spaces around it', () => {
    expect(normalizeOrderNote('  Розмір L, передзвоніть після 18:00\n')).toBe(
      'Розмір L, передзвоніть після 18:00',
    )
  })

  it('keeps the line breaks inside the note', () => {
    expect(normalizeOrderNote('Розмір L\nБез ціника')).toBe('Розмір L\nБез ціника')
  })

  it('reads an empty or blank note as no note', () => {
    expect(normalizeOrderNote(undefined)).toBeNull()
    expect(normalizeOrderNote('')).toBeNull()
    expect(normalizeOrderNote(' \n\t ')).toBeNull()
  })
})

describe('order note on the quick order', () => {
  it('is optional', () => {
    expect(QuickOrderSchema.safeParse({ phone: '+380631234567' }).success).toBe(true)
  })

  it('refuses a note longer than the limit', () => {
    const note = 'а'.repeat(ORDER_NOTE_MAX_LENGTH + 1)
    expect(QuickOrderSchema.safeParse({ phone: '+380631234567', note }).success).toBe(false)
  })

  it('counts the limit after trimming', () => {
    const note = ` ${'а'.repeat(ORDER_NOTE_MAX_LENGTH)} `
    expect(QuickOrderSchema.safeParse({ phone: '+380631234567', note }).success).toBe(true)
  })
})
