'use client'

import Script from 'next/script'
import { CONSENT_POLICY } from '@/config/consent'
import { shouldLoadTags } from '@/features/analytics/model/consent'
import { useConsent } from '@/features/analytics/ui/use-consent'

export type AnalyticsIds = {
  readonly gaMeasurementId: string | null
  readonly googleAdsId: string | null
  readonly googleAdsConversionLabel: string | null
  readonly metaPixelId: string | null
  readonly tiktokPixelId: string | null
  readonly clarityProjectId: string | null
}

export function AnalyticsScripts({ ids }: { readonly ids: AnalyticsIds }) {
  const { state, isResolved } = useConsent()

  // The market's consent policy decides (config/consent.ts). Nothing renders
  // before the stored answer is read: a tag started on a guess would already
  // have run for a visitor who refused.
  if (!isResolved || !shouldLoadTags(state, CONSENT_POLICY)) return null

  // GA4 and the Ads tag share one gtag.js; either id alone is enough to load it.
  const gtagId = ids.gaMeasurementId ?? ids.googleAdsId
  const adsConversionSendTo =
    ids.googleAdsId && ids.googleAdsConversionLabel
      ? `${ids.googleAdsId}/${ids.googleAdsConversionLabel}`
      : null

  return (
    <>
      {gtagId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted'
});
gtag('js', new Date());
${ids.gaMeasurementId ? `gtag('config', '${ids.gaMeasurementId}', { send_page_view: true });` : ''}
${ids.googleAdsId ? `gtag('config', '${ids.googleAdsId}');` : ''}
${
  // The purchase conversion is fired from services/track.ts, which only sees
  // window globals. Setting the target in the same script that defines gtag
  // guarantees the two exist together — no load-order race, no drift.
  adsConversionSendTo ? `window.__googleAdsConversionSendTo = '${adsConversionSendTo}';` : ''
}`}
          </Script>
        </>
      ) : null}

      {/* autoConfig off: the pixel's automatic button-click events ran a
          document click listener that added 35–50 ms to every tap on a 4×
          slowed phone (27.09.2026). The shop sends ViewContent, AddToCart,
          InitiateCheckout, Purchase and Lead itself (services/track.ts). */}
      {ids.metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('set', 'autoConfig', false, '${ids.metaPixelId}');
fbq('init', '${ids.metaPixelId}');
fbq('track', 'PageView');`}
        </Script>
      ) : null}

      {ids.tiktokPixelId ? (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
ttq.load('${ids.tiktokPixelId}');
ttq.page();
}(window, document, 'ttq');`}
        </Script>
      ) : null}

      {ids.clarityProjectId ? (
        <Script id="clarity-loader" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${ids.clarityProjectId}");`}
        </Script>
      ) : null}
    </>
  )
}
