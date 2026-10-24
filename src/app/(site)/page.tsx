import React from 'react'
import type { Metadata } from 'next'
import {
  DEFAULT_SITE_SETTINGS,
  getPublicCaseRecords,
  getPublishedArticles,
  getPublishedPracticeAreas,
  getPublishedTeamMembers,
} from '@/lib/content'
import { buildPageMetadata, OFFICIAL_FIRM_NAME } from '@/lib/seo'
import { HeroSection } from '@/components/HeroSection'
import { HomePageClient } from '@/components/HomePageClient'

export const metadata: Metadata = buildPageMetadata({
  title: `${OFFICIAL_FIRM_NAME} | Kantor Hukum & Advokat Jakarta Pusat`,
  description:
    'Website resmi Ferdinan Silalahi dan Rekan Law Firm (FS dan Rekan), Gedung Mandira Lt. 4, Menteng, Jakarta Pusat. Layanan konsultasi hukum, korporasi, perdata, pertanahan, PKPU, dan litigasi.',
  path: '/',
})

export default function HomePage() {
  const settings = DEFAULT_SITE_SETTINGS
  const teamMembers = getPublishedTeamMembers()
  const practiceAreas = getPublishedPracticeAreas()
  const caseRecords = getPublicCaseRecords()
  const latestArticles = getPublishedArticles().slice(0, 3)

  return (
    <>
      <HeroSection
        whatsappNumber={settings.whatsappNumber}
        defaultWaMessage={settings.defaultWaMessage}
      />
      <HomePageClient
        settings={settings}
        teamMembers={teamMembers}
        practiceAreas={practiceAreas}
        caseRecords={caseRecords}
        latestArticles={latestArticles}
      />
    </>
  )
}
