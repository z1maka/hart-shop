import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { HEADER_CHANNELS } from '@/config/contact'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import { ChannelIcon } from '@/components/layout/ChannelIcon'

export async function SupportBar() {
  const t = await getTranslations('supportBar')

  return (
    <div className="flex [scrollbar-width:none] flex-nowrap items-center justify-between gap-x-5.5 overflow-x-auto border-b border-subtle bg-hover px-4 py-2 sm:px-7">
      {/* The phone keeps the full opening hours; a narrow screen shows the
          working week only, so the offer beside it stays on screen. */}
      <span className="text-[12px] leading-relaxed whitespace-nowrap text-muted">
        <span className="sm:hidden">{t('hoursShort')}</span>
        <span className="hidden sm:inline">{t('hours')}</span>
      </span>

      {/* Below sm the header itself is only a burger and a cart, so the offer
          would hide behind the drawer; here it is on the first screen. */}
      <Link
        href={CUSTOM_ORDER_HREF}
        className="shrink-0 rounded-pill border-[1.5px] border-accent-edge bg-canvas px-3 py-1 text-[12px] font-semibold whitespace-nowrap text-accent-hover sm:hidden"
      >
        {t('customOrder')}
      </Link>

      <nav className="hidden items-center gap-1.5 sm:flex">
        {HEADER_CHANNELS.map((channel) => (
          <a
            key={channel.key}
            href={channel.href}
            aria-label={t(`aria.${channel.key}`)}
            {...externalLinkProps(channel.href)}
            className="flex min-h-9 min-w-9 items-center justify-center gap-2 rounded-chip px-2.5 text-[12px] font-semibold text-accent-hover transition-colors hover:bg-canvas hover:text-ink"
          >
            <ChannelIcon channel={channel.key} />
            {channel.key === 'phone' ? t('channels.phone') : null}
          </a>
        ))}
      </nav>
    </div>
  )
}

// tel: and mailto: hand over to another app anyway; only web destinations
// (YouTube, the messengers) should leave the shop in a fresh tab.
function externalLinkProps(href: string): { target?: string; rel?: string } {
  return href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}
