import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  readWarehouse: vi.fn(),
  envSendingBranch: vi.fn(),
  novaPostWaybillsFor: vi.fn(() => ({ isConfigured: () => true })),
}))

vi.mock('@/features/shipping/services/carrier-accounts', () => ({
  carrierAccounts: { resolve: mocks.resolve, readWarehouse: mocks.readWarehouse },
}))
vi.mock('@/features/shipping/services/nova-post-waybills', () => ({
  envSendingBranch: mocks.envSendingBranch,
  novaPostWaybills: { isConfigured: () => true },
  novaPostWaybillsFor: mocks.novaPostWaybillsFor,
}))

import { Carrier } from '@/db/enums'
import { cabinetServiceFor } from '@/features/shipping/services/waybill-services'

const CABINET = {
  id: 'cabinet-1',
  name: 'Основной',
  apiKey: 'key-1',
  senderRef: 'sender-1',
  senderContactRef: 'contact-1',
  senderName: 'ФОП Косенко',
  senderPhone: '+380 63 063 06 77',
  isDefault: true,
  isActive: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolve.mockResolvedValue(CABINET)
})

describe('cabinetServiceFor', () => {
  it('sends from the branch picked in settings', async () => {
    mocks.readWarehouse.mockResolvedValue({ cityRef: 'city-s', warehouseRef: 'wh-s', label: '№30' })

    const { account } = await cabinetServiceFor(Carrier.NovaPost, 'cabinet-1')

    expect(account?.id).toBe('cabinet-1')
    expect(mocks.novaPostWaybillsFor).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: expect.objectContaining({ cityRef: 'city-s', warehouseRef: 'wh-s' }),
      }),
    )
  })

  it('keeps the cabinet and takes the environment branch while none is picked', async () => {
    // The workshop sends from one branch whichever cabinet writes the waybill;
    // a missing setting must not silently swap the cabinet for another sender.
    mocks.readWarehouse.mockResolvedValue(null)
    mocks.envSendingBranch.mockReturnValue({ cityRef: 'city-e', warehouseRef: 'wh-e' })

    const { account } = await cabinetServiceFor(Carrier.NovaPost, 'cabinet-1')

    expect(account?.id).toBe('cabinet-1')
    expect(mocks.novaPostWaybillsFor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'key-1',
        sender: expect.objectContaining({ cityRef: 'city-e', warehouseRef: 'wh-e' }),
      }),
    )
  })

  it('falls back to the single environment cabinet with no branch anywhere', async () => {
    mocks.readWarehouse.mockResolvedValue(null)
    mocks.envSendingBranch.mockReturnValue(null)

    const { account } = await cabinetServiceFor(Carrier.NovaPost, 'cabinet-1')

    expect(account).toBeNull()
  })
})
