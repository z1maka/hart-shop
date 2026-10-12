// The part of Google's product taxonomy the catalogue uses. Merchant Center
// takes the numeric id; without one Google guesses the category from the
// title, and it filed the ponchos under coats and jackets. The labels are
// the admin's (Russian) words for Google's English paths, which live at
// https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
export type GoogleCategory = {
  readonly id: number
  readonly label: string
  // Worn goods: Google reads gender and age group for them.
  readonly isApparel: boolean
}

export const GOOGLE_CATEGORIES: readonly GoogleCategory[] = [
  // Apparel & Accessories > Clothing > Activewear > Hunting Clothing > Ghillie Suits
  { id: 5462, label: 'Маскировочные костюмы (пончо, накидки)', isApparel: true },
  // Sporting Goods > Outdoor Recreation > Hunting & Shooting > Hunting > Hunting Blinds & Screens
  { id: 1034, label: 'Маскировочные укрытия и экраны (тенты, одеяла)', isApparel: false },
  // Electronics > Electronics Accessories > Antenna Accessories
  { id: 5476, label: 'Аксессуары для антенн (чехлы Starlink)', isApparel: false },
  // Sporting Goods > Outdoor Recreation > Hunting & Shooting > Hunting & Shooting Protective Gear
  { id: 7460, label: 'Защитное снаряжение для стрельбы (шлемы, наушники)', isApparel: false },
  // Sporting Goods > Outdoor Recreation > Hunting & Shooting > Hunting > Hearing Enhancers
  { id: 7373, label: 'Усилители слуха (активные наушники)', isApparel: false },
  // Luggage & Bags > Backpacks
  { id: 100, label: 'Рюкзаки', isApparel: false },
  // Sporting Goods > Outdoor Recreation > Hydration Systems
  { id: 5635, label: 'Питьевые системы (гидраторы)', isApparel: false },
  // Business & Industrial > Medical > Medical Equipment > Medical Stretchers & Gurneys
  { id: 499858, label: 'Медицинские носилки', isApparel: false },
  // Apparel & Accessories > Clothing > Shirts & Tops
  { id: 212, label: 'Футболки и топы', isApparel: true },
]

export function findGoogleCategory(id: number | null): GoogleCategory | null {
  if (id === null) return null
  return GOOGLE_CATEGORIES.find((category) => category.id === id) ?? null
}

export function isKnownGoogleCategory(id: number): boolean {
  return findGoogleCategory(id) !== null
}

// A product may name its own Google category where it differs from its
// category's (a tent in the ponchos' category); otherwise, or when its own
// id is not one the catalogue knows, it takes the category's.
export function effectiveGoogleCategory(
  productOwn: number | null,
  categoryDefault: number | null,
): GoogleCategory | null {
  return findGoogleCategory(productOwn) ?? findGoogleCategory(categoryDefault)
}
