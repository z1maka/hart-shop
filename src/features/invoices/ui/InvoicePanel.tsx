'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { errorText } from '@/features/admin/ui/messages'
import { issueInvoiceAction, voidInvoiceAction } from '@/features/invoices/actions/invoice-actions'
import { InvoiceBlock, type InvoiceParty } from '@/features/invoices/model/invoice'
import type { OrderInvoicesView } from '@/features/invoices/queries/get-order-invoices'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type InvoicePanelProps = {
  readonly view: OrderInvoicesView
  // The account the order was told to pay to, as the admin names it.
  readonly transferAccountLabel: string | null
}

type Draft = {
  readonly buyerName: string
  readonly taxId: string
  readonly address: string
  readonly phone: string
  readonly validUntil: string
}

const BLOCK_HINTS: Record<InvoiceBlock, string> = {
  [InvoiceBlock.NotTransfer]: '',
  [InvoiceBlock.Closed]: 'Заказ отменён или возвращён — новый счёт ему не нужен.',
}

// The invoice of an order paid by transfer: made out here, printed from its
// own page, voided when it no longer matches. Numbers run through all
// invoices and never repeat.
export function InvoicePanel({ view, transferAccountLabel }: InvoicePanelProps) {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isVoiding, setIsVoiding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(work: () => Promise<{ ok: boolean; error?: { code: string; message: string } }>) {
    setError(null)
    startTransition(async () => {
      const result = await work()
      if (!result.ok && result.error) {
        setError(errorText(result.error))
        return
      }
      setIsFormOpen(false)
      setIsVoiding(false)
      router.refresh()
    })
  }

  const { live } = view

  return (
    <section className="rounded-card border border-subtle bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-ink">Счёт на оплату</h2>
        <StatusBadge isLive={live !== null} hasVoided={view.voided.length > 0} />
      </div>
      {transferAccountLabel ? (
        <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
          Оплата на счёт: <span className="font-semibold text-ink">{transferAccountLabel}</span>
        </p>
      ) : null}

      {live ? (
        <div className="grid gap-1">
          <p className="font-display text-[20px] font-semibold text-ink">
            № {live.number} · {live.totalLabel}
          </p>
          <p className="text-[12.5px] text-muted">
            от {live.issuedOn} · действителен до {live.validUntil}
          </p>
          <p className="text-[12.5px] text-muted">
            {[live.buyerName, live.buyerTaxLine].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button asChild size="sm">
              <Link href={`/admin/orders/${view.orderId}/invoice/`}>Открыть счёт</Link>
            </Button>
            <CopyBuyerLinkButton link={view.buyerLink} />
            <Button
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => setIsVoiding(true)}
            >
              Аннулировать
            </Button>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-faint">
            Счёт — снимок: цены, реквизиты и названия в нём не меняются после выставления. Ссылку
            можно отправить покупателю в мессенджер: счёт откроется без входа, там же его сохраняют
            в PDF. После аннулирования ссылка перестаёт открываться.
          </p>
        </div>
      ) : null}

      {!live && view.block ? (
        <p className="text-[12.5px] text-muted">{BLOCK_HINTS[view.block]}</p>
      ) : null}

      {!live && !view.block && !isFormOpen ? (
        <div className="grid gap-2.5">
          {view.voided.length > 0 ? (
            <p className="text-[12.5px] leading-relaxed text-muted">
              Новый счёт получит следующий номер — номера не повторяются.
            </p>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-muted">
              Номер присвоится при сохранении, по порядку.
            </p>
          )}
          <Button onClick={() => setIsFormOpen(true)}>Выставить счёт</Button>
        </div>
      ) : null}

      {isFormOpen ? (
        <IssueForm
          prefill={view.prefill}
          defaultValidUntil={view.defaultValidUntil}
          isPending={isPending}
          onCancel={() => setIsFormOpen(false)}
          onIssue={(draft) => run(() => issueInvoiceAction({ orderId: view.orderId, ...draft }))}
        />
      ) : null}

      {view.voided.length > 0 ? (
        <p className="mt-3 text-[12px] text-faint">
          Аннулированы:{' '}
          {view.voided.map((invoice) => `№ ${invoice.number} от ${invoice.issuedOn}`).join(', ')}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-[13px] font-medium text-alert">{error}</p> : null}

      {live ? (
        <ConfirmDialog
          isOpen={isVoiding}
          onOpenChange={setIsVoiding}
          title={`Аннулировать счёт № ${live.number}?`}
          confirmLabel="Аннулировать"
          cancelLabel="Оставить"
          isPending={isPending}
          isDestructive
          onConfirm={() => run(() => voidInvoiceAction({ invoiceId: live.id }))}
        >
          Номер сгорит и больше не выдаётся. Если партнёр уже получил этот счёт, предупредите его и
          выставьте новый.
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

function StatusBadge({
  isLive,
  hasVoided,
}: {
  readonly isLive: boolean
  readonly hasVoided: boolean
}) {
  return (
    <span
      className={cn(
        'rounded-pill px-2.5 py-1 text-[11px] font-semibold',
        isLive ? 'bg-accent-tint text-accent-hover' : 'bg-hover text-muted',
      )}
    >
      {statusLabel(isLive, hasVoided)}
    </span>
  )
}

function statusLabel(isLive: boolean, hasVoided: boolean): string {
  if (isLive) return 'Выставлен'
  return hasVoided ? 'Аннулирован' : 'Не выставлен'
}

type IssueFormProps = {
  readonly prefill: InvoiceParty
  readonly defaultValidUntil: string
  readonly isPending: boolean
  readonly onCancel: () => void
  readonly onIssue: (draft: Draft) => void
}

function IssueForm({ prefill, defaultValidUntil, isPending, onCancel, onIssue }: IssueFormProps) {
  const [draft, setDraft] = useState<Draft>({
    buyerName: prefill.name,
    taxId: prefill.taxId ?? '',
    address: prefill.address ?? '',
    phone: prefill.phone ?? '',
    validUntil: defaultValidUntil,
  })

  function change(key: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onIssue(draft)
      }}
    >
      <Field label="Покупатель — как в счёте">
        <input
          value={draft.buyerName}
          onChange={(event) => change('buyerName', event.target.value)}
          placeholder="ФОП Прізвище Ім’я По батькові або ТОВ «…»"
          maxLength={200}
          required
          className={inputClassName}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ЄДРПОУ / РНОКПП">
          <input
            value={draft.taxId}
            onChange={(event) => change('taxId', event.target.value)}
            placeholder="8 или 10 цифр"
            inputMode="numeric"
            maxLength={10}
            className={inputClassName}
          />
        </Field>
        <Field label="Действителен до">
          <input
            type="date"
            value={draft.validUntil}
            onChange={(event) => change('validUntil', event.target.value)}
            required
            className={inputClassName}
          />
        </Field>
      </div>
      <Field label="Адрес покупателя (необязательно)">
        <input
          value={draft.address}
          onChange={(event) => change('address', event.target.value)}
          maxLength={300}
          className={inputClassName}
        />
      </Field>
      <Field label="Телефон покупателя (необязательно)">
        <input
          value={draft.phone}
          onChange={(event) => change('phone', event.target.value)}
          maxLength={32}
          className={inputClassName}
        />
      </Field>
      <p className="text-[12px] leading-relaxed text-faint">
        По умолчанию счёт действителен 5 банковских дней. Состав и сумма берутся из заказа.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Сохраняем…' : 'Сохранить и присвоить номер'}
        </Button>
        <Button type="button" variant="quiet" disabled={isPending} onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  )
}

const COPIED_NOTE_MS = 2500

// The buyer's link goes to the clipboard; where the browser refuses that,
// the link opens in a new tab to be copied from the address bar.
function CopyBuyerLinkButton({ link }: { readonly link: string }) {
  const [isCopied, setIsCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), COPIED_NOTE_MS)
    } catch {
      window.open(link, '_blank', 'noopener')
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {isCopied ? 'Ссылка скопирована' : 'Ссылка для покупателя'}
    </Button>
  )
}
