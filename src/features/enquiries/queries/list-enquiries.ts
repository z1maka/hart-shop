import type { EnquiryKind, EnquiryStatus } from '@/db/enums'
import { enquiryRepository } from '@/features/enquiries/repository/enquiry-repository'
import { formatDateTime } from '@/lib/datetime'

export type EnquiryListRow = {
  readonly id: string
  readonly reference: string
  readonly kind: EnquiryKind
  readonly status: EnquiryStatus
  // A contact message carries none of these: the person is identified by the
  // address they wrote from, and the topic replaces the company name.
  readonly who: string
  readonly email: string | null
  readonly phone: string | null
  readonly telegram: string | null
  readonly country: string | null
  readonly detail: string
  readonly receivedAt: string
}

export type EnquiryListPage = {
  readonly rows: readonly EnquiryListRow[]
  readonly page: number
  readonly pageCount: number
  readonly total: number
}

const REFERENCE_LENGTH = 8

export async function listEnquiries(
  page: number,
  perPage: number,
  status?: EnquiryStatus,
): Promise<EnquiryListPage> {
  const total = await enquiryRepository.countAll(status)
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const rows = await enquiryRepository.findPage(perPage, (currentPage - 1) * perPage, status)

  return {
    rows: rows.map((row) => ({
      id: row.id,
      reference: row.id.slice(0, REFERENCE_LENGTH).toUpperCase(),
      kind: row.kind,
      status: row.status,
      who: describeSender(row),
      email: row.email,
      phone: row.phone,
      telegram: row.telegram,
      country: row.country,
      detail: buildDetail(row.quantity, row.message),
      receivedAt: formatDateTime(row.createdAt),
    })),
    page: currentPage,
    pageCount,
    total,
  }
}

function describeSender(row: {
  organisation: string | null
  contactName: string | null
  topic: string | null
  email: string | null
  phone: string | null
}): string {
  const parts = [row.organisation, row.contactName, row.topic].filter((part): part is string =>
    Boolean(part),
  )

  return parts.length > 0 ? parts.join(' · ') : (row.email ?? row.phone ?? '—')
}

function buildDetail(quantity: number | null, message: string): string {
  const summary = message.replace(/\s+/g, ' ').trim()

  return quantity ? `${quantity} шт · ${summary}` : summary
}

