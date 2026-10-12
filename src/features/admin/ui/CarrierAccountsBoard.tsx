'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addCarrierAccountAction,
  makeCarrierAccountDefaultAction,
  renameCarrierAccountAction,
  replaceCarrierKeyAction,
  setCarrierAccountActiveAction,
  setSenderWarehouseAction,
} from '@/features/admin/actions/carrier-account-actions'
import { AdminPointPicker, type PointChoice } from '@/features/admin/ui/AdminPointPicker'
import { errorText } from '@/features/admin/ui/messages'
import { Fact, RowAction } from '@/features/admin/ui/settings-parts'
import type { CarrierAccountView } from '@/features/admin/queries/get-carrier-accounts'
import type { SenderWarehouse } from '@/features/shipping'
import type { ActionResult } from '@/lib/action-result'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type BoardProps = {
  readonly accounts: readonly CarrierAccountView[]
  readonly warehouse: SenderWarehouse | null
}

type Editing = { readonly id: string; readonly field: 'name' | 'key' }

// Every cabinet is its own key and its own sender. A waybill leaves from the
// default one unless the order says otherwise, and once it exists it belongs
// to that cabinet for printing and deletion.
export function CarrierAccountsBoard({ accounts, warehouse }: BoardProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [isChangingBranch, setIsChangingBranch] = useState(false)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult<null>>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      setEditing(null)
      setIsAdding(false)
      setIsChangingBranch(false)
      router.refresh()
    })
  }

  function chooseBranch(choice: PointChoice | null) {
    if (!choice) return
    run(() =>
      setSenderWarehouseAction({
        pointRef: choice.pointRef,
        label: `${choice.settlementName} · ${choice.pointName}`,
      }),
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1.5 font-display text-[19px] font-bold text-ink">
            Отправители Новой Почты
          </h1>
          <p className="max-w-[70ch] text-[13px] leading-relaxed text-muted">
            Каждый кабинет — отдельный API-ключ и отправитель. Накладная создаётся от кабинета по
            умолчанию; в заказе его можно сменить перед созданием ТТН.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Отмена' : '+ Добавить кабинет'}
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-card border border-alert-edge bg-alert-soft px-4 py-3 text-[12.5px] font-medium text-alert">
          {error}
        </p>
      ) : null}

      {isAdding ? <AddCabinetForm isPending={isPending} onSubmit={run} /> : null}

      <section className="mb-4 rounded-card border border-subtle bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">
              Склад отправки для всех кабинетов
            </p>
            <p className="text-[12.5px] text-muted">
              {warehouse
                ? `${warehouse.label} · общий для всех отправителей, меняется в одном месте`
                : 'Ещё не выбран — накладные пойдут с отделения из переменных окружения.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsChangingBranch(!isChangingBranch)}
          >
            {isChangingBranch ? 'Отмена' : 'Изменить отделение'}
          </Button>
        </div>

        {isChangingBranch ? (
          <div className="mt-4 border-t border-subtle pt-4">
            <AdminPointPicker parcelWeightGrams={0} choice={null} onChoose={chooseBranch} />
          </div>
        ) : null}
      </section>

      <div className="grid gap-3">
        {accounts.map((account) => (
          <article
            key={account.id}
            className={cn(
              'rounded-card border bg-surface p-5',
              account.isDefault ? 'border-ink' : 'border-subtle',
            )}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <input
                type="radio"
                name="default-cabinet"
                checked={account.isDefault}
                disabled={isPending || !account.isActive}
                onChange={() => run(() => makeCarrierAccountDefaultAction({ id: account.id }))}
                aria-label={`Сделать «${account.name}» кабинетом по умолчанию`}
                className="size-4 accent-[var(--color-ink)]"
              />
              <p className="text-[14.5px] font-semibold text-ink">{account.name}</p>
              {account.isDefault ? <Chip tone="ink">По умолчанию</Chip> : null}
              {account.isActive ? null : <Chip tone="quiet">Отключён</Chip>}
              <KeyChip isWorking={account.isKeyWorking} />
            </div>

            <dl className="mb-3 grid gap-3 sm:grid-cols-4">
              <Fact label="Отправитель" value={account.senderName} />
              <Fact label="Контакт · телефон" value={account.senderPhone || '—'} />
              <Fact label="API-ключ" value={`••••••••${account.keyHint}`} />
              <Fact label="ТТН за месяц" value={String(account.issuedThisMonth)} />
            </dl>

            {editing?.id === account.id ? (
              <EditRow
                field={editing.field}
                isPending={isPending}
                onCancel={() => setEditing(null)}
                onSubmit={(value) =>
                  run(() =>
                    editing.field === 'name'
                      ? renameCarrierAccountAction({ id: account.id, name: value })
                      : replaceCarrierKeyAction({ id: account.id, apiKey: value }),
                  )
                }
              />
            ) : (
              <div className="flex flex-wrap gap-4 border-t border-subtle pt-3">
                <RowAction onClick={() => setEditing({ id: account.id, field: 'name' })}>
                  Изменить
                </RowAction>
                <RowAction onClick={() => setEditing({ id: account.id, field: 'key' })}>
                  Заменить ключ
                </RowAction>
                {account.isDefault ? null : (
                  <RowAction
                    tone="alert"
                    onClick={() =>
                      run(() =>
                        setCarrierAccountActiveAction({
                          id: account.id,
                          isActive: !account.isActive,
                        }),
                      )
                    }
                  >
                    {account.isActive ? 'Отключить' : 'Включить'}
                  </RowAction>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-card border border-subtle bg-surface p-6 text-[13px] leading-relaxed text-muted">
          Кабинетов пока нет — накладные создаются ключом из переменных окружения. Добавьте первый,
          и он станет кабинетом по умолчанию.
        </p>
      ) : null}

      <p className="mt-4 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">
        Отключённый кабинет не удаляется: уже созданные с него накладные продолжают отслеживаться и
        печататься его ключом. Кабинет по умолчанию отключить нельзя — сначала назначьте другой.
      </p>
    </div>
  )
}

function AddCabinetForm({
  isPending,
  onSubmit,
}: {
  readonly isPending: boolean
  readonly onSubmit: (action: () => Promise<ActionResult<null>>) => void
}) {
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(() => addCarrierAccountAction({ name, apiKey }))
      }}
      className="mb-4 rounded-card border border-subtle bg-surface p-5"
    >
      <p className="mb-3 text-[13px] font-semibold text-ink">Новый кабинет</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Название — например «Второй ФОП»"
          maxLength={60}
          required
          className={cn(inputClassName, 'w-full font-normal')}
        />
        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="API-ключ из кабинета Новой Почты"
          maxLength={120}
          required
          className={cn(inputClassName, 'w-full font-normal')}
        />
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-faint">
        Отправителя и контактное лицо подтянем из кабинета по этому ключу. Если ключ не подойдёт —
        кабинет не сохранится.
      </p>
      <Button type="submit" size="sm" className="mt-3" disabled={isPending}>
        {isPending ? 'Проверяем ключ…' : 'Добавить'}
      </Button>
    </form>
  )
}

function EditRow({
  field,
  isPending,
  onCancel,
  onSubmit,
}: {
  readonly field: 'name' | 'key'
  readonly isPending: boolean
  readonly onCancel: () => void
  readonly onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(value)
      }}
      className="flex flex-wrap items-center gap-2.5 border-t border-subtle pt-3"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={field === 'name' ? 'Название кабинета' : 'Новый API-ключ'}
        maxLength={120}
        required
        autoFocus
        className={cn(inputClassName, 'min-w-[min(100%,260px)] flex-1 font-normal')}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        Сохранить
      </Button>
      <RowAction onClick={onCancel}>Отмена</RowAction>
    </form>
  )
}

function KeyChip({ isWorking }: { readonly isWorking: boolean | null }) {
  if (isWorking === null) return <Chip tone="quiet">Проверить не удалось</Chip>
  return isWorking ? (
    <Chip tone="ok">✓ Ключ рабочий</Chip>
  ) : (
    <Chip tone="alert">Ключ не отвечает</Chip>
  )
}

function Chip({
  tone,
  children,
}: {
  readonly tone: 'ink' | 'ok' | 'alert' | 'quiet'
  readonly children: React.ReactNode
}) {
  const tones = {
    ink: 'bg-ink text-on-dark',
    ok: 'bg-accent-soft text-accent-hover',
    alert: 'bg-alert text-on-dark',
    quiet: 'bg-sunken text-muted',
  } as const

  return (
    <span
      className={cn(
        'inline-block rounded-pill px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
