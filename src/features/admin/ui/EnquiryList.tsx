import Link from 'next/link'
import { getAdminEnquiries } from '@/features/admin/queries/get-admin-desk'
import { EnquiryStatusControls } from '@/features/admin/ui/EnquiryStatusControls'
import { AdminPager, pageFromSearchParams } from '@/features/admin/ui/AdminPager'
import { EnquiryKind, EnquiryStatus } from '@/db/enums'
import { cn } from '@/lib/utils'

type EnquiryListProps = {
  readonly searchParams: PageProps<'/admin/enquiries'>['searchParams']
}

const KIND_LABELS: Record<EnquiryKind, string> = {
  [EnquiryKind.Quote]: 'Пошив на заказ',
  [EnquiryKind.Distributor]: 'Дистрибуция',
  [EnquiryKind.Contact]: 'Сообщение',
  [EnquiryKind.Partner]: 'Сотрудничество',
}

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  [EnquiryStatus.New]: 'Новая',
  [EnquiryStatus.InProgress]: 'В работе',
  [EnquiryStatus.Closed]: 'Закрыта',
}

const STATUS_CLASSES: Record<EnquiryStatus, string> = {
  [EnquiryStatus.New]: 'bg-alert-soft text-alert',
  [EnquiryStatus.InProgress]: 'bg-accent-soft text-accent-hover',
  [EnquiryStatus.Closed]: 'bg-sunken text-muted',
}

const FILTER_TABS: readonly { value: EnquiryStatus | null; label: string }[] = [
  { value: null, label: 'Все' },
  { value: EnquiryStatus.New, label: 'Новые' },
  { value: EnquiryStatus.InProgress, label: 'В работе' },
  { value: EnquiryStatus.Closed, label: 'Закрытые' },
]

function statusFromParam(value: string | string[] | undefined): EnquiryStatus | undefined {
  return typeof value === 'string' && (Object.values(EnquiryStatus) as string[]).includes(value)
    ? (value as EnquiryStatus)
    : undefined
}

export async function EnquiryList({ searchParams }: EnquiryListProps) {
  const params = await searchParams
  const statusFilter = statusFromParam(params.status)
  const { rows, page, pageCount, total } = await getAdminEnquiries(
    pageFromSearchParams(params.page),
    statusFilter,
  )

  if (total === 0 && !statusFilter) {
    return (
      <div className="max-w-[80ch] rounded-card border border-subtle bg-surface p-6">
        <h1 className="mb-2 font-display text-[19px] font-bold text-ink">Заявок пока нет</h1>
        <p className="text-[13px] leading-relaxed text-muted">
          Каждая форма с сайта попадает и сюда, и на почту. Уведомление — удобство, а записью служит
          этот список.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-3.5 font-display text-[19px] font-bold text-ink">Заявки</h1>

      <nav className="mb-3.5 flex flex-wrap gap-1 rounded-pill border border-subtle bg-surface p-1">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/enquiries?status=${tab.value}` : '/admin/enquiries'}
            aria-current={(statusFilter ?? null) === tab.value ? 'page' : undefined}
            className={cn(
              'rounded-pill px-3.5 py-2 text-[12.5px] font-semibold',
              (statusFilter ?? null) === tab.value
                ? 'bg-raised text-ink shadow-tab'
                : 'text-muted hover:text-ink',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-card border border-subtle bg-surface p-5 text-[13.5px] text-muted">
          В этом статусе заявок нет.
        </p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((enquiry) => (
          <article
            key={enquiry.id}
            className="flex flex-wrap items-center gap-4 rounded-card border border-subtle bg-surface px-4.5 py-4"
          >
            <div className="min-w-0 flex-[1_1_300px]">
              <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] font-semibold text-ink">{enquiry.reference}</span>
                <span className="rounded-pill bg-sunken px-2.5 py-1.5 text-[11px] font-semibold text-muted">
                  {KIND_LABELS[enquiry.kind]}
                </span>
                <span
                  className={cn(
                    'rounded-pill px-2.5 py-1.5 text-[11px] font-semibold',
                    STATUS_CLASSES[enquiry.status],
                  )}
                >
                  {STATUS_LABELS[enquiry.status]}
                </span>
              </div>
              <p className="text-[14px] font-semibold text-ink">
                {enquiry.country ? `${enquiry.who} · ${enquiry.country}` : enquiry.who}
              </p>
              <details className="group mt-1">
                <summary className="cursor-pointer list-none">
                  <span className="line-clamp-2 text-[12.5px] whitespace-pre-line text-muted group-open:hidden">
                    {enquiry.detail}
                  </span>
                  <span className="hidden text-[12px] font-semibold text-accent-hover group-open:inline">
                    Свернуть
                  </span>
                  <span className="text-[12px] font-semibold text-accent-hover group-open:hidden">
                    Показать целиком
                  </span>
                </summary>
                <p className="mt-1.5 text-[12.5px] leading-relaxed whitespace-pre-line text-muted">
                  {enquiry.detail}
                </p>
              </details>
              <span className="mt-1.5 flex flex-wrap items-center gap-3">
                {enquiry.phone ? (
                  <a
                    href={`tel:${enquiry.phone.replace(/[^\d+]/g, '')}`}
                    className="text-[12.5px] font-semibold text-accent-hover hover:underline"
                  >
                    {enquiry.phone}
                  </a>
                ) : null}
                {enquiry.email ? (
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="text-[12.5px] font-semibold text-accent-hover hover:underline"
                  >
                    {enquiry.email}
                  </a>
                ) : null}
                {enquiry.telegram ? (
                  <span className="text-[12.5px] text-muted">{enquiry.telegram}</span>
                ) : null}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              <span className="text-[12px] whitespace-nowrap text-muted">{enquiry.receivedAt}</span>
              <EnquiryStatusControls enquiryId={enquiry.id} status={enquiry.status} />
            </div>
          </article>
        ))}
      </div>

      <AdminPager basePath="/admin/enquiries" page={page} pageCount={pageCount} />

      <p className="mt-4 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">
        Каждая форма с сайта попадает и сюда, и на почту. Уведомление — удобство, а записью служит
        этот список: без него оптовые заявки теряются в переписке.
      </p>
    </div>
  )
}
