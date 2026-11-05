import {
  resellerRepository,
  type ResellerRow,
} from '@/features/resellers/repository/reseller-repository'
import type { ResellerDraft } from '@/features/resellers/schema/reseller-schema'
import { ResellerNotFoundError } from '@/lib/errors'

export type Reseller = ResellerRow

// Partners are switched off, never deleted: their orders and invoices keep
// pointing at them.
export const resellerService = {
  async list(): Promise<Reseller[]> {
    return resellerRepository.findAll()
  },

  async listActive(): Promise<Reseller[]> {
    return resellerRepository.findActive()
  },

  async find(id: string): Promise<Reseller | null> {
    return resellerRepository.findById(id)
  },

  async add(draft: ResellerDraft): Promise<string> {
    return resellerRepository.create(draft)
  },

  async edit(id: string, draft: ResellerDraft): Promise<void> {
    if (!(await resellerRepository.update(id, draft))) throw new ResellerNotFoundError(id)
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    if (await resellerRepository.setActive(id, isActive)) return
    if (!(await resellerRepository.findById(id))) throw new ResellerNotFoundError(id)
  },
}
