import Link from 'next/link'

type AdminPagerProps = {
  readonly basePath: string
  readonly page: number
  readonly pageCount: number
  // Filters the list is showing, kept on every page: the orders archive.
  readonly keptParams?: Readonly<Record<string, string>>
}

export function AdminPager({ basePath, page, pageCount, keptParams = {} }: AdminPagerProps) {
  if (pageCount <= 1) return null

  const hrefOf = (target: number) =>
    `${basePath}?${new URLSearchParams({ ...keptParams, page: String(target) }).toString()}`

  return (
    <nav className="mt-4 flex items-center gap-4 text-[13px] text-muted">
      <PagerLink href={hrefOf(page - 1)} disabled={page === 1}>
        Назад
      </PagerLink>
      <span>
        Страница {page} из {pageCount}
      </span>
      <PagerLink href={hrefOf(page + 1)} disabled={page >= pageCount}>
        Вперёд
      </PagerLink>
    </nav>
  )
}

function PagerLink({
  href,
  disabled,
  children,
}: {
  href: string
  disabled: boolean
  children: string
}) {
  if (disabled) return <span className="text-faint">{children}</span>

  return (
    <Link href={href} className="font-semibold text-ink hover:text-accent-hover">
      {children}
    </Link>
  )
}

export function pageFromSearchParams(value: unknown): number {
  const parsed = Number(typeof value === 'string' ? value : '1')

  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}
