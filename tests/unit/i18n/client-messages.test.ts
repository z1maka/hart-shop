import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import uk from '@/messages/uk.json'
import { CLIENT_MESSAGE_NAMESPACES, pickClientMessages } from '@/i18n/client-messages'

const SOURCE_ROOT = path.resolve(__dirname, '../../../src')
const SOURCE_FILE = /\.tsx?$/
const HOOK_CALL = /useTranslations\(([^)]*)\)/g
const LITERAL_ARGUMENT = /^\s*['"]([^'"]+)['"]\s*$/

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(fullPath)
    return SOURCE_FILE.test(entry.name) ? [fullPath] : []
  })
}

function hookArguments(): string[] {
  return sourceFiles(SOURCE_ROOT).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(HOOK_CALL)].map((match) => match[1] ?? ''),
  )
}

function isCovered(namespace: string): boolean {
  return CLIENT_MESSAGE_NAMESPACES.some(
    (listed) => namespace === listed || namespace.startsWith(`${listed}.`),
  )
}

function valueAt(tree: unknown, dottedPath: string): unknown {
  return dottedPath
    .split('.')
    .reduce<unknown>(
      (node, key) => (typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined),
      tree,
    )
}

describe('CLIENT_MESSAGE_NAMESPACES', () => {
  it('names every namespace a component reads through useTranslations', () => {
    const namespaces = hookArguments().map((argument) => LITERAL_ARGUMENT.exec(argument)?.[1])

    expect(namespaces).not.toContain(undefined)
    expect(namespaces.filter((namespace) => namespace && !isCovered(namespace))).toEqual([])
  })

  it('lists only namespaces that exist in the messages', () => {
    const missing = CLIENT_MESSAGE_NAMESPACES.filter((namespace) => valueAt(uk, namespace) === undefined)

    expect(missing).toEqual([])
  })
})

describe('pickClientMessages', () => {
  it('copies listed namespaces whole and nested ones with their parent path', () => {
    const picked = pickClientMessages(uk)

    expect(picked.nav).toEqual(uk.nav)
    expect(picked.privacyPage).toEqual({ consent: uk.privacyPage.consent })
  })

  it('leaves out what no client component reads', () => {
    const picked = pickClientMessages(uk)

    expect(picked).not.toHaveProperty('refundPolicyPage')
    expect(picked).not.toHaveProperty('meta')
  })

  it('keeps a whole namespace when a nested path of it is also listed', () => {
    const picked = pickClientMessages({ reviews: { title: 'Відгуки', form: { title: 'Форма' } } })

    expect(picked.reviews).toEqual({ title: 'Відгуки', form: { title: 'Форма' } })
  })
})
