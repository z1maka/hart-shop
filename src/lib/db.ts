import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from '@/db/schema'
import { env } from '@/lib/env'

const MAX_POOL_CONNECTIONS = 10

const globalForDb = globalThis as unknown as { foxDbClient?: Sql }

const client = globalForDb.foxDbClient ?? postgres(env.DATABASE_URL, { max: MAX_POOL_CONNECTIONS })

globalForDb.foxDbClient = client

export const db = drizzle(client, { schema })

export async function closeDb(): Promise<void> {
  await client.end()
}
