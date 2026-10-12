import { count, desc, eq, type InferSelectModel } from 'drizzle-orm'
import { enquiries } from '@/db/schema'
import type { EnquiryKind, EnquiryStatus } from '@/db/enums'
import { db } from '@/lib/db'

export type EnquiryRow = InferSelectModel<typeof enquiries>

export type EnquiryLine = {
  readonly sku: string
  readonly title: string
  readonly variantLabel: string
  readonly quantity: number
  readonly unitPriceCents: number
}

export type EnquiryCreateInput = {
  readonly kind: EnquiryKind
  readonly organisation: string | null
  readonly contactName: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly telegram: string | null
  readonly topic: string | null
  readonly country: string | null
  readonly deliveryAddress?: string | null
  readonly quantity: number | null
  readonly message: string
  readonly cartLines: readonly EnquiryLine[]
}

export const enquiryRepository = {
  async findPage(limit: number, offset: number, status?: EnquiryStatus): Promise<EnquiryRow[]> {
    return db
      .select()
      .from(enquiries)
      .where(status ? eq(enquiries.status, status) : undefined)
      .orderBy(desc(enquiries.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async countAll(status?: EnquiryStatus): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(enquiries)
      .where(status ? eq(enquiries.status, status) : undefined)
    return row?.total ?? 0
  },

  async updateStatus(enquiryId: string, status: EnquiryStatus): Promise<boolean> {
    const updated = await db
      .update(enquiries)
      .set({ status })
      .where(eq(enquiries.id, enquiryId))
      .returning({ id: enquiries.id })

    return updated.length > 0
  },

  async create(input: EnquiryCreateInput): Promise<EnquiryRow> {
    const [row] = await db
      .insert(enquiries)
      .values({ ...input, cartLines: input.cartLines })
      .returning()

    if (!row) throw new Error('Enquiry could not be stored')

    return row
  },

  async findRecent(status: EnquiryStatus, limit: number): Promise<EnquiryRow[]> {
    return db
      .select()
      .from(enquiries)
      .where(eq(enquiries.status, status))
      .orderBy(desc(enquiries.createdAt))
      .limit(limit)
  },
}
