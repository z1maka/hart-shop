'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { getComparisonAction } from '@/features/catalog/actions/compare-action'
import type { ComparisonView } from '@/features/catalog/queries/get-comparison'
import { useCompare } from '@/features/catalog/ui/use-compare'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export function CompareBar() {
  const t = useTranslations('compareUi')
  const { slugs, remove, clear } = useCompare()
  const [comparison, setComparison] = useState<ComparisonView | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (slugs.length === 0) return null

  function open() {
    startTransition(async () => {
      const result = await getComparisonAction([...slugs])
      if (!result.ok) return

      setComparison(result.data)
      setIsOpen(true)
    })
  }

  function dropColumn(slug: string) {
    remove(slug)
    setComparison((current) => (current ? dropFromComparison(current, slug) : current))
  }

  return (
    <>
      <div className="sticky bottom-3.5 z-30 flex flex-wrap items-center justify-between gap-3.5 rounded-card bg-ink p-4 shadow-card">
        <span className="text-[13.5px] font-medium text-on-dark">
          {slugs.length === 1 ? t('pickOneMore') : t('selected', { count: slugs.length })}
        </span>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={clear}
            className="min-h-10.5 rounded-control border border-on-dark/35 px-3.5 text-[12.5px] font-semibold text-on-dark hover:border-on-dark"
          >
            {t('clear')}
          </button>
          {slugs.length > 1 ? (
            <button
              type="button"
              onClick={open}
              disabled={isPending}
              className="min-h-10.5 rounded-control bg-canvas px-4 text-[12.5px] font-semibold text-ink hover:bg-raised"
            >
              {t('compareCount', { count: slugs.length })}
            </button>
          ) : null}
        </div>
      </div>

      <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[86vh] w-[min(960px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card bg-surface shadow-[0_24px_60px_rgb(35_36_29_/_0.28)]">
            <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
              <DialogPrimitive.Title className="font-display text-[17px] font-bold text-ink">
                {t('dialogTitle', { count: comparison?.columns.length ?? 0 })}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="min-h-10 rounded-control border border-subtle px-3 text-[12.5px] font-semibold text-ink hover:border-faint">
                {t('close')}
              </DialogPrimitive.Close>
            </div>

            <div className="overflow-auto p-5">
              {comparison ? <ComparisonTable comparison={comparison} onDrop={dropColumn} /> : null}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

function ComparisonTable({
  comparison,
  onDrop,
}: {
  comparison: ComparisonView
  onDrop: (slug: string) => void
}) {
  const t = useTranslations('compareUi')
  return (
    <table className="w-full border-collapse text-[13.5px]">
      <thead>
        <tr>
          <th className="w-32 p-2 text-left align-bottom text-[12px] font-semibold text-faint">
            Specification
          </th>
          {comparison.columns.map((column) => (
            <th key={column.slug} className="p-2 text-left align-bottom">
              <Link href={`/product/${column.slug}`} className="block">
                <span className="relative block aspect-square w-full overflow-hidden rounded-chip bg-raised">
                  {column.imageUrl ? (
                    <Image
                      src={column.imageUrl}
                      alt=""
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="mt-2 block text-[13.5px] font-semibold text-ink">
                  {column.title}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-faint">{column.sku}</span>
              </Link>
              <button
                type="button"
                onClick={() => onDrop(column.slug)}
                className="mt-1.5 text-[12px] font-semibold text-muted hover:text-alert"
              >
                Remove
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {comparison.rows.map((row) => (
          <tr
            key={row.label}
            className={cn(
              'border-t border-subtle',
              row.isKeyFigure && row.differs && 'bg-accent-tint',
            )}
          >
            <th
              className={cn(
                'p-2.5 text-left text-[12.5px] font-semibold',
                row.isKeyFigure ? 'text-accent-hover' : 'text-faint',
              )}
            >
              {['price', 'weight', 'layers', 'options'].includes(row.label)
                ? t(`rows.${row.label}`)
                : row.label}
            </th>
            {row.values.map((value, index) => (
              <td
                key={`${row.label}-${comparison.columns[index]?.slug ?? index}`}
                className={cn(
                  'p-2.5 align-top text-ink',
                  row.isKeyFigure && row.differs ? 'font-bold' : 'font-medium',
                )}
              >
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function dropFromComparison(comparison: ComparisonView, slug: string): ComparisonView {
  const index = comparison.columns.findIndex((column) => column.slug === slug)
  if (index === -1) return comparison

  return {
    columns: comparison.columns.filter((column) => column.slug !== slug),
    rows: comparison.rows.map((row) => ({
      ...row,
      values: row.values.filter((_, valueIndex) => valueIndex !== index),
    })),
  }
}
