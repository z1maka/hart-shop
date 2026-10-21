import { CONTACT_TOPIC_LABELS_RU, type ContactTopicId } from '@/config/contact'
import {
  CUSTOM_ORDER_ITEM_LABELS_RU,
  type CustomOrderItemId,
} from '@/config/custom-order'
import type {
  ContactMessageInput,
  CustomOrderInput,
} from '@/features/enquiries/schema/enquiry-schema'
import { EnquiryKind, type EnquiryStatus } from '@/db/enums'
import { enquiryRepository } from '@/features/enquiries/repository/enquiry-repository'
import { enquiryRecipient } from '@/lib/env'
import { EnquiryNotFoundError } from '@/lib/errors'
import { escapeHtml } from '@/lib/html'
import { logger } from '@/lib/logger'
import { sendMail } from '@/lib/mailer'

export const enquiryService = {
  async changeStatus(enquiryId: string, status: EnquiryStatus): Promise<void> {
    const wasUpdated = await enquiryRepository.updateStatus(enquiryId, status)
    if (!wasUpdated) throw new EnquiryNotFoundError(enquiryId)

    logger.info('Enquiry status changed', { enquiryId, status })
  },

  async submitContactMessage(input: ContactMessageInput): Promise<void> {
    const topicLabel = CONTACT_TOPIC_LABELS_RU[input.topic as ContactTopicId] ?? input.topic

    // Stored before it is mailed, for the same reason a quote is: a message
    // that exists only in an inbox is gone the moment a filter catches it.
    await enquiryRepository.create({
      kind: EnquiryKind.Contact,
      organisation: null,
      contactName: null,
      email: input.email,
      phone: input.phone ?? null,
      telegram: input.telegram ?? null,
      topic: topicLabel,
      country: null,
      quantity: null,
      message: input.message,
      cartLines: [],
    })

    const lines = [
      ['Тема', topicLabel],
      ['Email', input.email],
      ['Телефон', input.phone ?? '—'],
      ['Telegram', input.telegram ?? '—'],
      ['Сообщение', input.message],
    ]

    await sendMail({
      to: enquiryRecipient,
      replyTo: input.email,
      subject: `Обращение — ${topicLabel}`,
      text: lines.map(([label, value]) => `${label}: ${value}`).join('\n'),
      html: asTable(lines),
    })

    logger.info('Contact message received', { topic: input.topic })
  },

  // A request to sew something the catalogue does not carry. Kept as a quote
  // rather than a message: it ends in a price and a lead time, and the shop
  // works through these in a different order than it answers questions.
  async submitCustomOrder(input: CustomOrderInput): Promise<void> {
    const itemLabel = CUSTOM_ORDER_ITEM_LABELS_RU[input.item as CustomOrderItemId] ?? input.item
    const lines = [
      ['Что шьём', itemLabel],
      ['Количество', String(input.quantity)],
      ['Срок', input.deadline ?? 'не указан'],
      ['Телефон', input.phone],
      ['Email', input.email ?? '—'],
      ['Telegram', input.telegram ?? '—'],
      ['Со страницы', input.fromProduct ?? '—'],
      ['Что нужно', input.details],
    ]

    await enquiryRepository.create({
      kind: EnquiryKind.Quote,
      organisation: null,
      contactName: null,
      email: input.email ?? null,
      phone: input.phone,
      telegram: input.telegram ?? null,
      topic: `Пошив: ${itemLabel}`,
      country: null,
      quantity: input.quantity,
      message: messageOf(input),
      cartLines: [],
    })

    await sendMail({
      to: enquiryRecipient,
      // Only when there is an address to reply to; otherwise Reply should
      // open a message to ourselves rather than to nobody.
      replyTo: input.email,
      subject: `Пошив на заказ — ${itemLabel}${input.quantity > 1 ? ` ×${input.quantity}` : ''}`,
      text: lines.map(([label, value]) => `${label}: ${value}`).join('\n'),
      html: asTable(lines),
    })

    logger.info('Custom order request received', { item: input.item, quantity: input.quantity })
  },
}

// Everything the admin needs while reading the list, in the order it is
// asked for on the page.
function messageOf(input: CustomOrderInput): string {
  const tail = [
    input.deadline ? `Срок: ${input.deadline}` : null,
    input.fromProduct ? `Со страницы: ${input.fromProduct}` : null,
    input.telegram ? `Telegram: ${input.telegram}` : null,
    `Телефон: ${input.phone}`,
  ].filter((line): line is string => line !== null)

  return [input.details, ...tail].join('\n')
}

function asTable(rows: readonly (readonly string[])[]): string {
  const body = rows
    .map(
      ([label = '', value = '']) =>
        `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('')

  return `<table>${body}</table>`
}

