import { ChannelIcon, type ChannelMark } from '@/components/layout/ChannelIcon'
import { ContactPreference } from '@/db/enums'
import type { ContactView } from '@/features/orders/model/contact-preference'
import { cn } from '@/lib/utils'

type ContactTag = {
  readonly label: string
  readonly icon: { readonly mark: ChannelMark; readonly className: string } | null
}

// Short enough for the buyer column; the full wording is in the tooltip.
const CONTACT_TAGS: Record<ContactPreference, ContactTag> = {
  [ContactPreference.Call]: { label: 'звонок', icon: { mark: 'phone', className: 'text-faint' } },
  [ContactPreference.NoCall]: { label: 'не звонить', icon: null },
  [ContactPreference.Viber]: {
    label: 'Viber',
    icon: { mark: 'viber', className: 'text-brand-viber' },
  },
  [ContactPreference.Telegram]: {
    label: 'Telegram',
    icon: { mark: 'telegram', className: 'text-brand-telegram' },
  },
  [ContactPreference.WhatsApp]: {
    label: 'WhatsApp',
    icon: { mark: 'whatsapp', className: 'text-brand-whatsapp' },
  },
}

const ICON_SIZE = 14

// How the buyer wants the order confirmed, under their phone: the usual call
// stays quiet, anything else stands out, and a messenger opens its chat.
export function ContactLine({ contact }: { readonly contact: ContactView }) {
  const tag = CONTACT_TAGS[contact.preference]

  return (
    <span
      title={contact.label}
      className={cn(
        'mt-0.5 flex items-center gap-1 text-[12px] whitespace-nowrap',
        contact.isSpecial ? 'font-semibold text-accent' : 'text-faint',
      )}
    >
      {tag.icon ? (
        <span className={cn('shrink-0', tag.icon.className)}>
          <ChannelIcon channel={tag.icon.mark} size={ICON_SIZE} />
        </span>
      ) : null}
      {contact.chatUrl ? (
        <a
          href={contact.chatUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-accent-hover"
        >
          {tag.label}
        </a>
      ) : (
        tag.label
      )}
    </span>
  )
}
