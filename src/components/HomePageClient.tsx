'use client'

import React, { useEffect, useRef, useState } from 'react'
import type {
  ArticlePublicData,
  InstagramGalleryItem,
  PracticeAreaData,
  PublicCaseRecord,
  SiteSettingsData,
  TeamMemberData,
} from '@/lib/content'
import { PracticeAreasSection } from '@/components/PracticeAreasSection'
import { AboutSection } from '@/components/AboutSection'
import { TeamSection } from '@/components/TeamSection'
import { CaseRecordsSection } from '@/components/CaseRecordsSection'
import { CtaBanner } from '@/components/CtaBanner'
import { LatestArticlesSection } from '@/components/LatestArticlesSection'
import { InstagramGallerySection } from '@/components/InstagramGallerySection'
import { InquirySection } from '@/components/InquirySection'
import { GuidedChatWidget } from '@/components/GuidedChatWidget'

interface HomePageClientProps {
  settings: SiteSettingsData
  teamMembers: TeamMemberData[]
  practiceAreas: PracticeAreaData[]
  caseRecords: PublicCaseRecord[]
  latestArticles: ArticlePublicData[]
  instagramItems: InstagramGalleryItem[]
}

export function HomePageClient({
  settings,
  teamMembers,
  practiceAreas,
  caseRecords,
  latestArticles,
  instagramItems,
}: HomePageClientProps) {
  const [activeProfile, setActiveProfile] = useState<TeamMemberData | null>(null)
  const [selectedPracticeName, setSelectedPracticeName] = useState<string>(
    practiceAreas[0]?.name ?? '',
  )
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' },
    )

    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const founder =
    teamMembers.find((m) => m.slug === 'ferdinan-hasiholan-silalahi') ?? teamMembers[0]

  // Exclude Founder from the Team grid so Ferdinan is not duplicated after the About section
  const associatesAndAdmins = teamMembers.filter(
    (m) => m.slug !== 'ferdinan-hasiholan-silalahi',
  )

  return (
    <>
      <PracticeAreasSection
        areas={practiceAreas}
        onSelectForForm={(areaName) => setSelectedPracticeName(areaName)}
      />

      {founder ? (
        <AboutSection
          founder={founder}
          onOpenFounderProfile={(member, triggerEl) => {
            lastTriggerRef.current = triggerEl
            setActiveProfile(member)
          }}
        />
      ) : null}

      <TeamSection
        members={associatesAndAdmins}
        activeProfile={activeProfile}
        onSelectProfile={setActiveProfile}
        lastTriggerRef={lastTriggerRef}
      />

      <CaseRecordsSection records={caseRecords} />

      <CtaBanner />

      <LatestArticlesSection articles={latestArticles} />

      <InstagramGallerySection
        items={instagramItems}
        instagramUrl={settings.instagramUrl}
      />

      <InquirySection
        settings={settings}
        practiceAreas={practiceAreas}
        selectedPracticeAreaName={selectedPracticeName}
      />

      <GuidedChatWidget settings={settings} practiceAreas={practiceAreas} />
    </>
  )
}
