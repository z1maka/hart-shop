import { readAdminSession } from '@/features/admin'
import { errorText } from '@/features/admin/ui/messages'
import { orderShipmentService } from '@/features/orders'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const HTTP_NOT_FOUND = 404
const HTTP_BAD_GATEWAY = 502

// Their side failing is a gateway error the admin can retry; everything
// else means there is no label to give for this order.
const CARRIER_FAILURE_CODES: ReadonlySet<string> = new Set([
  'CARRIER_UNAVAILABLE',
  'CARRIER_ANSWER_MALFORMED',
])

// The 100×100 label for the thermal printer. A route handler rather than an
// action because a PDF is a download; it is served through us so the
// carrier key never reaches the browser.
export async function GET(
  _request: Request,
  context: RouteContext<'/admin/orders/[id]/label'>,
): Promise<Response> {
  const session = await readAdminSession()
  if (!session) return new Response('forbidden', { status: 403 })

  const { id } = await context.params

  try {
    const label = await orderShipmentService.labelPdf(id)
    return new Response(label.pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ttn-${label.number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (!(error instanceof AppError)) throw error

    logger.warn('Label not served', { orderId: id, code: error.code })
    const status = CARRIER_FAILURE_CODES.has(error.code) ? HTTP_BAD_GATEWAY : HTTP_NOT_FOUND
    return new Response(errorText({ code: error.code, message: error.message }), {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
}
