/**
 * One-time provisioning of the UA production infrastructure, reusing the
 * platform accounts already created for the EU shop.
 *
 * Reads platform tokens from the environment (never prints them), creates:
 *   1. Neon project `fox-armor-ua` (same region and pg version as EU)
 *   2. R2 bucket `fox-media-ua` with the managed public r2.dev domain
 *   3. Resend domain `fox-armor.com.ua` (prints the DNS records to add)
 *
 * Secrets land in `.env.production` next to this repo's `.env` (gitignored);
 * the console output only ever shows masked values.
 *
 * Run: pnpm tsx scripts/provision-ua-infra.ts
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const NEON_API = 'https://console.neon.tech/api/v2'
const CF_API = 'https://api.cloudflare.com/client/v4'
const RESEND_API = 'https://api.resend.com'

const NEON_ORG_ID = 'org-cold-wave-89877450'
const NEON_PROJECT_NAME = 'fox-armor-ua'
const NEON_REGION = 'aws-eu-central-1'
const NEON_PG_VERSION = 18

const R2_BUCKET = 'fox-media-ua'
const MAIL_DOMAIN = 'fox-armor.com.ua'

const ENV_FILE = resolve(import.meta.dirname, '../.env.production')

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set — source it from the EU .env first`)
  return value
}

function maskUri(uri: string): string {
  return uri.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@')
}

async function api<T>(
  url: string,
  token: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; json: T }> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  return { status: response.status, json: (await response.json()) as T }
}

function saveEnvValue(key: string, value: string): void {
  const line = `${key}=${value}\n`
  if (!existsSync(ENV_FILE)) {
    writeFileSync(ENV_FILE, `# fox-armor.com.ua production secrets — never commit\n${line}`)
    return
  }
  const current = readFileSync(ENV_FILE, 'utf8')
  if (new RegExp(`^${key}=`, 'm').test(current)) {
    writeFileSync(ENV_FILE, current.replace(new RegExp(`^${key}=.*$`, 'm'), line.trimEnd()))
    return
  }
  appendFileSync(ENV_FILE, line)
}

type NeonProject = { id: string; name: string; region_id: string; pg_version: number }

async function provisionNeon(): Promise<void> {
  const token = requireEnv('NEON_API_KEY')

  const existing = await api<{ projects: NeonProject[] }>(
    `${NEON_API}/projects?org_id=${NEON_ORG_ID}`,
    token,
  )
  const found = existing.json.projects?.find((p) => p.name === NEON_PROJECT_NAME)
  if (found) {
    console.log(`Neon: project ${NEON_PROJECT_NAME} already exists (${found.id}) — skipping`)
    return
  }

  const created = await api<{
    project: NeonProject
    connection_uris: { connection_uri: string }[]
  }>(`${NEON_API}/projects`, token, {
    method: 'POST',
    body: {
      project: {
        name: NEON_PROJECT_NAME,
        region_id: NEON_REGION,
        pg_version: NEON_PG_VERSION,
        org_id: NEON_ORG_ID,
      },
    },
  })

  if (created.status >= 300 || !created.json.project) {
    throw new Error(`Neon: create failed with ${created.status}: ${JSON.stringify(created.json).slice(0, 300)}`)
  }

  const uri = created.json.connection_uris?.[0]?.connection_uri
  if (!uri) throw new Error('Neon: project created but no connection uri returned')

  saveEnvValue('DATABASE_URL', uri)
  console.log(`Neon: created ${created.json.project.id} (${NEON_REGION}, pg ${NEON_PG_VERSION})`)
  console.log(`Neon: DATABASE_URL saved to .env.production → ${maskUri(uri)}`)
}

async function provisionR2(): Promise<void> {
  const token = requireEnv('CLOUDFLARE_API_TOKEN')
  const account = requireEnv('CLOUDFLARE_ACCOUNT_ID')

  const list = await api<{ result: { buckets: { name: string }[] } }>(
    `${CF_API}/accounts/${account}/r2/buckets`,
    token,
  )
  const exists = list.json.result?.buckets?.some((b) => b.name === R2_BUCKET)

  if (!exists) {
    const created = await api<{ success: boolean; errors: unknown[] }>(
      `${CF_API}/accounts/${account}/r2/buckets`,
      token,
      { method: 'POST', body: { name: R2_BUCKET } },
    )
    if (!created.json.success) {
      throw new Error(`R2: bucket create failed: ${JSON.stringify(created.json.errors).slice(0, 300)}`)
    }
    console.log(`R2: bucket ${R2_BUCKET} created`)
  } else {
    console.log(`R2: bucket ${R2_BUCKET} already exists — skipping create`)
  }

  // The managed r2.dev URL serves media until the UA zone moves to Cloudflare
  // and a proper custom domain can front the bucket.
  const managed = await api<{
    success: boolean
    result: { enabled: boolean; bucketId: string; domain: string }
  }>(`${CF_API}/accounts/${account}/r2/buckets/${R2_BUCKET}/domains/managed`, token, {
    method: 'PUT',
    body: { enabled: true },
  })
  if (!managed.json.success) {
    throw new Error(`R2: enabling public dev domain failed: ${JSON.stringify(managed.json).slice(0, 300)}`)
  }

  const domain = managed.json.result.domain
  saveEnvValue('NEXT_PUBLIC_MEDIA_URL', `https://${domain}`)
  saveEnvValue('S3_BUCKET', R2_BUCKET)
  saveEnvValue('S3_ENDPOINT', `https://${account}.r2.cloudflarestorage.com`)
  saveEnvValue('S3_REGION', 'auto')
  saveEnvValue('S3_FORCE_PATH_STYLE', 'true')
  console.log(`R2: public dev domain enabled → https://${domain}`)
  console.log('R2: S3 endpoint/bucket saved to .env.production (access keys reused from EU)')
}

async function provisionResend(): Promise<void> {
  const token = requireEnv('RESEND_API_KEY')

  const list = await api<{ data: { id: string; name: string; status: string }[] }>(
    `${RESEND_API}/domains`,
    token,
  )
  let domain = list.json.data?.find((d) => d.name === MAIL_DOMAIN)

  if (!domain) {
    const created = await api<{ id: string; name: string; status: string }>(
      `${RESEND_API}/domains`,
      token,
      { method: 'POST', body: { name: MAIL_DOMAIN, region: 'eu-west-1' } },
    )
    if (created.status >= 300) {
      throw new Error(`Resend: domain create failed: ${JSON.stringify(created.json).slice(0, 300)}`)
    }
    domain = created.json
    console.log(`Resend: domain ${MAIL_DOMAIN} added (${domain.id})`)
  } else {
    console.log(`Resend: domain ${MAIL_DOMAIN} already added (${domain.status})`)
  }

  const detail = await api<{
    status: string
    records: { record: string; name: string; type: string; value: string; priority?: number; status: string }[]
  }>(`${RESEND_API}/domains/${domain.id}`, token)

  console.log(`Resend: domain status = ${detail.json.status}; DNS records to create:`)
  for (const r of detail.json.records ?? []) {
    const priority = r.priority === undefined ? '' : ` (priority ${r.priority})`
    console.log(`  [${r.status}] ${r.type} ${r.name} → ${r.value}${priority}`)
  }
}

type CfZone = { id: string; name: string; status: string; name_servers?: string[] }
type CfListResponse<T> = { success: boolean; result: T; errors: { message: string }[] }

// Brings the UA domain into the same Cloudflare account as the EU one: the
// zone is created in "pending" state, existing records are scanned in so the
// nameserver switch at the registrar is safe, and the Resend mail records are
// written right away. Until the registrar points at Cloudflare's nameservers
// nothing about the live WordPress site changes.
async function provisionZone(): Promise<void> {
  const token = requireEnv('CLOUDFLARE_API_TOKEN')
  const account = requireEnv('CLOUDFLARE_ACCOUNT_ID')
  const resendToken = requireEnv('RESEND_API_KEY')

  const existing = await api<CfListResponse<CfZone[]>>(
    `${CF_API}/zones?name=${MAIL_DOMAIN}`,
    token,
  )
  let zone = existing.json.result?.[0]

  if (!zone) {
    const created = await api<CfListResponse<CfZone>>(`${CF_API}/zones`, token, {
      method: 'POST',
      body: { account: { id: account }, name: MAIL_DOMAIN, type: 'full' },
    })
    if (!created.json.success) {
      throw new Error(`Zone create failed: ${JSON.stringify(created.json.errors).slice(0, 300)}`)
    }
    zone = created.json.result
    console.log(`Cloudflare: zone ${MAIL_DOMAIN} created (${zone.status})`)

    const scan = await api<CfListResponse<{ recs_added: number }>>(
      `${CF_API}/zones/${zone.id}/dns_records/scan`,
      token,
      { method: 'POST' },
    )
    const added = scan.json.result?.recs_added
    console.log(`Cloudflare: DNS scan imported ${added ?? 'unknown number of'} existing records`)
  } else {
    console.log(`Cloudflare: zone ${MAIL_DOMAIN} already exists (${zone.status})`)
  }

  const domains = await api<{ data: { id: string; name: string }[] }>(
    `${RESEND_API}/domains`,
    resendToken,
  )
  const mailDomain = domains.json.data?.find((d) => d.name === MAIL_DOMAIN)
  if (!mailDomain) throw new Error('Resend: domain not found — run the resend step first')

  const detail = await api<{
    records: { name: string; type: string; value: string; priority?: number }[]
  }>(`${RESEND_API}/domains/${mailDomain.id}`, resendToken)

  const current = await api<CfListResponse<{ name: string; type: string }[]>>(
    `${CF_API}/zones/${zone.id}/dns_records?per_page=100`,
    token,
  )
  const has = (name: string, type: string) =>
    current.json.result?.some((r) => r.name === name && r.type === type)

  for (const record of detail.json.records ?? []) {
    const fqdn = `${record.name}.${MAIL_DOMAIN}`
    if (has(fqdn, record.type)) {
      console.log(`Cloudflare: ${record.type} ${fqdn} already present — skipping`)
      continue
    }
    const body: Record<string, unknown> = {
      type: record.type,
      name: fqdn,
      content: record.type === 'TXT' ? `"${record.value}"` : record.value,
      ttl: 1,
      proxied: false,
    }
    if (record.priority !== undefined) body.priority = record.priority
    const created = await api<CfListResponse<unknown>>(
      `${CF_API}/zones/${zone.id}/dns_records`,
      token,
      { method: 'POST', body },
    )
    if (!created.json.success) {
      throw new Error(
        `Cloudflare: ${record.type} ${fqdn} failed: ${JSON.stringify(created.json.errors).slice(0, 300)}`,
      )
    }
    console.log(`Cloudflare: created ${record.type} ${fqdn}`)
  }

  const fresh = await api<CfListResponse<CfZone>>(`${CF_API}/zones/${zone.id}`, token)
  const nameservers = fresh.json.result?.name_servers ?? []
  console.log(`Cloudflare: zone status ${fresh.json.result?.status}; nameservers for the registrar:`)
  for (const ns of nameservers) console.log(`  ${ns}`)
}

const VERCEL_API = 'https://api.vercel.com'
const VERCEL_TEAM_ID = 'team_i1PABNIU9kXSMceb7Wtt9Lsg'
const VERCEL_PROJECT = 'fox-armor-ua'
const GITHUB_REPO = 'z1maka/fox-armor-ua'

// Deploy helpers such as the Vercel token itself and the one-off admin
// password are not application configuration and never reach the project.
const NON_APP_KEYS = new Set(['VERCEL_TOKEN', 'ADMIN_PASSWORD'])

function readProductionEnv(): Record<string, string> {
  const entries: Record<string, string> = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    const key = match?.[1]
    const raw = match?.[2]
    if (key === undefined || raw === undefined || NON_APP_KEYS.has(key)) continue
    entries[key] = raw.replace(/^"(.*)"$/, '$1')
  }
  return entries
}

// Creates the Vercel project in the same team as the EU shop, wires it to the
// GitHub repository, uploads the production environment and kicks off a
// deployment of main.
async function provisionVercel(): Promise<void> {
  const token = requireEnv('VERCEL_TOKEN')
  const team = `teamId=${VERCEL_TEAM_ID}`

  const existing = await api<{ name?: string; error?: { code: string } }>(
    `${VERCEL_API}/v9/projects/${VERCEL_PROJECT}?${team}`,
    token,
  )

  if (existing.json.name) {
    console.log(`Vercel: project ${VERCEL_PROJECT} already exists — skipping create`)
  } else {
    const created = await api<{ name?: string; error?: { message: string } }>(
      `${VERCEL_API}/v11/projects?${team}`,
      token,
      {
        method: 'POST',
        body: {
          name: VERCEL_PROJECT,
          framework: 'nextjs',
          gitRepository: { type: 'github', repo: GITHUB_REPO },
        },
      },
    )
    if (!created.json.name) {
      throw new Error(`Vercel: project create failed: ${created.json.error?.message}`)
    }
    console.log(`Vercel: project ${VERCEL_PROJECT} created and linked to ${GITHUB_REPO}`)
  }

  const envEntries = Object.entries(readProductionEnv())
  const upserted = await api<{ failed?: { error: { key?: string; message: string } }[] }>(
    `${VERCEL_API}/v10/projects/${VERCEL_PROJECT}/env?upsert=true&${team}`,
    token,
    {
      method: 'POST',
      body: envEntries.map(([key, value]) => ({
        key,
        value,
        type: 'encrypted',
        target: ['production', 'preview'],
      })),
    },
  )
  const failures = upserted.json.failed ?? []
  if (failures.length > 0) {
    throw new Error(`Vercel: env upload failed: ${JSON.stringify(failures).slice(0, 300)}`)
  }
  console.log(`Vercel: ${envEntries.length} environment variables upserted (values hidden)`)

  const deployed = await api<{
    id?: string
    url?: string
    error?: { message: string }
  }>(`${VERCEL_API}/v13/deployments?${team}`, token, {
    method: 'POST',
    body: {
      name: VERCEL_PROJECT,
      target: 'production',
      gitSource: { type: 'github', org: 'z1maka', repo: 'fox-armor-ua', ref: 'main' },
    },
  })
  if (!deployed.json.id) {
    throw new Error(`Vercel: deployment failed to start: ${deployed.json.error?.message}`)
  }
  console.log(`Vercel: production deployment started → https://${deployed.json.url}`)
  console.log(`Vercel: deployment id ${deployed.json.id}`)
}

const VERCEL_APEX_IP = '76.76.21.21'
const VERCEL_CNAME = 'cname.vercel-dns.com'

async function findZone(cfToken: string): Promise<CfZone> {
  const zones = await api<CfListResponse<CfZone[]>>(
    `${CF_API}/zones?name=${MAIL_DOMAIN}`,
    cfToken,
  )
  const zone = zones.json.result?.[0]
  if (!zone) throw new Error('Cloudflare: zone not found — run the zone step first')
  return zone
}

// Phase 1 of the two-phase cutover: registers the domains on the Vercel
// project and writes any Vercel verification TXT challenges into the
// Cloudflare zone, so the certificate can be issued the moment traffic
// arrives. Safe at any time — live DNS records are not touched and the old
// WordPress site keeps being served.
async function provisionDomainAttach(): Promise<void> {
  const vercelToken = requireEnv('VERCEL_TOKEN')
  const cfToken = requireEnv('CLOUDFLARE_API_TOKEN')
  const team = `teamId=${VERCEL_TEAM_ID}`

  for (const body of [
    { name: MAIL_DOMAIN },
    { name: `www.${MAIL_DOMAIN}`, redirect: MAIL_DOMAIN, redirectStatusCode: 308 },
  ]) {
    const added = await api<{ name?: string; error?: { code: string; message: string } }>(
      `${VERCEL_API}/v10/projects/${VERCEL_PROJECT}/domains?${team}`,
      vercelToken,
      { method: 'POST', body },
    )
    if (added.json.name) console.log(`Vercel: domain ${added.json.name} added to project`)
    else if (added.json.error?.code === 'domain_already_in_use') {
      console.log(`Vercel: domain ${body.name} already on project — skipping`)
    } else {
      throw new Error(`Vercel: adding ${body.name} failed: ${added.json.error?.message}`)
    }
  }

  const zone = await findZone(cfToken)
  const current = await api<
    CfListResponse<{ id: string; name: string; type: string; proxied: boolean }[]>
  >(`${CF_API}/zones/${zone.id}/dns_records?per_page=200`, cfToken)
  const has = (name: string, type: string) =>
    current.json.result?.some((r) => r.name === name && r.type === type)

  // The zone scan imported the site records with the Cloudflare proxy on.
  // Phase 1 must be invisible: plain DNS answers, identical to the current
  // nameservers — so the proxy goes off before the zone ever becomes live.
  for (const record of current.json.result ?? []) {
    if (!record.proxied) continue
    const patched = await api<CfListResponse<unknown>>(
      `${CF_API}/zones/${zone.id}/dns_records/${record.id}`,
      cfToken,
      { method: 'PATCH', body: { proxied: false } },
    )
    if (!patched.json.success) {
      throw new Error(`Cloudflare: disabling proxy on ${record.type} ${record.name} failed`)
    }
    console.log(`Cloudflare: ${record.type} ${record.name} set to DNS only`)
  }

  for (const name of [MAIL_DOMAIN, `www.${MAIL_DOMAIN}`]) {
    const config = await api<{
      verified?: boolean
      verification?: { type: string; domain: string; value: string }[]
    }>(`${VERCEL_API}/v9/projects/${VERCEL_PROJECT}/domains/${name}?${team}`, vercelToken)

    if (config.json.verified) {
      console.log(`Vercel: ${name} is verified for this team`)
      continue
    }

    for (const challenge of config.json.verification ?? []) {
      if (challenge.type !== 'TXT') continue
      if (has(challenge.domain, 'TXT')) {
        console.log(`Cloudflare: TXT ${challenge.domain} already present — skipping`)
        continue
      }
      const created = await api<CfListResponse<unknown>>(
        `${CF_API}/zones/${zone.id}/dns_records`,
        cfToken,
        {
          method: 'POST',
          body: { type: 'TXT', name: challenge.domain, content: `"${challenge.value}"`, ttl: 1 },
        },
      )
      if (!created.json.success) {
        throw new Error(
          `Cloudflare: TXT ${challenge.domain} failed: ${JSON.stringify(created.json.errors).slice(0, 200)}`,
        )
      }
      console.log(`Cloudflare: created verification TXT ${challenge.domain}`)
    }
  }

  console.log('Domain attach done. Verification completes once the zone is live at Cloudflare.')
}

// Phase 2 — the actual go-live action, to run only when the zone is active:
// swaps the zone's site records from the old hosting to Vercel. Mail records
// (hosting MX + Resend set) are left untouched. Rollback = re-create the old
// records printed below; they are logged for exactly that reason.
async function provisionDomainFlip(): Promise<void> {
  const cfToken = requireEnv('CLOUDFLARE_API_TOKEN')

  const zone = await findZone(cfToken)
  if (zone.status !== 'active') {
    throw new Error(
      `Cloudflare: zone status is "${zone.status}" — flip only after the nameserver switch makes it active`,
    )
  }

  const records = await api<
    CfListResponse<{ id: string; type: string; name: string; content: string }[]>
  >(`${CF_API}/zones/${zone.id}/dns_records?per_page=200`, cfToken)

  const isOldSiteRecord = (r: { type: string; name: string }) =>
    ['A', 'AAAA', 'CNAME'].includes(r.type) &&
    [MAIL_DOMAIN, `www.${MAIL_DOMAIN}`, `*.${MAIL_DOMAIN}`].includes(r.name)

  for (const record of records.json.result ?? []) {
    if (!isOldSiteRecord(record)) continue
    const removed = await api<CfListResponse<unknown>>(
      `${CF_API}/zones/${zone.id}/dns_records/${record.id}`,
      cfToken,
      { method: 'DELETE' },
    )
    if (!removed.json.success) {
      throw new Error(`Cloudflare: deleting ${record.type} ${record.name} failed`)
    }
    console.log(`Cloudflare: removed old ${record.type} ${record.name} → ${record.content}`)
  }

  const targets = [
    { type: 'A', name: MAIL_DOMAIN, content: VERCEL_APEX_IP },
    { type: 'CNAME', name: `www.${MAIL_DOMAIN}`, content: VERCEL_CNAME },
  ]
  for (const target of targets) {
    const created = await api<CfListResponse<unknown>>(
      `${CF_API}/zones/${zone.id}/dns_records`,
      cfToken,
      { method: 'POST', body: { ...target, ttl: 1, proxied: false } },
    )
    if (!created.json.success) {
      throw new Error(
        `Cloudflare: creating ${target.type} ${target.name} failed: ${JSON.stringify(created.json.errors).slice(0, 200)}`,
      )
    }
    console.log(`Cloudflare: created ${target.type} ${target.name} → ${target.content} (DNS only)`)
  }
}

// Media lives on the shop's own domain since the zone went active on
// 16.09.2026. The interim media-ua.foxarmor-eu.com stays attached to the
// bucket so any cached URLs keep resolving; image URLs are built from
// NEXT_PUBLIC_MEDIA_URL at request time, so no database changes are needed.
const MEDIA_DOMAIN = `media.${MAIL_DOMAIN}`
const UA_ZONE_ID = '5ec5c3aae4150536623da257f1d5b101'

async function provisionMediaDomain(): Promise<void> {
  const cfToken = requireEnv('CLOUDFLARE_API_TOKEN')
  const account = requireEnv('CLOUDFLARE_ACCOUNT_ID')
  const vercelToken = requireEnv('VERCEL_TOKEN')

  const base = `${CF_API}/accounts/${account}/r2/buckets/${R2_BUCKET}/domains/custom`
  const list = await api<CfListResponse<{ domains: { domain: string; status?: unknown }[] }>>(
    base,
    cfToken,
  )
  const attached = list.json.result?.domains?.some((d) => d.domain === MEDIA_DOMAIN)

  if (attached) {
    console.log(`R2: custom domain ${MEDIA_DOMAIN} already attached — skipping`)
  } else {
    const created = await api<CfListResponse<unknown>>(base, cfToken, {
      method: 'POST',
      body: { domain: MEDIA_DOMAIN, zoneId: UA_ZONE_ID, enabled: true, minTLS: '1.2' },
    })
    if (!created.json.success) {
      throw new Error(`R2: custom domain failed: ${JSON.stringify(created.json.errors).slice(0, 300)}`)
    }
    console.log(`R2: custom domain ${MEDIA_DOMAIN} attached to ${R2_BUCKET}`)
  }

  saveEnvValue('NEXT_PUBLIC_MEDIA_URL', `https://${MEDIA_DOMAIN}`)

  const team = `teamId=${VERCEL_TEAM_ID}`
  const upserted = await api<{ failed?: unknown[] }>(
    `${VERCEL_API}/v10/projects/${VERCEL_PROJECT}/env?upsert=true&${team}`,
    vercelToken,
    {
      method: 'POST',
      body: [
        {
          key: 'NEXT_PUBLIC_MEDIA_URL',
          value: `https://${MEDIA_DOMAIN}`,
          type: 'encrypted',
          target: ['production', 'preview'],
        },
      ],
    },
  )
  if ((upserted.json.failed ?? []).length > 0) {
    throw new Error('Vercel: NEXT_PUBLIC_MEDIA_URL upsert failed')
  }
  console.log(`Vercel: NEXT_PUBLIC_MEDIA_URL → https://${MEDIA_DOMAIN} (redeploy needed to apply)`)
}

async function main(): Promise<void> {
  const [, , ...steps] = process.argv
  const wanted = steps.length > 0 ? steps : ['neon', 'r2', 'resend']

  for (const step of wanted) {
    if (step === 'neon') await provisionNeon()
    else if (step === 'r2') await provisionR2()
    else if (step === 'resend') await provisionResend()
    else if (step === 'zone') await provisionZone()
    else if (step === 'vercel') await provisionVercel()
    else if (step === 'domain-attach') await provisionDomainAttach()
    else if (step === 'domain-flip') await provisionDomainFlip()
    else if (step === 'media') await provisionMediaDomain()
    else throw new Error(`Unknown step: ${step}`)
  }

  console.log(`\nDone. Secrets written to ${ENV_FILE}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
