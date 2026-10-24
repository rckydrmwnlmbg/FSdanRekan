import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

interface TeamPhoto {
  id: string
  filename: string
  sourceFilename: string
  mimeType: string
  size: number
  width: number
  height: number
  aspectRatio: string
  url: string
  sizes: Record<string, string>
  srcSet: string
  alt: string
}

interface TeamProfile {
  id: string
  slug: string
  fullName: string
  honorific: string
  displayName: string
  roleTitle: string
  group: string
  motto: string | null
  shortBio: string
  fullBio: string
  education: string[]
  credentials: string[]
  languages: string[]
  tags: string[]
  photo: TeamPhoto
  displayOrder: number
  isPublished: boolean
}

const rootDir = process.cwd()
const teamRaw = readFileSync(join(rootDir, 'content', 'team.json'), 'utf8')
const team: TeamProfile[] = JSON.parse(teamRaw)
const practiceRaw = readFileSync(join(rootDir, 'content', 'practice_areas.json'), 'utf8')
const practiceAreas = JSON.parse(practiceRaw)
const casesRaw = readFileSync(join(rootDir, 'content', 'case_records.json'), 'utf8')
const caseRecords = JSON.parse(casesRaw)

describe('SK-01 Content Seed (content/team.json & content/practice_areas.json)', () => {
  it('contains exactly 5 team profiles in the required order', () => {
    expect(team).toHaveLength(5)
    expect(team.map((p) => [p.displayOrder, p.slug])).toEqual([
      [1, 'ferdinan-hasiholan-silalahi'],
      [2, 'adina-ilmania-ayu'],
      [3, 'basit-rezki'],
      [4, 'delia-zaizafun'],
      [5, 'farhah-tri-febriani'],
    ])
  })

  it('does not contain forbidden legacy names such as FHSP', () => {
    const forbidden = [
      'FHSP',
      'FHSP Law Office',
      'Ferdinan Hasiholan Silalahi & Partners',
      'Ferdinan Silalahi & Rekan',
    ]
    for (const term of forbidden) {
      expect(teamRaw.toLowerCase()).not.toContain(term.toLowerCase())
      expect(practiceRaw.toLowerCase()).not.toContain(term.toLowerCase())
    }
  })

  it('keeps shortBio <= 200 characters for all profiles', () => {
    for (const profile of team) {
      expect(profile.shortBio.length).toBeLessThanOrEqual(200)
      expect(profile.fullBio.length).toBeGreaterThan(100)
    }
  })

  it('maps all 5 photos to public/team/<slug>.webp with 4:5 aspect ratio and required alt text', () => {
    for (const profile of team) {
      expect(profile.photo.url).toBe(`/team/${profile.slug}.webp`)
      expect(profile.photo.aspectRatio).toBe('4:5')
      expect(profile.photo.width * 5).toBe(profile.photo.height * 4)
      expect(profile.photo.alt.startsWith(`Foto ${profile.fullName}`)).toBe(true)
      expect(existsSync(join(rootDir, 'public', 'team', `${profile.slug}.webp`))).toBe(true)
    }
  })

  it('contains 10 practice areas from DESIGN.md Section 8 with TODO(client) placeholders', () => {
    expect(practiceAreas).toHaveLength(10)
    for (const area of practiceAreas) {
      expect(area.summary).toContain('TODO(client)')
      expect(area.description).toContain('TODO(client)')
    }
  })

  it('seeds 7 anonymous case records (SK-14) without exposing any clientName', () => {
    expect(caseRecords).toHaveLength(7)
    const internalParties = [
      'Sekolah Tinggi Teologi Baptis Kalvari',
      'PT Baja Trikarsa Persada',
      'PT Pendekar Konstruksi Persada',
      'PT Inti Darma Globalindo',
    ]
    for (const party of internalParties) {
      expect(casesRaw.toLowerCase()).not.toContain(party.toLowerCase())
    }
    for (const record of caseRecords) {
      expect(record.displayMode).toBe('anonymous')
      expect(record.clientName).toBeNull()
      expect(record.consentRef).toBeNull()
    }
  })
})
