import 'dotenv/config'
import { categoryManagementService } from '@/features/catalog/services/category-management'
import { closeDb } from '@/lib/db'

const USAGE = `Usage:
  pnpm category:hide <slug> [<slug> …]
  pnpm category:show <slug> [<slug> …]
  pnpm category:list`

async function main(): Promise<void> {
  const [command, ...slugs] = process.argv.slice(2)

  if (command === 'list') {
    for (const category of await categoryManagementService.listAll()) {
      console.info(
        `${category.isVisible ? 'visible ' : 'hidden  '} ${category.slug} — ${category.name}`,
      )
    }
    return
  }

  if ((command !== 'hide' && command !== 'show') || slugs.length === 0) {
    console.info(USAGE)
    process.exitCode = 1
    return
  }

  for (const slug of slugs) {
    const change = await categoryManagementService.setVisibility(slug, command === 'show')

    if (change.productsAffected === 0) {
      console.warn(`  ${slug} — no such category, nothing changed`)
      continue
    }

    console.info(
      `  ${slug} → ${command === 'show' ? 'visible' : 'hidden'} (${change.productsAffected} products)`,
    )
  }

  console.info(
    '\nRun `pnpm dev` cache invalidation by restarting the server, or wait for the catalog cache to expire.',
  )
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(closeDb)
