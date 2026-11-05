'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  addResellerAction,
  setResellerActiveAction,
  updateResellerAction,
} from '@/features/admin/actions/reseller-actions'
import type { ResellerView } from '@/features/admin/queries/get-resellers'
import { errorText } from '@/features/admin/ui/messages'
import {
  EMPTY_RESELLER,
  ResellerForm,
  type ResellerFormDraft,
} from '@/features/admin/ui/ResellerForm'
import { Fact, RowAction } from '@/features/admin/ui/settings-parts'
import type { ActionResult } from '@/lib/action-result'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { taxIdLabel } from '@/lib/tax-id'
import { cn } from '@/lib/utils'

type Editor = { readonly reseller: ResellerView | null } | null

// The partners who buy at the drop price and resell under their own name.
// Switched off, never deleted: their orders and invoices keep pointing at them.
export function ResellersBoard({ resellers }: { readonly resellers: readonly ResellerView[] }) {
  const router = useRouter()
  const [editor, setEditor] = useState<Editor>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult<unknown>>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      setEditor(null)
      router.refresh()
    })
  }

  function save(draft: ResellerFormDraft) {
    const reseller = editor?.reseller
    run(() =>
      reseller ? updateResellerAction({ ...draft, id: reseller.id }) : addResellerAction(draft),
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1.5 font-display text-[19px] font-bold text-ink">Партнёры</h1>
          <p className="max-w-[70ch] text-[13px] leading-relaxed text-muted">
            Покупают у нас по цене дропшиппера и продают от своего имени. Название и код идут в счёт
            как есть.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setError(null)
            setEditor({ reseller: null })
          }}
        >
          + Добавить партнёра
        </Button>
      </div>

      {error && editor === null ? (
        <p className="mb-4 text-[13px] font-medium text-alert">{error}</p>
      ) : null}

      <div className="grid gap-3">
        {resellers.map((reseller) => (
          <ResellerCard
            key={reseller.id}
            reseller={reseller}
            onEdit={() => {
              setError(null)
              setEditor({ reseller })
            }}
            onToggle={() =>
              run(() => setResellerActiveAction({ id: reseller.id, isActive: !reseller.isActive }))
            }
          />
        ))}
      </div>
      {resellers.length === 0 ? (
        <p className="rounded-card border border-subtle bg-surface p-6 text-[13px] leading-relaxed text-muted">
          Партнёров пока нет. Добавьте первого — и он появится в форме заказа партнёра.
        </p>
      ) : null}

      <Dialog
        isOpen={editor !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditor(null)
        }}
        title={editor?.reseller ? 'Изменить партнёра' : 'Новый партнёр'}
        className="max-h-[92vh] w-[min(720px,94vw)] overflow-y-auto"
      >
        {editor ? (
          <ResellerForm
            key={editor.reseller?.id ?? 'new'}
            initial={editor.reseller ? draftOf(editor.reseller) : EMPTY_RESELLER}
            submitLabel={editor.reseller ? 'Сохранить' : 'Добавить партнёра'}
            isPending={isPending}
            error={error}
            onSubmit={save}
          />
        ) : null}
      </Dialog>
    </div>
  )
}

function ResellerCard({
  reseller,
  onEdit,
  onToggle,
}: {
  readonly reseller: ResellerView
  readonly onEdit: () => void
  readonly onToggle: () => void
}) {
  return (
    <article
      className={cn(
        'rounded-card border border-subtle p-5',
        reseller.isActive ? 'bg-surface' : 'bg-hover opacity-80',
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <p className="text-[14.5px] font-semibold text-ink">{reseller.name}</p>
        <span
          className={cn(
            'rounded-pill px-2.5 py-1 text-[11px] font-semibold',
            reseller.isActive ? 'bg-accent-tint text-accent-hover' : 'bg-surface text-muted',
          )}
        >
          {reseller.isActive ? 'Активен' : 'Отключён'}
        </span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-4">
        <Fact label={taxIdLabel(reseller.taxId)} value={reseller.taxId} isMonospace />
        <Fact
          label="Контакт"
          value={[reseller.contactName, reseller.phone].filter(Boolean).join(' · ') || '—'}
        />
        <Fact label="Email" value={reseller.email ?? '—'} />
        <Fact label="Договор" value={reseller.contractRef ?? 'ещё нет'} />
      </dl>
      {reseller.note ? (
        <p className="mt-3 text-[12.5px] whitespace-pre-line text-muted">{reseller.note}</p>
      ) : null}
      <div className="mt-3.5 flex flex-wrap gap-4">
        <RowAction onClick={onEdit}>Изменить</RowAction>
        <RowAction onClick={onToggle} tone={reseller.isActive ? 'alert' : undefined}>
          {reseller.isActive ? 'Отключить' : 'Включить'}
        </RowAction>
      </div>
    </article>
  )
}

export function draftOf(reseller: ResellerView): ResellerFormDraft {
  return {
    name: reseller.name,
    taxId: reseller.taxId,
    contactName: reseller.contactName ?? '',
    phone: reseller.phone ?? '',
    email: reseller.email ?? '',
    legalAddress: reseller.legalAddress ?? '',
    payoutIban: reseller.payoutIban ?? '',
    contractRef: reseller.contractRef ?? '',
    note: reseller.note ?? '',
  }
}
