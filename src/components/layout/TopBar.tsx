import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChannelIcon } from '@/components/layout/ChannelIcon'
import { HEADER_CHANNELS, type HeaderChannel } from '@/config/contact'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'

// The dark strip above the header: what the shop promises on the left, how to
// reach it on the right, on one line from 360px up. Below 1024px the promise
// gives way to the contacts; the full opening hours show only where they fit
// beside it, and on a phone the messengers shrink to their marks. Below 768px,
// where the header has no room for its custom-order button, the link to that
// page takes the place of the hours: most shoppers come from a phone (owner,
// 15.10.2026).
export async function TopBar() {
  const [announcementT, t, navT] = await Promise.all([
    getTranslations('announcement'),
    getTranslations('supportBar'),
    getTranslations('nav'),
  ])

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 bg-footer px-4 py-2 sm:px-7">
      <span className="hidden text-[12px] font-semibold tracking-[0.02em] text-khaki lg:inline">
        {announcementT('line')}
      </span>

      <span className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-on-dark-muted sm:justify-end lg:flex-none">
        <Link
          href={CUSTOM_ORDER_HREF}
          className="flex min-h-7 items-center font-semibold whitespace-nowrap text-khaki transition-colors hover:text-on-dark md:hidden"
        >
          {navT('customOrder')}
        </Link>
        <span className="hidden whitespace-nowrap md:inline">
          <span className="sm:hidden lg:inline xl:hidden">{t('hoursShort')}</span>
          <span className="hidden sm:inline lg:hidden xl:inline">{t('hours')}</span>
        </span>
        <span className="flex items-center gap-x-4">
          {HEADER_CHANNELS.map((channel) => (
            <a
              key={channel.key}
              href={channel.href}
              aria-label={t(`aria.${channel.key}`)}
              {...externalLinkProps(channel.href)}
              className="flex min-h-7 items-center whitespace-nowrap text-on-dark transition-colors hover:text-khaki"
            >
              <ChannelLabel channel={channel.key} label={t(`channels.${channel.key}`)} />
            </a>
          ))}
        </span>
      </span>
    </div>
  )
}

function ChannelLabel({
  channel,
  label,
}: {
  readonly channel: HeaderChannel['key']
  readonly label: string
}) {
  if (channel === 'phone') return <span className="font-bold">{label}</span>

  return (
    <>
      <span className="sm:hidden">
        <ChannelIcon channel={channel} />
      </span>
      <span className="hidden font-semibold sm:inline">{label}</span>
    </>
  )
}

// tel: and mailto: hand over to another app anyway; only web destinations
// (the messengers) should leave the shop in a fresh tab.
function externalLinkProps(href: string): { target?: string; rel?: string } {
  return href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}
