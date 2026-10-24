import React from 'react'
import { cleanHtml } from '@/lib/security/sanitize'
import { OFFICIAL_FIRM_NAME } from '@/lib/seo'

interface ArticleBodyProps {
  html: string
}

export function ArticleBody({ html }: ArticleBodyProps) {
  return (
    <div>
      {/* SEC-004 & FR-5.4: HTML content is sanitized before rendering */}
      <div
        className="article-prose"
        dangerouslySetInnerHTML={{ __html: cleanHtml(html) }}
      />

      {/* FR-5.6: Standard disclaimer underneath every article */}
      <aside className="article-disclaimer-box" aria-label="Peringatan dan Disclaimer Hukum">
        <strong>Catatan Penting (Disclaimer):</strong> Seluruh konten artikel ini disediakan oleh{' '}
        <strong>{OFFICIAL_FIRM_NAME}</strong> semata-mata untuk tujuan informasi dan edukasi umum,
        serta <strong>bukan merupakan nasihat hukum (legal advice)</strong>. Hubungan advokat dan
        klien baru berlaku secara sah setelah adanya penandatanganan Surat Kuasa Khusus dan
        Perjanjian Jasa Hukum.
      </aside>
    </div>
  )
}
