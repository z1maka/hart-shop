'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChannelIcon, type ChannelMark } from '@/components/layout/ChannelIcon'
import { ContactPreference } from '@/db/enums'
import { cn } from '@/lib/utils'

type ContactChannel = Exclude<ContactPreference, typeof ContactPreference.NoCall>

type ChannelTile = {
  readonly channel: ContactChannel
  readonly mark: ChannelMark
  readonly iconClass: string
}

const CHANNEL_TILES: readonly ChannelTile[] = [
  { channel: ContactPreference.Call, mark: 'phone', iconClass: 'text-ink' },
  { channel: ContactPreference.Viber, mark: 'viber', iconClass: 'text-brand-viber' },
  { channel: ContactPreference.Telegram, mark: 'telegram', iconClass: 'text-brand-telegram' },
  { channel: ContactPreference.WhatsApp, mark: 'whatsapp', iconClass: 'text-brand-whatsapp' },
]

const ICON_SIZE = 26

type ContactPreferencePickerProps = {
  readonly value: ContactPreference
  readonly phone: string
  readonly onChange: (preference: ContactPreference) => void
}

// The channel tiles plus «no need to confirm»: ticking the box keeps the
// channel picked before it, so unticking brings it back.
export function ContactPreferencePicker({ value, phone, onChange }: ContactPreferencePickerProps) {
  const t = useTranslations('checkout.contact')
  const [channel, setChannel] = useState<ContactChannel>(ContactPreference.Call)
  const isSure = value === ContactPreference.NoCall

  function pickChannel(next: ContactChannel) {
    setChannel(next)
    onChange(next)
  }

  return (
    <div role="group" aria-labelledby="contact-preference-title">
      <p id="contact-preference-title" className="mb-2.5 text-[14px] font-extrabold text-ink">
        {t('title')}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {CHANNEL_TILES.map((tile) => (
          <ChannelTileButton
            key={tile.channel}
            tile={tile}
            label={t(`channels.${tile.channel}`)}
            isActive={!isSure && tile.channel === value}
            isMuted={isSure}
            onPick={() => pickChannel(tile.channel)}
          />
        ))}
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] font-semibold text-ink">
        <input
          type="checkbox"
          checked={isSure}
          onChange={() => onChange(isSure ? channel : ContactPreference.NoCall)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]"
        />
        {t('sure')}
      </label>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        {t.rich(`hints.${value}`, {
          phone,
          number: (chunks) => <span className="whitespace-nowrap">{chunks}</span>,
        })}
      </p>
    </div>
  )
}

function ChannelTileButton({
  tile,
  label,
  isActive,
  isMuted,
  onPick,
}: {
  readonly tile: ChannelTile
  readonly label: string
  readonly isActive: boolean
  readonly isMuted: boolean
  readonly onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isActive}
      className={cn(
        'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card border-[1.5px] px-0 py-2.5 transition-colors',
        isActive ? 'border-accent bg-accent-tint' : 'border-subtle bg-raised hover:border-strong',
        isMuted && 'opacity-50',
      )}
    >
      <span className={tile.iconClass}>
        <ChannelIcon channel={tile.mark} size={ICON_SIZE} />
      </span>
      <span className={cn('text-[11px] text-ink', isActive ? 'font-extrabold' : 'font-semibold')}>
        {label}
      </span>
    </button>
  )
}
