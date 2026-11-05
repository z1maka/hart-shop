import Image from 'next/image'
import type { InvoiceDocumentView } from '@/features/invoices/queries/get-invoice-document'

// The invoice as the buyer receives it: one A4 sheet, in Ukrainian, laid out
// as the first invoices made by hand (№ 343, 05.11.2026). The page prints it
// with the browser; nothing around the sheet goes on paper.

const LOGO_SRC = '/logo/hart-horizontal-dark.png'
const LOGO_HEIGHT = 34
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 683) / 160)

export function InvoiceDocument({ invoice }: { readonly invoice: InvoiceDocumentView }) {
  return (
    <article
      lang="uk"
      className="invoice-sheet relative mx-auto min-h-[297mm] w-[210mm] bg-white px-[16mm] py-[14mm] font-sans text-[10.5px] leading-[1.45] text-[#1a1f1a] shadow-card print:min-h-0 print:w-auto print:p-0 print:shadow-none"
    >
      {invoice.isVoid ? <VoidStamp /> : null}
      <header className="flex items-center justify-between border-b-2 border-[#1f2a1f] pb-2.5">
        <Image src={LOGO_SRC} alt="Гарт" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority />
        <p className="text-right text-[9.5px] text-[#4a5446]">
          {invoice.site}
          <br />
          {invoice.seller.phone}
        </p>
      </header>

      <h1 className="mt-[18px] mb-1 font-display text-[20px] font-semibold tracking-[0.01em] normal-case">
        Рахунок на оплату № {invoice.number} від {invoice.issuedOnLong}
      </h1>
      <p className="mb-4 text-[#4a5446]">Замовлення {invoice.orderReference}</p>

      <Party label="Постачальник">
        <b>{invoice.seller.name}</b>
        <span>РНОКПП {invoice.seller.taxId}</span>
        <span>Адреса: {invoice.seller.addressLines.join(', ')}</span>
        <span>
          IBAN{' '}
          <span className="font-mono text-[10px] tracking-[0.02em]">
            {invoice.seller.ibanGrouped}
          </span>
        </span>
        <span>
          {invoice.seller.bankName}, МФО {invoice.seller.mfo}, ЄДРПОУ банку{' '}
          {invoice.seller.bankEdrpou}
        </span>
        <span>
          Тел. {invoice.seller.phone}, {invoice.seller.email}
        </span>
        <span>Платник єдиного податку, не є платником ПДВ</span>
      </Party>
      <Party label="Покупець">
        <b>{invoice.buyer.name}</b>
        {invoice.buyer.taxLine ? <span>{invoice.buyer.taxLine}</span> : null}
        {invoice.buyer.address ? <span>Адреса: {invoice.buyer.address}</span> : null}
        {invoice.buyer.phone ? <span>Тел. {invoice.buyer.phone}</span> : null}
      </Party>

      <LinesTable invoice={invoice} />
      <Totals invoice={invoice} />

      <p className="mt-3">
        Всього найменувань {invoice.lines.length}, на суму {invoice.totalLabel} грн.
        <br />
        <b>{invoice.totalInWords}, без ПДВ</b>
      </p>

      <div className="mt-4 grid gap-[3px] rounded-[6px] border-[1.5px] border-[#1f2a1f] px-[11px] py-[9px]">
        <span className={LABEL_CLASS}>Призначення платежу</span>
        <span>{invoice.paymentPurpose}</span>
      </div>

      <ul className="mt-3 list-disc pl-4 text-[#2e352d]">
        <li>Рахунок дійсний до {invoice.validUntil} включно.</li>
        <li>Товар відправляємо Новою Поштою після надходження коштів на рахунок.</li>
        <li>
          Доставка не входить у суму рахунку: за тарифами Нової Пошти, сплачує одержувач при
          отриманні.
        </li>
        <li>Видаткову накладну надаємо разом із відвантаженням товару.</li>
      </ul>

      <div className="mt-[34px] flex items-end gap-2.5">
        <span>Виписав(ла):</span>
        <span className="h-[18px] w-[170px] border-b border-[#1a1f1a]" />
        <span>{invoice.signatory}</span>
      </div>
    </article>
  )
}

const LABEL_CLASS = 'text-[8.5px] font-bold tracking-[0.06em] text-[#4a5446] uppercase'

function Party({
  label,
  children,
}: {
  readonly label: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2.5 border-b border-[#d5d9cf] py-[9px]">
      <span className={`${LABEL_CLASS} pt-0.5`}>{label}</span>
      <div className="grid">{children}</div>
    </div>
  )
}

const TH_CLASS = 'bg-[#1f2a1f] px-[7px] py-1.5 text-left text-[9px] font-semibold text-[#eef0e8]'
const TD_CLASS = 'border-b border-[#d5d9cf] p-[7px] align-top'

function LinesTable({ invoice }: { readonly invoice: InvoiceDocumentView }) {
  return (
    <table className="mt-4 w-full border-collapse print:[print-color-adjust:exact]">
      <thead>
        <tr>
          <th className={`${TH_CLASS} w-[22px]`}>№</th>
          <th className={TH_CLASS}>Артикул</th>
          <th className={TH_CLASS}>Товар</th>
          <th className={`${TH_CLASS} text-center`}>Од.</th>
          <th className={`${TH_CLASS} text-right`}>К-сть</th>
          <th className={`${TH_CLASS} text-right`}>Ціна без ПДВ, грн</th>
          <th className={`${TH_CLASS} text-right`}>Сума без ПДВ, грн</th>
        </tr>
      </thead>
      <tbody>
        {invoice.lines.map((line, index) => (
          <tr key={`${line.sku}-${index}`}>
            <td className={TD_CLASS}>{index + 1}</td>
            <td className={`${TD_CLASS} text-[9.5px] whitespace-nowrap text-[#4a5446]`}>
              {line.sku}
            </td>
            <td className={TD_CLASS}>{line.name}</td>
            <td className={`${TD_CLASS} text-center`}>шт.</td>
            <td className={`${TD_CLASS} text-right`}>{line.quantity}</td>
            <td className={`${TD_CLASS} text-right whitespace-nowrap`}>{line.unitPriceLabel}</td>
            <td className={`${TD_CLASS} text-right whitespace-nowrap`}>{line.sumLabel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Totals({ invoice }: { readonly invoice: InvoiceDocumentView }) {
  return (
    <table className="mt-2 ml-auto w-[260px] border-collapse">
      <tbody>
        <tr>
          <td className="px-[7px] py-[3px]">Разом:</td>
          <td className="px-[7px] py-[3px] text-right whitespace-nowrap">{invoice.totalLabel}</td>
        </tr>
        <tr>
          <td className="px-[7px] py-[3px]">ПДВ:</td>
          <td className="px-[7px] py-[3px] text-right">без ПДВ</td>
        </tr>
        <tr className="text-[12px] font-bold">
          <td className="border-t-[1.5px] border-[#1f2a1f] px-[7px] pt-1.5">Всього до сплати:</td>
          <td className="border-t-[1.5px] border-[#1f2a1f] px-[7px] pt-1.5 text-right whitespace-nowrap">
            {invoice.totalLabel}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// A voided invoice can still be opened to check what the buyer was sent; it
// must never pass for a live one on paper.
function VoidStamp() {
  return (
    <span className="pointer-events-none absolute top-[40%] left-1/2 -translate-x-1/2 -rotate-12 rounded-[6px] border-4 border-alert px-6 py-2 font-display text-[40px] font-bold tracking-[0.1em] text-alert opacity-70">
      АНУЛЬОВАНО
    </span>
  )
}
