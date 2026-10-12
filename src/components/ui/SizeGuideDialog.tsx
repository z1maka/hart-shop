'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useTranslations } from 'next-intl'
import type { SizeGuideRow } from '@/config/size-guide'

export function SizeGuideDialog({ rows }: { readonly rows: readonly SizeGuideRow[] }) {
  const t = useTranslations('sizeGuide')
  const headers = [t('size'), t('chest'), t('height')]

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger className="text-[12.5px] font-semibold text-accent-hover underline underline-offset-2 hover:text-accent">
        {t('title')}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card bg-surface shadow-[0_24px_60px_rgb(35_36_29_/_0.28)]">
          <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
            <DialogPrimitive.Title className="font-display text-[17px] font-bold text-ink">
              {t('title')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="min-h-10 rounded-control border border-subtle px-3 text-[12.5px] font-semibold text-ink hover:border-faint">
              {t('close')}
            </DialogPrimitive.Close>
          </div>

          <div className="px-5 pt-4 pb-5.5">
            <p className="mb-4 max-w-[60ch] text-[13.5px] leading-relaxed text-muted">
              {t('note')}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px] text-ink">
                <thead>
                  <tr className="bg-hover">
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2.5 text-left text-[12px] font-semibold text-muted"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.size} className="border-t border-subtle">
                      <td className="px-3 py-2.5 font-semibold">{row.size}</td>
                      <td className="px-3 py-2.5">{row.chest}</td>
                      <td className="px-3 py-2.5">{row.height}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
