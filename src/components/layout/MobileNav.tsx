'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'

export type NavLink = {
  readonly label: string
  readonly href: string
}

type MobileNavProps = {
  readonly links: readonly NavLink[]
}

export function MobileNav({ links }: MobileNavProps) {
  const t = useTranslations('menu')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <Button variant="outlineOnDark" onClick={() => setIsOpen(true)} aria-label={t('open')}>
        ☰<span className="hidden sm:inline"> {t('title')}</span>
      </Button>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title={t('title')} placement="right">
        <nav className="flex flex-col">
          {links.map((link) => (
            <DialogClose key={link.href} asChild>
              <Link
                href={link.href}
                className="min-h-[50px] border-b border-subtle py-4 text-[15px] font-medium text-ink hover:text-ink"
              >
                {link.label}
              </Link>
            </DialogClose>
          ))}
        </nav>
      </Dialog>
    </div>
  )
}
