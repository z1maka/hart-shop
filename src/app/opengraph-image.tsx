import { ImageResponse } from 'next/og'
import { WORDMARK_PATH, WORDMARK_VIEWBOX, wordmarkWidth } from '@/components/layout/Wordmark'
import { siteConfig } from '@/config/site'

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const WORDMARK_HEIGHT = 40

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#f2f0ea',
        padding: '72px',
      }}
    >
      <div style={{ display: 'flex' }}>
        <svg width={wordmarkWidth(WORDMARK_HEIGHT)} height={WORDMARK_HEIGHT} viewBox={WORDMARK_VIEWBOX}>
          <path fillRule="evenodd" d={WORDMARK_PATH} fill="#23241d" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: 62,
            fontWeight: 700,
            color: '#23241d',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            maxWidth: '18ch',
          }}
        >
          Маскування, що знижує вашу сигнатуру
        </span>
        <span style={{ marginTop: 26, fontSize: 26, color: '#70705f' }}>
          Власне виробництво · Відправка щодня · Нова Пошта по всій Україні
        </span>
      </div>

      <div style={{ display: 'flex', height: '10px', width: '220px', background: '#5a6147' }} />
    </div>,
    size,
  )
}
