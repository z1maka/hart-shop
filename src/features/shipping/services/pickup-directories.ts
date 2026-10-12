import { Carrier } from '@/db/enums'
import type { PickupDirectory } from '@/features/shipping/model/pickup-directory'
import { novaPostDirectory } from '@/features/shipping/services/nova-post-directory'

// The only place that maps a carrier to its implementation. Callers ask the
// factory, never `if (carrier === …)`. See AGENTS.md §18.
const DIRECTORIES: Record<Carrier, PickupDirectory> = {
  [Carrier.NovaPost]: novaPostDirectory,
}

export function pickupDirectoryFor(carrier: Carrier): PickupDirectory {
  return DIRECTORIES[carrier]
}
