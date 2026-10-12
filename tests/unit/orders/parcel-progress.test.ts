import { describe, expect, it } from 'vitest'
import { parcelStep } from '@/features/orders/model/parcel-progress'
import { novaPostParcelStage, ParcelStage } from '@/features/shipping/model/parcel-tracking'

const packed = { status: 'packed' }
const shipped = { status: 'shipped' }

describe('parcelStep', () => {
  it('ships a packed order once the carrier has the box, and tells the buyer', () => {
    expect(parcelStep(packed, ParcelStage.InTransit)).toEqual({
      status: 'shipped',
      announcesShipment: true,
      reportsRefusal: false,
    })
    expect(parcelStep(packed, ParcelStage.Arrived).status).toBe('shipped')
  })

  it('leaves a packed order alone while the waybill only exists', () => {
    expect(parcelStep(packed, ParcelStage.Created).status).toBeNull()
    expect(parcelStep(packed, ParcelStage.Missing).status).toBeNull()
    expect(parcelStep(packed, ParcelStage.Unknown).status).toBeNull()
  })

  it('does not ship an order twice', () => {
    expect(parcelStep(shipped, ParcelStage.Arrived)).toEqual({
      status: null,
      announcesShipment: false,
      reportsRefusal: false,
    })
  })

  it('delivers a collected parcel, without an "on its way" mail even from packed', () => {
    expect(parcelStep(shipped, ParcelStage.Received).status).toBe('delivered')
    expect(parcelStep(packed, ParcelStage.Received)).toEqual({
      status: 'delivered',
      announcesShipment: false,
      reportsRefusal: false,
    })
  })

  it('turns a refused or unclaimed parcel into a return and reports it', () => {
    expect(parcelStep(shipped, ParcelStage.Refused)).toEqual({
      status: 'refunded',
      announcesShipment: false,
      reportsRefusal: true,
    })
    expect(parcelStep(packed, ParcelStage.Refused).status).toBe('refunded')
  })
})

describe('novaPostParcelStage', () => {
  it('folds the carrier codes into stages', () => {
    expect(novaPostParcelStage('1')).toBe(ParcelStage.Created)
    expect(novaPostParcelStage('5')).toBe(ParcelStage.InTransit)
    expect(novaPostParcelStage('111')).toBe(ParcelStage.InTransit)
    expect(novaPostParcelStage('7')).toBe(ParcelStage.Arrived)
    expect(novaPostParcelStage('9')).toBe(ParcelStage.Received)
    expect(novaPostParcelStage('11')).toBe(ParcelStage.Received)
    expect(novaPostParcelStage('103')).toBe(ParcelStage.Refused)
    expect(novaPostParcelStage('105')).toBe(ParcelStage.Refused)
    expect(novaPostParcelStage('2')).toBe(ParcelStage.Missing)
    expect(novaPostParcelStage('3')).toBe(ParcelStage.Missing)
  })

  it('keeps a code it has not met as unknown rather than guessing', () => {
    expect(novaPostParcelStage('999')).toBe(ParcelStage.Unknown)
  })
})
