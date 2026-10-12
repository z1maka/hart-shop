import { ADMIN_ENQUIRIES_PER_PAGE, ADMIN_ORDERS_PER_PAGE } from '@/config/admin'
import { requireAdminSession } from '@/features/admin/session-cookie'
import { listEnquiries, type EnquiryListPage } from '@/features/enquiries'
import type { EnquiryStatus } from '@/db/enums'
import {
  getAdminOrder,
  listOrders,
  type AdminOrderView,
  type OrderListPage,
  type OrderListQuery,
} from '@/features/orders'

export async function getAdminOrders(query: OrderListQuery, page: number): Promise<OrderListPage> {
  await requireAdminSession()

  return listOrders(query, page, ADMIN_ORDERS_PER_PAGE)
}

export async function getAdminOrderView(orderId: string): Promise<AdminOrderView | null> {
  await requireAdminSession()

  return getAdminOrder(orderId)
}

export async function getAdminEnquiries(
  page: number,
  status?: EnquiryStatus,
): Promise<EnquiryListPage> {
  await requireAdminSession()

  return listEnquiries(page, ADMIN_ENQUIRIES_PER_PAGE, status)
}
