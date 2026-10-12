import { Manrope, Oswald } from 'next/font/google'

// The Гарт pair: Oswald for headings, buttons and the menu, Manrope for text.
// Both carry Cyrillic, which every line of the storefront needs; next/font
// downloads them at build time and serves them from the site itself.
export const displayFont = Oswald({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-oswald',
  fallback: ['system-ui', 'sans-serif'],
})

export const bodyFont = Manrope({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-manrope',
  fallback: ['system-ui', 'sans-serif'],
})
