import React from 'react'
import '@/styles/globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { DEFAULT_SITE_SETTINGS } from '@/lib/content'
import { buildLegalServiceJsonLd } from '@/lib/seo'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = DEFAULT_SITE_SETTINGS
  const jsonLd = buildLegalServiceJsonLd(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://fsdanrekan.id',
  )

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
