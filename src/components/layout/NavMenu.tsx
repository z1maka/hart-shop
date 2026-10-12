'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export type NavMenuItem = {
  readonly label: string
  readonly href: string
  // Responsive visibility of the item: an entry that the bar itself shows at
  // some widths hides here at those widths.
  readonly className?: string
}

type NavMenuProps = {
  readonly label: string
  readonly items: readonly NavMenuItem[]
  readonly className?: string
}

export function NavMenu({ label, items, className }: NavMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'group inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 font-display text-[14px] font-medium tracking-[0.06em] whitespace-nowrap text-on-dark transition-colors',
          'hover:bg-dark-hover hover:text-khaki data-[state=open]:bg-dark-hover data-[state=open]:text-khaki',
          className,
        )}
      >
        {label}
        <ChevronDownIcon />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="start"
          className="z-50 min-w-52 rounded-card border border-subtle bg-raised p-1.5 shadow-card"
        >
          {items.map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  'block rounded-chip px-3 py-2.5 text-[13.5px] text-ink outline-none hover:bg-hover focus-visible:bg-hover',
                  item.className,
                )}
              >
                {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// A drawn chevron instead of the ▾ glyph: at menu-label size the glyph was
// too faint to read as "this opens a list".
function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="shrink-0 transition-transform group-data-[state=open]:rotate-180"
    >
      <path
        d="m3.5 5.25 3.5 3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
