import { getAdminOrders } from '@/features/admin/queries/get-admin-desk'
import { AdminPager, pageFromSearchParams } from '@/features/admin/ui/AdminPager'
import { TabLink } from '@/features/admin/ui/CatalogTabs'
import { OrderList } from '@/features/admin/ui/OrderList'
import { OrderStatusFilterSelect } from '@/features/admin/ui/OrderStatusFilterSelect'
import { statusFilterLabel } from '@/features/admin/ui/order-status'
import { ReturnStatsDialog } from '@/features/admin/ui/ReturnStatsDialog'
import { TrafficStatsDialog } from '@/features/admin/ui/TrafficStatsDialog'
import {
  ORDER_STATUS_FILTERS,
  OrderShelf,
  type OrderStatusFilter,
  parseOrderShelf,
  parseOrderStatusFilter,
  returnStatsMonths,
  trafficWeeks,
  type StatusFilterCounts,
} from '@/features/orders'
import { inputClassName } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { formatDateIsoKyiv, previousIsoDay } from '@/lib/datetime'
import { cn } from '@/lib/utils'

const ORDERS_PATH = '/admin/orders'
const SEARCH_MAX_LENGTH = 80

const SHELF_LABELS: Record<OrderShelf, string> = {
  [OrderShelf.Active]: 'Активные',
  [OrderShelf.Quick]: 'Уточнить',
  [OrderShelf.Returns]: 'Возвраты',
  [OrderShelf.Archive]: 'Архив',
}

const EMPTY_SHELF_TEXT: Record<OrderShelf, string> = {
  [OrderShelf.Active]: 'Активных заказов нет — всё отправлено и доставлено.',
  [OrderShelf.Quick]:
    'Заказов в один клик нет. Сюда сами попадают заказы, оформленные одним телефоном: отделение у них ещё не выбрано.',
  [OrderShelf.Returns]:
    'Возвратов нет. Сюда сами попадают посылки, от которых отказались или которые не забрали.',
  [OrderShelf.Archive]:
    'В архиве пока пусто: сюда попадают доставленные, отменённые и закрытые возвраты.',
}

type OrderTableProps = {
  readonly searchParams: PageProps<'/admin/orders'>['searchParams']
}

// Four shelves: the day's work; the phone-only orders waiting for a call;
// returns waiting to be closed; everything finished. The search box looks
// inside the open shelf.
export async function OrderTable({ searchParams }: OrderTableProps) {
  const params = await searchParams
  const shelf = parseOrderShelf(params.shelf)
  const search = typeof params.q === 'string' ? params.q.trim().slice(0, SEARCH_MAX_LENGTH) : ''
  const status = parseOrderStatusFilter(params.status)
  const { rows, page, pageCount, total, shelves, statusCounts } = await getAdminOrders(
    { shelf, search, status },
    pageFromSearchParams(params.page),
  )
  const today = formatDateIsoKyiv(new Date())
  const calendar = { today, yesterday: previousIsoDay(today) }

  if (Object.values(shelves).every((count) => count === 0)) {
    return (
      <div className="max-w-[80ch] rounded-card border border-subtle bg-surface p-6">
        <h1 className="mb-2 font-display text-[19px] font-bold text-ink">Заказов пока нет</h1>
        <p className="text-[13px] leading-relaxed text-muted">
          Заказы появятся здесь, как только покупатель оформит первый заказ. Нажмите на номер, чтобы
          открыть карточку заказа.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-3.5 font-display text-[19px] font-bold text-ink">Заказы</h1>
      <nav className="mb-5 flex gap-6 border-b border-subtle" aria-label="Разделы заказов">
        {Object.values(OrderShelf).map((entry) => (
          <TabLink
            key={entry}
            href={shelfHref(entry, search)}
            isActive={entry === shelf}
            label={SHELF_LABELS[entry]}
            count={shelves[entry]}
          />
        ))}
      </nav>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        {/* A plain GET form: the search lives in the address like the shelf. */}
        {/* Wide enough for a full order number, not so wide that it becomes
            the page: the row has other controls on the other shelves. */}
        <form action={ORDERS_PATH} className="max-w-[440px] min-w-[min(100%,320px)] flex-1">
          {shelf === OrderShelf.Active ? null : <input type="hidden" name="shelf" value={shelf} />}
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            name="q"
            type="search"
            defaultValue={search}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="Номер заказа, телефон или фамилия"
            aria-label="Поиск заказов"
            className={cn(inputClassName, 'w-full font-normal')}
          />
        </form>
        {search ? (
          <Button variant="quiet" size="sm" asChild>
            <a href={listHref(keptParams({ shelf, search: '', status }))}>Сбросить поиск</a>
          </Button>
        ) : null}
        {status ? (
          <Button variant="quiet" size="sm" asChild>
            <a href={listHref(keptParams({ shelf, search, status: null }))}>Все статусы</a>
          </Button>
        ) : null}
        {shelf === OrderShelf.Returns ? (
          <ReturnStatsDialog months={returnStatsMonths(new Date())} />
        ) : null}
        <TrafficStatsDialog weeks={trafficWeeks(new Date())} />
      </div>

      {total === 0 ? (
        <p className="mb-3.5 rounded-card border border-subtle bg-surface p-5 text-[13.5px] text-muted">
          {emptyListText({ shelf, search, status })}
        </p>
      ) : (
        <OrderList
          // Another shelf, search, status or page — another selection.
          key={`${shelf}-${search}-${status ?? 'all'}-${page}`}
          rows={rows}
          canIssueWaybills={shelf === OrderShelf.Active}
          calendar={shelf === OrderShelf.Active ? calendar : null}
          statusHeader={
            <OrderStatusFilterSelect
              basePath={ORDERS_PATH}
              options={statusOptions(statusCounts, status)}
              current={status}
              keptParams={keptParams({ shelf, search, status: null })}
            />
          }
        />
      )}

      <AdminPager
        basePath={ORDERS_PATH}
        page={page}
        pageCount={pageCount}
        keptParams={keptParams({ shelf, search, status })}
      />

      <p className="mt-3.5 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">
        «Активные» разбиты на три группы: «Нужна ТТН» — с ними работаете вы; «ТТН создана, ждут
        отправки» — накладная есть, но Новая Почта посылку ещё не приняла; «В дороге» — уже
        отправленные. Внутри группы заказы разложены по дням. Заказы в один клик — только телефон,
        без отделения — ждут во вкладке «Уточнить». Позвоните, впишите в карточке получателя и
        отделение: заказ сам перейдёт в «Активные» и станет готов к ТТН. «Отправлен» и «Доставлен»
        ставятся сами: раз в час заказы с ТТН сверяются с Новой Почтой, доставленные уходят в архив.
        Посылка, от которой отказались или которую не забрали, сама получает статус «Возврат» и ждёт
        во вкладке «Возвраты», пока её не отправят в архив; об этом приходит сообщение в Telegram.
        Наложенный платёж отмечается оплаченным при доставке. Заказ по счёту переведите в «Оплачен»
        вручную, когда деньги придут.
      </p>
    </div>
  )
}

type ListFilters = {
  readonly shelf: OrderShelf
  readonly search: string
  readonly status: OrderStatusFilter | null
}

function keptParams({ shelf, search, status }: ListFilters): Record<string, string> {
  return {
    ...(shelf === OrderShelf.Active ? {} : { shelf }),
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
  }
}

function listHref(params: Readonly<Record<string, string>>): string {
  const query = new URLSearchParams(params).toString()
  return query ? `${ORDERS_PATH}?${query}` : ORDERS_PATH
}

// Another tab holds other statuses, so switching tabs drops the status filter.
function shelfHref(shelf: OrderShelf, search: string): string {
  return listHref(keptParams({ shelf, search, status: null }))
}

// Only the statuses the open tab actually holds, plus the one picked even when
// it has emptied out, so the header never offers a filter that finds nothing.
function statusOptions(counts: StatusFilterCounts, current: OrderStatusFilter | null) {
  return ORDER_STATUS_FILTERS.filter((filter) => counts[filter] > 0 || filter === current).map(
    (filter) => ({ value: filter, label: statusFilterLabel(filter), count: counts[filter] }),
  )
}

function emptyListText({ shelf, search, status }: ListFilters): string {
  const statusPart = status ? ` со статусом «${statusFilterLabel(status)}»` : ''
  if (search) return `По запросу «${search}»${statusPart} ничего не нашли.`
  if (status) return `Заказов${statusPart} в этой вкладке нет.`

  return EMPTY_SHELF_TEXT[shelf]
}
