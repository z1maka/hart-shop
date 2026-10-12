import localFont from 'next/font/local'

export const displayFont = localFont({
  src: './fonts/space-grotesk-latin-wght-normal.woff2',
  weight: '300 700',
  display: 'swap',
  variable: '--font-space-grotesk',
  fallback: ['system-ui', 'sans-serif'],
})

export const bodyFont = localFont({
  src: [
    { path: './fonts/instrument-sans-latin-wght-normal.woff2', weight: '400 700', style: 'normal' },
    { path: './fonts/instrument-sans-latin-wght-italic.woff2', weight: '400 700', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-instrument-sans',
  fallback: ['system-ui', 'sans-serif'],
})
