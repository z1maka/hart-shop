'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { Carrier, DeliveryKind } from '@/db/enums'
import {
  findPickupPointsAction,
  findSettlementsAction,
} from '@/features/checkout/actions/pickup-actions'
import type { PickupPoint, Settlement } from '@/features/shipping'
import { cn } from '@/lib/utils'
import { formatKilos } from '@/lib/weight'
import { inputClassName } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useTranslations } from 'next-intl'

type PickupPointPickerProps = {
  readonly carrier: Carrier
  readonly kind: DeliveryKind
  readonly country: string
  readonly countryName: string
  readonly selected: { readonly ref: string; readonly label: string } | null
  readonly onSelect: (point: { ref: string; label: string } | null) => void
  readonly parcelWeightGrams: number
}

const MIN_SEARCH_LENGTH = 3
// One request per pause in typing, not per keystroke: the directory is remote
// and every call costs database and carrier traffic.
const SEARCH_DEBOUNCE_MS = 350
// Below this the list is short enough to scan; a filter box would only add noise.
const FILTER_FROM_POINTS = 6

// Room on the right for the spinner that shows a directory request in flight.
const inputClass = cn(inputClassName, 'w-full pr-10')

type StepState = 'done' | 'active' | 'upcoming'

export function PickupPointPicker({
  carrier,
  kind,
  country,
  countryName,
  selected,
  onSelect,
  parcelWeightGrams,
}: PickupPointPickerProps) {
  const t = useTranslations('checkout.pickup')
  // A locker is not a branch: every label of the third step follows the kind
  // the person picked, so "У поштомат" never shows a "Відділення" heading.
  const kindKey = kind === 'locker' ? 'locker' : 'branch'
  const [citySearch, setCitySearch] = useState('')
  const [settlements, setSettlements] = useState<readonly Settlement[]>([])
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [pointSearch, setPointSearch] = useState('')
  const [points, setPoints] = useState<readonly PickupPoint[]>([])
  const [hiddenByWeight, setHiddenByWeight] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      if (pointTimer.current) clearTimeout(pointTimer.current)
    }
  }, [])

  function searchCities(value: string) {
    setCitySearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)

    if (value.trim().length < MIN_SEARCH_LENGTH) {
      setSettlements([])
      setNotice(null)
      return
    }

    searchTimer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await findSettlementsAction({ carrier, country, search: value })

        if (!result.ok) {
          setNotice(t(directoryNoticeKey(result.error.code)))
          setSettlements([])
          return
        }

        setNotice(result.data.length === 0 ? t('noTowns') : null)
        setSettlements(result.data)
      })
    }, SEARCH_DEBOUNCE_MS)
  }

  function chooseSettlement(next: Settlement) {
    setSettlement(next)
    setSettlements([])
    setCitySearch('')
    setPointSearch('')
    onSelect(null)

    startTransition(async () => {
      const result = await findPickupPointsAction({
        carrier,
        kind,
        country,
        settlementRef: next.ref,
        search: '',
        parcelWeightGrams,
      })

      if (!result.ok) {
        setNotice(t(directoryNoticeKey(result.error.code)))
        setPoints([])
        setHiddenByWeight(0)
        return
      }

      setNotice(result.data.points.length === 0 ? t('noPoints') : null)
      setPoints(result.data.points)
      setHiddenByWeight(result.data.hiddenByWeight)
    })
  }

  // The directory returns one page, so the branch search runs on the carrier's
  // side: typing "134" must find branch №134 even in a city with hundreds.
  function searchPoints(value: string) {
    setPointSearch(value)
    if (!settlement) return
    if (pointTimer.current) clearTimeout(pointTimer.current)

    const settlementRef = settlement.ref
    pointTimer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await findPickupPointsAction({
          carrier,
          kind,
          country,
          settlementRef,
          search: value,
          parcelWeightGrams,
        })

        if (!result.ok) {
          setNotice(t(directoryNoticeKey(result.error.code)))
          setPoints([])
          setHiddenByWeight(0)
          return
        }

        setNotice(result.data.points.length === 0 ? t('noPoints') : null)
        setPoints(result.data.points)
        setHiddenByWeight(result.data.hiddenByWeight)
      })
    }, SEARCH_DEBOUNCE_MS)
  }

  function resetCity() {
    setSettlement(null)
    setPoints([])
    setHiddenByWeight(0)
    setPointSearch('')
    setNotice(null)
    onSelect(null)
  }

  const visiblePoints = points.filter((point) =>
    pointSearch.trim() === ''
      ? true
      : `${point.name} ${point.address}`.toLowerCase().includes(pointSearch.trim().toLowerCase()),
  )

  const cityState: StepState = settlement ? 'done' : 'active'
  const pointState: StepState = pointStepState(Boolean(settlement), Boolean(selected))
  // One transition serves both directories; which step is waiting follows
  // from whether a city has been chosen yet.
  const isSearchingCities = isPending && settlement === null
  const isLoadingPoints = isPending && settlement !== null

  return (
    <div className="flex flex-col rounded-card border border-subtle bg-raised">
      <Step number={1} state="done" title={t('stepCountry')} isLast={false}>
        <ChosenChip label={countryName} />
      </Step>

      <Step number={2} state={cityState} title={t('stepCity')} isLast={false}>
        {settlement ? (
          <ChosenChip
            label={
              settlement.region ? `${settlement.name} · ${settlement.region}` : settlement.name
            }
            changeLabel={t('change')}
            onChange={resetCity}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <SearchField
              value={citySearch}
              placeholder={t('townPlaceholder', { count: MIN_SEARCH_LENGTH })}
              ariaLabel={t('town')}
              isBusy={isSearchingCities}
              busyLabel={t('looking')}
              onChange={searchCities}
              onEnter={() => {
                const first = settlements[0]
                if (first) chooseSettlement(first)
              }}
            />
            {settlements.length > 0 ? (
              <ul className="max-h-56 overflow-y-auto rounded-control border border-subtle bg-surface">
                {settlements.map((entry) => (
                  <li key={entry.ref}>
                    <button
                      type="button"
                      onClick={() => chooseSettlement(entry)}
                      className="flex w-full flex-col items-start gap-0.5 border-b border-subtle px-4 py-3 text-left last:border-b-0 hover:bg-hover"
                    >
                      <span className="text-[14px] text-ink">{entry.name}</span>
                      {entry.region ? (
                        <span className="text-[12px] text-faint">{entry.region}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </Step>

      <Step number={3} state={pointState} title={t(`stepPoint.${kindKey}`)} isLast>
        {pointStepContent()}
      </Step>

      {notice && !isPending ? (
        <p className="px-4.5 pb-3.5 text-[12.5px] text-muted">{notice}</p>
      ) : null}
    </div>
  )

  function pointStepContent() {
    if (!settlement) {
      return <p className="text-[12.5px] leading-relaxed text-faint">{t(`cityFirst.${kindKey}`)}</p>
    }

    if (selected) {
      return (
        <ChosenChip
          label={selected.label}
          changeLabel={t('change')}
          onChange={() => onSelect(null)}
        />
      )
    }

    // The carrier's name already spells out the street; adding the city is
    // what makes the label complete on the order, not a second copy of the
    // address.
    const choose = (point: PickupPoint) =>
      onSelect({ ref: point.ref, label: `${point.name} · ${settlement.name}` })

    return (
      <div className="flex flex-col gap-2">
        {points.length >= FILTER_FROM_POINTS || pointSearch.trim() !== '' ? (
          <SearchField
            value={pointSearch}
            placeholder={t('filterPoints')}
            ariaLabel={t('pointIn', { city: settlement.name })}
            isBusy={isLoadingPoints}
            busyLabel={t('looking')}
            onChange={searchPoints}
            onEnter={() => {
              const first = visiblePoints[0]
              if (first) choose(first)
            }}
          />
        ) : null}

        {isLoadingPoints && points.length === 0 ? (
          <p className="flex items-center gap-2.5 py-2 text-[12.5px] text-faint">
            <Spinner />
            {t(`loadingPoints.${kindKey}`)}
          </p>
        ) : null}

        {hiddenByWeight > 0 ? (
          <p className="text-[12.5px] leading-relaxed text-muted">
            {t(`hiddenByWeight.${kindKey}`, {
              count: hiddenByWeight,
              kg: formatKilos(parcelWeightGrams, 'uk-UA'),
            })}
          </p>
        ) : null}

        {visiblePoints.length > 0 ? (
          <ul className="max-h-64 overflow-y-auto rounded-control border border-subtle bg-raised">
            {visiblePoints.map((point) => (
              <li key={point.ref}>
                <button
                  type="button"
                  onClick={() => choose(point)}
                  className="flex w-full items-start justify-between gap-3 border-b border-subtle px-4 py-3 text-left last:border-b-0 hover:bg-hover"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-bold text-ink">{point.name}</span>
                    <span className="text-[12.5px] text-muted">{point.address}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }
}

type SearchFieldProps = {
  readonly value: string
  readonly placeholder: string
  readonly ariaLabel: string
  readonly isBusy: boolean
  readonly busyLabel: string
  readonly onChange: (value: string) => void
  readonly onEnter: () => void
}

// A directory search box: the spinner sits inside the field while the
// request is in flight, and Enter takes the first match so a keyboard user
// never has to reach for the list.
function SearchField({
  value,
  placeholder,
  ariaLabel,
  isBusy,
  busyLabel,
  onChange,
  onEnter,
}: SearchFieldProps) {
  return (
    <span className="relative block">
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          onEnter()
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={inputClass}
      />
      {isBusy ? (
        <Spinner label={busyLabel} className="absolute top-1/2 right-3.5 -translate-y-1/2" />
      ) : null}
    </span>
  )
}

type StepProps = {
  readonly number: number
  readonly state: StepState
  readonly title: string
  readonly isLast: boolean
  readonly children: React.ReactNode
}

function Step({ number, state, title, isLast, children }: StepProps) {
  return (
    <div
      className={cn('grid grid-cols-[28px_1fr] gap-x-3.5 px-4.5 pt-3.5', isLast ? 'pb-4' : 'pb-1')}
    >
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex size-6.5 items-center justify-center rounded-chip border-[1.5px] text-[12px] font-extrabold',
            state === 'done' && 'border-accent bg-accent text-accent-fg',
            state === 'active' && 'border-ink bg-raised text-ink',
            state === 'upcoming' && 'border-subtle bg-raised text-faint',
          )}
        >
          {state === 'done' ? <CheckIcon /> : number}
        </span>
        {isLast ? null : <span className="mt-1 w-px flex-1 bg-subtle" aria-hidden />}
      </div>

      <div className="pb-2.5">
        <p
          className={cn(
            'mb-1.5 pt-1 text-[12.5px] font-bold',
            state === 'upcoming' ? 'text-faint' : 'text-muted',
          )}
        >
          {title}
        </p>
        {children}
      </div>
    </div>
  )
}

function ChosenChip({
  label,
  changeLabel,
  onChange,
}: {
  readonly label: string
  readonly changeLabel?: string
  readonly onChange?: () => void
}) {
  return (
    <span className="flex flex-wrap items-center gap-2.5">
      <span className="text-[14px] font-extrabold text-ink">{label}</span>
      {changeLabel && onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="text-[12.5px] font-bold text-accent underline underline-offset-2 hover:text-ink"
        >
          {changeLabel}
        </button>
      ) : null}
    </span>
  )
}

function CheckIcon({ className }: { readonly className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={className}>
      <path
        d="m2.5 7.5 3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function pointStepState(hasCity: boolean, hasPoint: boolean): StepState {
  if (hasPoint) return 'done'
  return hasCity ? 'active' : 'upcoming'
}

function directoryNoticeKey(code: string): 'directoryDown' | 'searchFailed' {
  return code === 'CARRIER_UNAVAILABLE' ? 'directoryDown' : 'searchFailed'
}
