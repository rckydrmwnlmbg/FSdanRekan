'use client'

import React, { useRef, useState } from 'react'
import type {
  ArticlePublicData,
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
import { InquirySection } from '@/components/InquirySection'

interface HomePageClientProps {
  settings: SiteSettingsData
  teamMembers: TeamMemberData[]
  practiceAreas: PracticeAreaData[]
  caseRecords: PublicCaseRecord[]
  latestArticles: ArticlePublicData[]
}

export function HomePageClient({
  settings,
  teamMembers,
  practiceAreas,
  caseRecords,
  latestArticles,
}: HomePageClientProps) {
  const [activeProfile, setActiveProfile] = useState<TeamMemberData | null>(null)
  const [selectedPracticeName, setSelectedPracticeName] = useState<string>(
    practiceAreas[0]?.name ?? '',
  )
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)

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

      <InquirySection
        settings={settings}
        practiceAreas={practiceAreas}
        selectedPracticeAreaName={selectedPracticeName}
      />
    </>
  )
}
