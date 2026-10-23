import { COMPANY } from '@/config/company'
import { INDEXNOW_KEY } from '@/config/indexnow'

// One endpoint shares a submission with every engine on the protocol: Bing
// (and through it ChatGPT search, Copilot, DuckDuckGo), Yandex, Seznam, Naver.
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const SUBMIT_TIMEOUT_MS = 15_000
// The protocol's limit for one request.
const MAX_URLS_PER_REQUEST = 10_000

export type IndexNowPayload = {
  readonly host: string
  readonly key: string
  readonly urlList: readonly string[]
}

// Only the shop's own pages: the engines refuse a whole batch (422) when one
// URL belongs to another host.
export function indexNowPayload(urls: readonly string[]): IndexNowPayload {
  const host = COMPANY.site

  return {
    host,
    key: INDEXNOW_KEY,
    urlList: [...new Set(urls)]
      .filter((url) => URL.canParse(url) && new URL(url).host === host)
      .slice(0, MAX_URLS_PER_REQUEST),
  }
}

export type IndexNowResult = {
  // 200 accepted; 202 accepted while the key file is still being checked.
  readonly status: number
  readonly detail: string
}

export async function submitToIndexNow(urls: readonly string[]): Promise<IndexNowResult> {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowPayload(urls)),
  })

  return { status: response.status, detail: (await response.text()).slice(0, 500) }
}
