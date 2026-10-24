import React from 'react'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import '@/styles/globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { DEFAULT_SITE_SETTINGS } from '@/lib/content'
import { buildLegalServiceJsonLd } from '@/lib/seo'

// DESIGN.md Section 3: Self-hosted fonts via next/font (bundled at build time, zero external CDN requests, font-display: swap)
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = DEFAULT_SITE_SETTINGS
  const jsonLd = buildLegalServiceJsonLd(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://fsdanrekan.id',
  )

  return (
    <html lang="id" className={`${cormorant.variable} ${manrope.variable}`}>
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
