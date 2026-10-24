import React from 'react'
import { OFFICIAL_FIRM_NAME } from '@/lib/seo'

export function CtaBanner() {
  return (
    <section className="gavel-banner-section" aria-labelledby="cta-banner-heading">
      <img
        src="/images/gavel-banner.webp"
        alt={`Ilustrasi Palu Sidang — ${OFFICIAL_FIRM_NAME}`}
        className="gavel-banner-bg"
        width={1376}
        height={768}
        loading="lazy"
        decoding="async"
      />
      <div className="gavel-banner-scrim" aria-hidden="true" />
      <div className="container gavel-banner-content">
        <h2 id="cta-banner-heading" className="banner-title">
          Solusi Hukum Efektif &amp; Berorientasi pada Kebutuhan Klien.
        </h2>
        <p className="banner-subtitle">
          Setiap klien berhak memperoleh pendampingan hukum yang kompeten disertai dedikasi,
          kepedulian, dan penghormatan dalam setiap tahapan proses hukum.
        </p>
        <a href="#janji-temu" className="btn-gold">
          Konsultasikan Perkara Anda &rarr;
        </a>
      </div>
    </section>
  )
}
