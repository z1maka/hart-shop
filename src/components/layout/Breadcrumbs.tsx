import Link from 'next/link'
import { Fragment } from 'react'

export type BreadcrumbItem = {
  readonly label: string
  // The current page has none: it is named, not linked.
  readonly href?: string
}

export function Breadcrumbs({
  items,
  className,
}: {
  readonly items: readonly BreadcrumbItem[]
  readonly className?: string
}) {
  return (
    <nav aria-label="Breadcrumbs" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-faint">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <li aria-hidden className="text-strong">
                /
              </li>
            ) : null}
            <li>
              {item.href ? (
                <Link href={item.href} className="text-muted transition-colors hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
