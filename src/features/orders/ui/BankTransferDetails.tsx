import { getTranslations } from 'next-intl/server'
import { CopyButton } from '@/components/ui/CopyButton'
import { getActiveBankAccount, type BankRequisitesView } from '@/features/billing'
import {
  transferAmountText,
  transferSummary,
  type TransferDetail,
} from '@/features/orders/model/transfer-details'
import { cn } from '@/lib/utils'

type TransferPayment = {
  readonly amountLabel: string
  readonly amountCents: number
  readonly paymentPurpose: string
}

type BankTransferDetailsProps = TransferPayment & {
  // The account fixed on the order; the active one stands in for an order
  // placed before accounts were kept on it.
  readonly requisites: BankRequisitesView | null
}

type DetailLabelKey =
  'recipient' | 'iban' | 'taxId' | 'bank' | 'mfo' | 'bankEdrpou' | 'amount' | 'purpose'

type CopyLabels = { readonly copy: string; readonly copied: string; readonly failed: string }

// Everything a buyer needs to pay from any banking app, with every field one
// tap away from the clipboard.
export async function BankTransferDetails({
  requisites: fixed,
  ...payment
}: BankTransferDetailsProps) {
  const [requisites, t] = await Promise.all([
    fixed ?? getActiveBankAccount(),
    getTranslations('orderPage.transfer'),
  ])

  if (!requisites) return <RequisitesPending title={t('title')} note={t('pending')} />

  const details = transferDetails(requisites, payment, t)
  const labels = { copy: t('copy'), copied: t('copied'), failed: t('copyFailed') }

  return (
    <section className="mb-6 rounded-card border border-accent bg-surface p-6">
      <h2 className="mb-2 font-display text-h3 font-bold text-ink">{t('title')}</h2>
      <p className="mb-5 max-w-[70ch] text-[13.5px] leading-relaxed text-muted">
        {t('lead', { amount: payment.amountLabel })}
      </p>

      <dl className="grid gap-x-6 gap-y-4 text-[14px] sm:grid-cols-[max-content_1fr] sm:gap-y-3">
        {details.map((detail) => (
          <DetailLine key={detail.key} detail={detail} labels={labels} />
        ))}
      </dl>

      <CopyButton
        value={transferSummary(details)}
        labels={{ ...labels, copy: t('copyAll') }}
        subject={t('title')}
        className="mt-5 min-h-10 px-4 text-[13px]"
      />
    </section>
  )
}

function RequisitesPending({ title, note }: { title: string; note: string }) {
  return (
    <section className="mb-6 rounded-card border border-accent bg-surface p-6">
      <h2 className="mb-2 font-display text-h3 font-bold text-ink">{title}</h2>
      <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-muted">{note}</p>
    </section>
  )
}

function transferDetails(
  requisites: BankRequisitesView,
  payment: TransferPayment,
  label: (key: DetailLabelKey) => string,
): readonly TransferDetail[] {
  const { recipient, iban, ibanGrouped, taxId, bankName, mfo, bankEdrpou } = requisites
  const bank = `${bankName}, ${label('mfo')} ${mfo}`

  return [
    { key: 'recipient', label: label('recipient'), value: recipient, copyValue: recipient },
    { key: 'iban', label: label('iban'), value: ibanGrouped, copyValue: iban, isMonospace: true },
    { key: 'taxId', label: label('taxId'), value: taxId, copyValue: taxId },
    { key: 'bank', label: label('bank'), value: bank },
    { key: 'bankEdrpou', label: label('bankEdrpou'), value: bankEdrpou, copyValue: bankEdrpou },
    {
      key: 'amount',
      label: label('amount'),
      value: payment.amountLabel,
      copyValue: transferAmountText(payment.amountCents),
      // Forwarded to a person, the sum reads better with its currency.
      summaryValue: payment.amountLabel,
    },
    {
      key: 'purpose',
      label: label('purpose'),
      value: payment.paymentPurpose,
      copyValue: payment.paymentPurpose,
    },
  ]
}

function DetailLine({ detail, labels }: { detail: TransferDetail; labels: CopyLabels }) {
  return (
    <div className="grid gap-1 sm:col-span-2 sm:grid-cols-subgrid sm:items-center">
      <dt className="text-muted">{detail.label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className={cn(
            'font-semibold break-words text-ink select-all',
            detail.isMonospace && 'font-mono tracking-[0.02em] break-all',
          )}
        >
          {detail.value}
        </span>
        {detail.copyValue ? (
          <CopyButton value={detail.copyValue} labels={labels} subject={detail.label} />
        ) : null}
      </dd>
    </div>
  )
}
