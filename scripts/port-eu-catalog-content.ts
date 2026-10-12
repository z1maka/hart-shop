import postgres from 'postgres'

// Enriches the WordPress-imported catalog with the content the EU shop already
// carries for the same physical products, and removes the import artifacts the
// WP scrape left behind. Both catalogs were imported from the same WordPress
// store, so `products.source_id` (the WP product id) is the join key.
//
//   pnpm tsx scripts/port-eu-catalog-content.ts clean   — strip wishlist junk
//     from descriptions, drop pattern values the shop does not carry
//   pnpm tsx scripts/port-eu-catalog-content.ts port    — copy specs (translated
//     EN→UK), weight, layers, "in the box" and care notes from the EU catalog
//   pnpm tsx scripts/port-eu-catalog-content.ts all
//
// Requires DATABASE_URL (this shop). The port step also needs EU_DATABASE_URL.
// Pages are prerendered, so follow a production run with a redeploy.

// The patterns the shop actually stocks (owner's list, 06.09.2026). 'Standard'
// is the internal marker for single-variant products and never reaches the UI.
const KEPT_PATTERNS = [
  'Піксель',
  'Койот',
  'Хакі',
  'Олива',
  'Зимовий',
  'Мультикам',
  'Standard',
]

// 'Pattern' and 'Layers' are derived on the product page from variants and the
// layers column; porting the EU spec rows for them would show duplicates.
const SKIPPED_SPEC_LABELS = new Set(['Pattern', 'Layers'])

const SPEC_LABELS_UK: Record<string, string> = {
  'Body coverage': 'Покриття тіла',
  Class: 'Клас',
  Construction: 'Конструкція',
  'Continuous use': 'Безперервна робота',
  Cooling: 'Охолодження',
  Cut: 'Крій',
  Fabric: 'Тканина',
  Fit: 'Посадка',
  Fits: 'Сумісність',
  Frame: 'Каркас',
  Handles: 'Ручки',
  'Leg coverage': 'Покриття ніг',
  Mounting: 'Монтаж',
  Origin: 'Виробництво',
  Protection: 'Захист',
  Seams: 'Шви',
  Season: 'Сезон',
  Size: 'Розмір',
  Type: 'Тип',
  Warranty: 'Гарантія',
}

const SPEC_VALUES_UK: Record<string, string> = {
  '12 months': '12 місяців',
  '150 × 280 cm': '150 × 280 см',
  '250 × 150 cm': '250 × 150 см',
  'Adaptis antenna': 'Антена Adaptis',
  'All current Starlink models': 'Усі актуальні моделі Starlink',
  'All-season': 'Всесезонний',
  'Any current Starlink model': 'Будь-яка актуальна модель Starlink',
  'Arm covers, pair': 'Чохли на руки, пара',
  'AvengeAngel Avenger 2.4 / 5.2 / 5.8 GHz': 'AvengeAngel Avenger 2.4 / 5.2 / 5.8 ГГц',
  'Blanket / equipment cover': 'Ковдра / чохол для спорядження',
  'Convection channel along the housing': 'Конвекційний канал уздовж корпусу',
  'Coolmax polyester': 'Поліестер Coolmax',
  'Down to 140 cm': 'До 140 см',
  'Elastic cuffs, one size': 'Еластичні манжети, один розмір',
  'Eyelets on all four sides': 'Люверси з чотирьох сторін',
  'Fitted antenna cover': 'Фігурний чохол на антену',
  'Fitted cover with netting skirt': 'Фігурний чохол зі спідницею з сітки',
  'Fitted terminal cover': 'Фігурний чохол на термінал',
  'Fitted terminal cover, winter': 'Фігурний чохол на термінал, зимовий',
  'Flat-locked at the shoulder': 'Плоскі шви на плечах',
  'Flexible reinforced battens': 'Гнучкі армовані лати',
  'Leg covers, pair': 'Чохли на ноги, пара',
  'MOLLE webbing on the perimeter': 'Стропи MOLLE по периметру',
  'Made in Ukraine': 'Зроблено в Україні',
  'Multi-layer, no foil': 'Багатошаровий, без фольги',
  'Oxford, water-repellent': 'Оксфорд з водовідштовхувальним просоченням',
  'Passive, no power required': 'Пасивне, без живлення',
  Pixel: 'Піксель',
  'Poncho cloak': 'Плащ-пончо',
  'Reinforced cover, passive cooling': 'Посилений чохол, пасивне охолодження',
  'Reinforced cover, vented': 'Посилений чохол з вентиляцією',
  'Reinforced cover, vented, winter': 'Посилений чохол з вентиляцією, зимовий',
  'Roll-up evacuation stretcher': 'Скручувані евакуаційні ноші',
  'Screening tarp': 'Екрануючий тент',
  'Starlink Gen 2 (rectangular)': 'Starlink Gen 2 (прямокутний)',
  'Starlink Gen 2, Gen 3, Gen 4': 'Starlink Gen 2, Gen 3, Gen 4',
  'Starlink Gen 3 (standard kit)': 'Starlink Gen 3 (стандартний комплект)',
  'Starlink Mini': 'Starlink Mini',
  'Thermal + UV + EM layer': 'Тепловий + УФ + ЕМ шар',
  'Under-armour fit': 'Під бронежилет',
  'Up to 2 hours': 'До 2 годин',
  'Up to 3 hours': 'До 3 годин',
}

type SpecRow = { readonly label: string; readonly value: string }

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`${key} is required`)
  return value
}

function translateSpecs(specs: readonly SpecRow[]): {
  rows: SpecRow[]
  unknown: string[]
} {
  const unknown: string[] = []
  const rows: SpecRow[] = []

  for (const spec of specs) {
    if (SKIPPED_SPEC_LABELS.has(spec.label)) continue

    const label = SPEC_LABELS_UK[spec.label]
    if (label === undefined) unknown.push(`label: ${spec.label}`)

    // Untranslated values are usually proper names (device models, protection
    // classes) that read the same in Ukrainian; anything else gets logged.
    let value = SPEC_VALUES_UK[spec.value]
    if (value === undefined) {
      value = spec.value
      if (!/^[A-Z0-9 ,./()×-]+$/i.test(spec.value) || /[a-z]{3}/.test(spec.value)) {
        unknown.push(`value: ${spec.value}`)
      }
    }

    rows.push({ label: label ?? spec.label, value })
  }

  return { rows, unknown }
}

async function clean(): Promise<void> {
  const sql = postgres(requireEnv('DATABASE_URL'), { max: 1 })
  try {
    const descriptions = await sql`
      update products
      set description = regexp_replace(
        description,
        '(\\s*Додати до бажань(Видалити з бажань)?)+\\s*$',
        ''
      )
      where status = 'published' and description like '%Додати до бажань%'
      returning slug
    `
    console.log(`clean: wishlist junk stripped from ${descriptions.length} descriptions`)

    // A WordPress-era typo that opens one of the product pages.
    const typos = await sql`
      update products
      set description = replace(description, 'Мине використовуємо', 'Ми не використовуємо')
      where status = 'published' and description like '%Мине використовуємо%'
      returning slug
    `
    if (typos.length > 0) console.log(`clean: "Мине використовуємо" fixed in ${typos.length}`)

    const leftovers = await sql`
      select slug from products
      where status = 'published' and description like '%Додати до бажань%'
    `
    if (leftovers.length > 0) {
      console.log(
        `clean: phrase still present mid-text in: ${leftovers.map((row) => row.slug).join(', ')}`,
      )
    }

    const variants = await sql`
      update product_variants v
      set options = v.options - 'Color'
      from products p
      where p.id = v.product_id
        and p.status = 'published'
        and v.options ? 'Color'
        and not (v.options ->> 'Color' = any(${KEPT_PATTERNS}))
      returning v.sku, v.options
    `
    console.log(`clean: pattern removed from ${variants.length} variants`)
  } finally {
    await sql.end()
  }
}

async function port(): Promise<void> {
  const source = postgres(requireEnv('EU_DATABASE_URL'), { max: 1 })
  const target = postgres(requireEnv('DATABASE_URL'), { max: 1 })

  try {
    const donors = await source`
      select p.source_id, p.specs, p.weight_grams, p.layers, t.included, t.care_notes
      from products p
      left join product_translations t on t.product_id = p.id and t.locale = 'uk'
      where p.status = 'published' and p.source_id is not null
    `
    console.log(`port: ${donors.length} donor products in the EU catalog`)

    let matched = 0
    const allUnknown = new Set<string>()

    for (const donor of donors) {
      const specs = (donor.specs ?? []) as readonly SpecRow[]
      const { rows, unknown } = translateSpecs(specs)
      unknown.forEach((entry) => allUnknown.add(entry))

      const updated = await target`
        update products
        set
          specs = case when specs::text = '[]' then ${target.json(rows)} else specs end,
          weight_grams = case when weight_grams = 0 then ${donor.weight_grams} else weight_grams end,
          layers = case when layers <= 1 then ${donor.layers} else layers end,
          included = case when included = '{}' then ${donor.included ?? []} else included end,
          care_notes = case when care_notes = '{}' then ${donor.care_notes ?? []} else care_notes end
        where status = 'published' and source_id = ${donor.source_id}
        returning slug
      `
      matched += updated.length
    }

    console.log(`port: ${matched} products enriched`)
    if (allUnknown.size > 0) {
      console.log('port: left untranslated (check by hand):')
      for (const entry of allUnknown) console.log(`  ${entry}`)
    }
  } finally {
    await source.end()
    await target.end()
  }
}

async function main(): Promise<void> {
  const step = process.argv[2]

  if (step === 'clean') return clean()
  if (step === 'port') return port()
  if (step === 'all') {
    await clean()
    return port()
  }

  throw new Error(`Unknown step "${step ?? ''}" — use clean, port or all`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
