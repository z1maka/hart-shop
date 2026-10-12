import { eq } from 'drizzle-orm'
import { shopSettings } from '@/db/schema'
import { db } from '@/lib/db'

// The switches the owner flips in the admin. Kept in lib rather than in a
// feature: the admin writes them and the storefront reads them, and neither
// should import the other.
export async function readShopSetting<T>(key: string): Promise<T | null> {
  const [row] = await db
    .select({ value: shopSettings.value })
    .from(shopSettings)
    .where(eq(shopSettings.key, key))
    .limit(1)

  return (row?.value as T) ?? null
}

export async function writeShopSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(shopSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: shopSettings.key, set: { value, updatedAt: new Date() } })
}
