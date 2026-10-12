'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  findAdminPickupPointsAction,
  findAdminSettlementsAction,
} from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import { useLatestRequest } from '@/features/admin/ui/use-latest-request'
import type { PickupPoint, Settlement } from '@/features/shipping'
import { inputClassName } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { formatKilos } from '@/lib/weight'

const MIN_SEARCH_LENGTH = 3
// One request per pause in typing: the city search goes to the carrier.
export const SEARCH_DEBOUNCE_MS = 350

export type PointKind = 'branch' | 'locker'

export type PointChoice = {
  readonly kind: PointKind
  readonly pointRef: string
  readonly pointName: string
  readonly settlementName: string
}

const KIND_LABELS: Record<PointKind, string> = { branch: 'Отделение', locker: 'Почтомат' }

type AdminPointPickerProps = {
  readonly parcelWeightGrams: number
  readonly choice: PointChoice | null
  readonly onChoose: (choice: PointChoice | null) => void
}

export function AdminPointPicker({ parcelWeightGrams, choice, onChoose }: AdminPointPickerProps) {
  const [kind, setKind] = useState<PointKind>('branch')
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [points, setPoints] = useState<readonly PickupPoint[]>([])
  const [hiddenByWeight, setHiddenByWeight] = useState(0)
  const [pointSearch, setPointSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const pointTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beginRequest = useLatestRequest()

  useEffect(() => {
    return () => {
      if (pointTimer.current) clearTimeout(pointTimer.current)
    }
  }, [])

  // A new city or kind makes any answer still on its way — or a search still
  // waiting out the typing pause — about the old one.
  function dropPendingSearch() {
    if (pointTimer.current) clearTimeout(pointTimer.current)
    beginRequest()
  }

  function loadPoints(next: { settlement: Settlement; kind: PointKind; search: string }) {
    const isLatest = beginRequest()
    startTransition(async () => {
      const result = await findAdminPickupPointsAction({
        settlementRef: next.settlement.ref,
        kind: next.kind,
        search: next.search,
        parcelWeightGrams,
      }).catch(() => null)

      if (!isLatest()) return
      if (!result?.ok) {
        setNotice(result ? errorText(result.error) : 'Нет ответа от сервера.')
        setPoints([])
        setHiddenByWeight(0)
        return
      }
      setNotice(result.data.points.length === 0 ? 'Ничего не нашли.' : null)
      setPoints(result.data.points)
      setHiddenByWeight(result.data.hiddenByWeight)
    })
  }

  function chooseSettlement(next: Settlement) {
    dropPendingSearch()
    setSettlement(next)
    setPointSearch('')
    onChoose(null)
    loadPoints({ settlement: next, kind, search: '' })
  }

  function switchKind(next: PointKind) {
    dropPendingSearch()
    setKind(next)
    setPointSearch('')
    onChoose(null)
    if (settlement) loadPoints({ settlement, kind: next, search: '' })
  }

  function searchPoints(value: string) {
    setPointSearch(value)
    if (!settlement) return
    dropPendingSearch()
    pointTimer.current = setTimeout(
      () => loadPoints({ settlement, kind, search: value }),
      SEARCH_DEBOUNCE_MS,
    )
  }

  function resetCity() {
    dropPendingSearch()
    setSettlement(null)
    setPoints([])
    setHiddenByWeight(0)
    setNotice(null)
    onChoose(null)
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND_LABELS) as PointKind[]).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => switchKind(entry)}
            className={cn(
              'min-h-10 rounded-pill border px-4 text-[13px] font-semibold',
              kind === entry
                ? 'border-ink bg-ink text-on-dark'
                : 'border-strong bg-surface text-ink hover:border-faint',
            )}
          >
            {KIND_LABELS[entry]}
          </button>
        ))}
      </div>

      {settlement ? (
        <Chosen label={settlementLabel(settlement)} onChange={resetCity} />
      ) : (
        <CitySearch onChoose={chooseSettlement} />
      )}

      {settlement ? (
        <PointList
          kind={kind}
          points={points}
          choice={choice}
          search={pointSearch}
          isLoading={isPending}
          onSearch={searchPoints}
          onChoose={(point) =>
            onChoose({
              kind,
              pointRef: point.ref,
              pointName: point.name,
              settlementName: settlement.name,
            })
          }
          onReset={() => onChoose(null)}
        />
      ) : null}

      {hiddenByWeight > 0 && !choice ? (
        <p className="text-[12px] leading-relaxed text-faint">
          Посылка ≈ {formatKilos(parcelWeightGrams, 'ru-RU')} кг: скрыто {hiddenByWeight} — туда её
          не примут.
        </p>
      ) : null}
      {notice && !isPending ? <p className="text-[12.5px] text-muted">{notice}</p> : null}
    </div>
  )
}

export function CitySearch({ onChoose }: { readonly onChoose: (settlement: Settlement) => void }) {
  const [search, setSearch] = useState('')
  const [settlements, setSettlements] = useState<readonly Settlement[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beginRequest = useLatestRequest()

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function searchCities(value: string) {
    setSearch(value)
    if (timer.current) clearTimeout(timer.current)
    const isLatest = beginRequest()
    if (value.trim().length < MIN_SEARCH_LENGTH) {
      setSettlements([])
      setNotice(null)
      return
    }

    timer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await findAdminSettlementsAction({ search: value }).catch(() => null)
        if (!isLatest()) return
        if (!result?.ok) {
          setNotice(result ? errorText(result.error) : 'Нет ответа от сервера.')
          setSettlements([])
          return
        }
        setNotice(result.data.length === 0 ? 'Такого города не нашли.' : null)
        setSettlements(result.data)
      })
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="grid gap-2">
      <SearchInput
        label="Город"
        value={search}
        placeholder={`Введите ${MIN_SEARCH_LENGTH} или больше букв`}
        isBusy={isPending}
        onChange={searchCities}
      />
      <Options
        entries={settlements.map((entry) => ({
          key: entry.ref,
          title: entry.name,
          hint: entry.region,
          onPick: () => onChoose(entry),
        }))}
      />
      {notice && !isPending ? <p className="text-[12.5px] text-muted">{notice}</p> : null}
    </div>
  )
}

type PointListProps = {
  readonly kind: PointKind
  readonly points: readonly PickupPoint[]
  readonly choice: PointChoice | null
  readonly search: string
  readonly isLoading: boolean
  readonly onSearch: (value: string) => void
  readonly onChoose: (point: PickupPoint) => void
  readonly onReset: () => void
}

function PointList(props: PointListProps) {
  if (props.choice) return <Chosen label={props.choice.pointName} onChange={props.onReset} />

  return (
    <div className="grid gap-2">
      <SearchInput
        label={KIND_LABELS[props.kind]}
        value={props.search}
        placeholder="Номер или улица"
        isBusy={props.isLoading}
        onChange={props.onSearch}
      />
      <Options
        entries={props.points.map((point) => ({
          key: point.ref,
          title: point.name,
          hint: null,
          onPick: () => props.onChoose(point),
        }))}
      />
    </div>
  )
}

type SearchInputProps = {
  readonly label: string
  readonly value: string
  readonly placeholder: string
  readonly isBusy: boolean
  readonly onChange: (value: string) => void
}

export function SearchInput({ label, value, placeholder, isBusy, onChange }: SearchInputProps) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      {label}
      <span className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(inputClassName, 'w-full pr-10 font-normal')}
        />
        {isBusy ? (
          <span className="absolute top-1/2 right-3 -translate-y-1/2">
            <Spinner label="Ищем…" />
          </span>
        ) : null}
      </span>
    </label>
  )
}

type Option = {
  readonly key: string
  readonly title: string
  readonly hint: string | null
  readonly onPick: () => void
}

export function Options({ entries }: { readonly entries: readonly Option[] }) {
  if (entries.length === 0) return null

  return (
    <ul className="max-h-60 overflow-y-auto rounded-control border border-subtle bg-surface">
      {entries.map((entry) => (
        <li key={entry.key}>
          <button
            type="button"
            onClick={entry.onPick}
            className="flex w-full flex-col items-start gap-0.5 border-b border-subtle px-3.5 py-2.5 text-left last:border-b-0 hover:bg-hover"
          >
            <span className="text-[13px] text-ink">{entry.title}</span>
            {entry.hint ? <span className="text-[11.5px] text-faint">{entry.hint}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  )
}

export function Chosen({
  label,
  onChange,
}: {
  readonly label: string
  readonly onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-control border border-subtle bg-raised px-3.5 py-2.5">
      <span className="text-[13px] text-ink">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-[12.5px] font-semibold text-accent-hover hover:underline"
      >
        Изменить
      </button>
    </div>
  )
}

export function settlementLabel(settlement: Settlement): string {
  return settlement.region ? `${settlement.name} · ${settlement.region}` : settlement.name
}
