import { describe, expect, it } from 'vitest'
import { escapeHtml } from '@/lib/html'

describe('escapeHtml', () => {
  it('turns markup a visitor typed into text', () => {
    expect(escapeHtml('<a href="https://evil.example">Оплатити</a>')).toBe(
      '&lt;a href=&quot;https://evil.example&quot;&gt;Оплатити&lt;/a&gt;',
    )
  })

  it('escapes the ampersand first, so entities are not doubled', () => {
    expect(escapeHtml('A & B <b>')).toBe('A &amp; B &lt;b&gt;')
  })
})
