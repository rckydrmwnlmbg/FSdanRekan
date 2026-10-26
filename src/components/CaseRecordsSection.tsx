import React from 'react'
import type { PublicCaseRecord } from '@/lib/content'

interface CaseRecordsSectionProps {
  records: PublicCaseRecord[]
}

/**
 * SK-14 / PRD V4: Anonymous by default case track record table.
 * Displays only caseType and region (never win/loss status, year, case value, or unconsented clientName).
 */
export function CaseRecordsSection({ records }: CaseRecordsSectionProps) {
  if (records.length === 0) return null

  return (
    <section
      id="rekam-jejak"
      className="section-gap"
      aria-labelledby="case-records-heading"
    >
      <div className="container">
        <div>
          <h2 id="case-records-heading">Pengalaman Penanganan Perkara</h2>
          <p className="section-subtitle">
            Ringkasan bidang perkara dan wilayah yurisdiksi penanganan untuk menjaga kewajiban
            kerahasiaan advokat serta kepentingan hukum para pihak.
          </p>
        </div>

        <div className="case-records-grid">
          {records.map((rec) => (
            <div key={rec.id} className="case-record-card">
              <div className="case-record-region">{rec.region}</div>
              <div className="case-record-type">{rec.caseType}</div>
              {rec.displayMode === 'named' && rec.clientName ? (
                <div className="case-record-client">{rec.clientName}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
