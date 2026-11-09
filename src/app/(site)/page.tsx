import React from 'react'
import type { Metadata } from 'next'
import {
  fetchInstagramGalleryFromDb,
  fetchPublicCaseRecordsFromDb,
  fetchPublishedArticlesFromDb,
  fetchPublishedPracticeAreasFromDb,
  fetchPublishedTeamMembersFromDb,
  fetchSiteSettingsFromDb,
} from '@/lib/content'
import { fetchLiveInstagramMedia } from '@/lib/instagram'
import { buildPageMetadata, OFFICIAL_FIRM_NAME } from '@/lib/seo'
import { HeroSection } from '@/components/HeroSection'
import { HomePageClient } from '@/components/HomePageClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: `${OFFICIAL_FIRM_NAME} | Kantor Hukum & Advokat Jakarta Pusat`,
  description:
    'Website resmi Ferdinan Silalahi dan Rekan Law Firm (FS dan Rekan), Gedung Mandira Lt. 4, Menteng, Jakarta Pusat. Layanan konsultasi hukum, korporasi, perdata, pertanahan, PKPU, dan litigasi.',
  path: '/',
})

export default async function HomePage() {
  const [settings, teamMembers, practiceAreas, caseRecords, allPublishedArticles, dbIgItems] =
    await Promise.all([
      fetchSiteSettingsFromDb(),
      fetchPublishedTeamMembersFromDb(),
      fetchPublishedPracticeAreasFromDb(),
      fetchPublicCaseRecordsFromDb(),
      fetchPublishedArticlesFromDb(),
      fetchInstagramGalleryFromDb(),
    ])
  const latestArticles = allPublishedArticles.slice(0, 3)

  // SK-13 / Phase 2: Live Instagram Graph API integration with graceful fallback to DB curated gallery
  const instagramResult = await fetchLiveInstagramMedia()
  const instagramItems =
    instagramResult.source === 'live' || instagramResult.source === 'cache'
      ? instagramResult.items
      : dbIgItems

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
        instagramItems={instagramItems}
      />
    </>
  )
}
