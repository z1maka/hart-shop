'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BankAccountDraft } from '@/config/requisites'
import {
  activateBankAccountAction,
  addBankAccountAction,
  deleteBankAccountAction,
  updateBankAccountAction,
} from '@/features/admin/actions/bank-account-actions'
import type { BankAccountView } from '@/features/admin/queries/get-bank-accounts'
import { BankAccountForm, EMPTY_BANK_ACCOUNT } from '@/features/admin/ui/BankAccountForm'
import { errorText } from '@/features/admin/ui/messages'
import { Fact, RowAction } from '@/features/admin/ui/settings-parts'
import type { ActionResult } from '@/lib/action-result'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { ibanTail } from '@/lib/iban'
import { cn } from '@/lib/utils'

// Null while no modal is open; the edited account travels with the modal so
// the form starts from what is stored.
type Editor = { readonly account: BankAccountView | null } | null

// Several accounts, one shown on the site. The active one is switched with
// the radio, never deleted: a buyer mid-payment must always find an account.
export function BankAccountsBoard({ accounts }: { readonly accounts: readonly BankAccountView[] }) {
  const router = useRouter()
  const [editor, setEditor] = useState<Editor>(null)
  const [deleting, setDeleting] = useState<BankAccountView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult<null>>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      setEditor(null)
      setDeleting(null)
      router.refresh()
    })
  }

  function save(draft: BankAccountDraft) {
    const account = editor?.account
    run(() =>
      account ? updateBankAccountAction({ ...draft, id: account.id }) : addBankAccountAction(draft),
    )
  }

  // A modal starts clean: an error from the board, or from the modal closed
  // before, is not about what the admin is about to do.
  function openEditor(account: BankAccountView | null) {
    setError(null)
    setEditor({ account })
  }

  function openDelete(account: BankAccountView) {
    setError(null)
    setDeleting(account)
  }

  function closeModals() {
    setEditor(null)
    setDeleting(null)
    setError(null)
  }

  function closeWhenDismissed(isOpen: boolean) {
    if (!isOpen) closeModals()
  }

  const isModalOpen = editor !== null || deleting !== null

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1.5 font-display text-[19px] font-bold text-ink">
            Реквизиты для оплаты
          </h1>
          <p className="max-w-[70ch] text-[13px] leading-relaxed text-muted">
            Счета, на которые платит покупатель, выбравший «За реквізитами». На сайте виден только
            активный: на странице заказа, в письме-подтверждении и на странице «Про нас».
          </p>
        </div>
        <Button size="sm" onClick={() => openEditor(null)}>
          + Добавить счёт
        </Button>
      </div>

      {error && !isModalOpen ? <ErrorNote text={error} /> : null}

      <div className="grid gap-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isPending={isPending}
            onActivate={() => run(() => activateBankAccountAction({ id: account.id }))}
            onEdit={() => openEditor(account)}
            onDelete={() => openDelete(account)}
          />
        ))}
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-card border border-subtle bg-surface p-6 text-[13px] leading-relaxed text-muted">
          Счетов пока нет — покупатель, выбравший оплату по реквизитам, увидит «Реквізити надішлемо
          окремо». Добавьте первый, и он сразу станет активным.
        </p>
      ) : null}

      <p className="mt-4 max-w-[80ch] text-[12.5px] leading-relaxed text-faint">
        Активный счёт удалить нельзя — сначала сделайте активным другой. Смена активного счёта сразу
        меняет реквизиты на сайте, в том числе у неоплаченных заказов.
      </p>

      <Dialog
        isOpen={editor !== null}
        onOpenChange={closeWhenDismissed}
        title={editor?.account ? 'Изменить счёт' : 'Новый счёт'}
        className="max-h-[92vh] overflow-y-auto"
      >
        {editor ? (
          <BankAccountForm
            key={editor.account?.id ?? 'new'}
            initial={editor.account ? draftOf(editor.account) : EMPTY_BANK_ACCOUNT}
            submitLabel={editor.account ? 'Сохранить' : 'Добавить счёт'}
            isPending={isPending}
            error={error}
            onSubmit={save}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={closeWhenDismissed}
        title="Удалить счёт?"
        confirmLabel={isPending ? 'Удаляем…' : 'Удалить'}
        cancelLabel="Отмена"
        isPending={isPending}
        isDestructive
        onConfirm={() => {
          if (deleting) run(() => deleteBankAccountAction({ id: deleting.id }))
        }}
      >
        {deleting ? (
          <>
            <p>
              «{deleting.name}» · {deleting.bankName}, IBAN …{ibanTail(deleting.iban)} исчезнет из
              списка. Вернуть его можно, только добавив заново.
            </p>
            {error ? <ErrorNote text={error} /> : null}
          </>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}

function AccountCard({
  account,
  isPending,
  onActivate,
  onEdit,
  onDelete,
}: {
  readonly account: BankAccountView
  readonly isPending: boolean
  readonly onActivate: () => void
  readonly onEdit: () => void
  readonly onDelete: () => void
}) {
  return (
    <article
      className={cn(
        'rounded-card border bg-surface p-5',
        account.isActive ? 'border-ink' : 'border-subtle',
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <input
          type="radio"
          name="active-bank-account"
          checked={account.isActive}
          disabled={isPending}
          onChange={onActivate}
          aria-label={`Показывать на сайте «${account.name}»`}
          className="size-4 accent-[var(--color-ink)]"
        />
        <p className="text-[14.5px] font-semibold text-ink">{account.name}</p>
        {account.isActive ? (
          <span className="inline-block rounded-pill bg-ink px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-on-dark">
            Показывается на сайте
          </span>
        ) : null}
      </div>

      <dl className="mb-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Fact label="Получатель" value={account.recipient} />
        <Fact label="IBAN" value={account.ibanGrouped} isMonospace />
        <Fact label="ИНН / ЕДРПОУ" value={account.taxId} />
        <Fact
          label="Банк"
          value={`${account.bankName} · МФО ${account.mfo} · ЕДРПОУ ${account.bankEdrpou}`}
        />
      </dl>

      <div className="flex flex-wrap gap-4 border-t border-subtle pt-3">
        <RowAction onClick={onEdit}>Изменить</RowAction>
        {account.isActive ? null : (
          <RowAction tone="alert" onClick={onDelete}>
            Удалить
          </RowAction>
        )}
      </div>
    </article>
  )
}

function draftOf(account: BankAccountView): BankAccountDraft {
  return {
    name: account.name,
    recipient: account.recipient,
    iban: account.ibanGrouped,
    taxId: account.taxId,
    bankName: account.bankName,
    bankEdrpou: account.bankEdrpou,
  }
}

function ErrorNote({ text }: { readonly text: string }) {
  return (
    <p className="mt-3 mb-4 rounded-card border border-alert-edge bg-alert-soft px-4 py-3 text-[12.5px] font-medium text-alert">
      {text}
    </p>
  )
}
