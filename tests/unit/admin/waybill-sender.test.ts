import { describe, expect, it } from 'vitest'
import {
  defaultSenderId,
  issueButtonLabel,
  senderLine,
} from '@/features/admin/model/waybill-sender'

const MAIN = { id: 'a', name: 'Основной', senderName: 'ФОП Косенко М. С.', isDefault: true }
const SECOND = { id: 'b', name: 'Второй ФОП', senderName: 'ФОП Петренко О. В.', isDefault: false }

describe('defaultSenderId', () => {
  it('starts from the default cabinet wherever it sits in the list', () => {
    expect(defaultSenderId([SECOND, MAIN])).toBe('a')
  })

  it('falls back to the first cabinet, or to none while the shop has none', () => {
    expect(defaultSenderId([SECOND])).toBe('b')
    expect(defaultSenderId([])).toBeNull()
  })
})

describe('issueButtonLabel', () => {
  it('names the cabinet the waybill will leave from', () => {
    expect(issueButtonLabel([MAIN, SECOND], 'b')).toBe('Создать ТТН от «Второй ФОП»')
  })

  it('stays plain when no cabinet is listed', () => {
    expect(issueButtonLabel([], null)).toBe('Создать ТТН')
  })
})

describe('senderLine', () => {
  it('shows who sends and from which branch', () => {
    expect(senderLine(MAIN, 'Миколаїв · Відділення №30')).toBe(
      'ФОП Косенко М. С. · Миколаїв · Відділення №30',
    )
    expect(senderLine(MAIN, null)).toBe('ФОП Косенко М. С.')
  })
})
