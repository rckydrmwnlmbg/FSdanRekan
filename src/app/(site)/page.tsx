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
import { buildPageMetadata, HOME_SEO } from '@/lib/seo'
import { HeroSection } from '@/components/HeroSection'
import { HomePageClient } from '@/components/HomePageClient'

export const revalidate = 60

export const metadata: Metadata = buildPageMetadata({
  title: HOME_SEO.title,
  description: HOME_SEO.description,
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

  // SK-13: Curated or cached live items; never run blocking external embed probes during SSR
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
        instagramEmbedAvailable={true}
      />
    </>
  )
}
