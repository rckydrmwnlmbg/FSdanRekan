import React from 'react'
import '@/styles/globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { fetchSiteSettingsFromDb } from '@/lib/content'
import { buildLegalServiceJsonLd, resolvePublicSiteUrl } from '@/lib/seo'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchSiteSettingsFromDb()
  const siteUrl = resolvePublicSiteUrl()
  const jsonLd = buildLegalServiceJsonLd({ siteUrl, settings })

  return (
    <html lang="id">
      <head>
        <link rel="preload" as="image" href="/images/hero-bg.webp" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Header
          whatsappNumber={settings.whatsappNumber}
          defaultWaMessage={settings.defaultWaMessage}
        />
        <main id="main-content">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  )
}
