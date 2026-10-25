export type NavGroup = {
  readonly label: string
  readonly categorySlugs: readonly string[]
}

// Slugs are the WordPress category slugs, carried over verbatim (AGENTS.md §1).
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Concealment',
    categorySlugs: ['anti-dronovi-nakidki', 'chokhly-dlya-starlink', 'antyteploviziyni-tenty'],
  },
  {
    label: 'Equipment',
    categorySlugs: [
      'sholomi-bronepliti',
      'navushniki-taktichni-kreplenya',
      'ryukzaki',
      'noshi',
      'taktichna-forma',
    ],
  },
] as const
