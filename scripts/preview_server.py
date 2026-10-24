#!/usr/bin/env python3
"""
Local Interactive Preview Server (http://localhost:3000)
Renders the exact pages, styles (src/styles/tokens.css + src/styles/globals.css),
seeded content (content/team.json, content/practice_areas.json, content/case_records.json),
and optimized WebP assets (public/team/*.webp, public/images/*.webp, public/logo-seal-transparent.png)
with clean public-facing presentation (no internal TODO(client) markers, no duplicate Founder card).
"""

from __future__ import annotations

import html
import json
import mimetypes
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"
CONTENT_DIR = ROOT_DIR / "content"
STYLES_DIR = ROOT_DIR / "src" / "styles"

OFFICIAL_FIRM_NAME = "Ferdinan Silalahi dan Rekan Law Firm"
SHORT_BRAND_NAME = "FS dan Rekan"
OFFICIAL_ADDRESS = (
    "Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, "
    "Gondangdia, Menteng, Jakarta Pusat 10350"
)
WHATSAPP_NUMBER = "62811830991"
WHATSAPP_DISPLAY = "+62 811-830-991"
DEFAULT_WA_MESSAGE = "Halo FS dan Rekan, saya ingin konsultasi hukum."

PRACTICE_PRESENTATION_BY_SLUG = {
    "litigasi-korporasi-dan-komersial": {
        "image": "/images/practice-corporate.webp",
        "summary": "Pendampingan penyelesaian sengketa korporasi, perjanjian komersial, tata kelola perusahaan, serta perlindungan kepentingan hukum pelaku usaha.",
        "description": "Penyelesaian Sengketa Kontrak & Tata Kelola Perusahaan",
        "advocacyScope": [
            "Penanganan sengketa pemegang saham, RUPS, dan organ perseroan",
            "Penyusunan, peninjauan, dan negosiasi kontrak bisnis komersial",
            "Representasi litigasi perdata dan komersial di pengadilan",
        ],
    },
    "sengketa-pertanahan-dan-agraria": {
        "image": "/images/article-land.webp",
        "summary": "Pendampingan sengketa hak atas tanah, pemeriksaan keabsahan dokumen pertanahan (legal due diligence), dan penyelesaian klaim penguasaan lahan.",
        "description": "Kepastian Alas Hak & Penanganan Sengketa Pertanahan",
        "advocacyScope": [
            "Uji tuntas hukum (legal due diligence) sebelum transaksi aset properti",
            "Pendampingan sengketa tumpang tindih sertifikat dan riwayat kepemilikan",
            "Mediasi dan litigasi sengketa hak atas tanah di peradilan",
        ],
    },
    "hukum-perdata-dan-perlindungan-aset": {
        "image": "/images/lady-justice.webp",
        "summary": "Penanganan gugatan wanprestasi, perbuatan melawan hukum (PMH), permohonan sita jaminan, serta perancangan instrumen perlindungan aset.",
        "description": "Penegakan Hak Perdata & Perlindungan Aset Klien",
        "advocacyScope": [
            "Penyusunan somasi, gugatan wanprestasi, dan perbuatan melawan hukum",
            "Permohonan sita jaminan dan pelaksanaan putusan pengadilan",
            "Pendampingan negosiasi pemulihan hak keperdataan",
        ],
    },
    "hukum-pidana-umum-dan-tipikor": {
        "image": "/images/hero-slide-courtroom.webp",
        "summary": "Pendampingan hukum pada tahap pelaporan, penyelidikan, penyidikan, hingga pembelaan di persidangan perkara pidana umum dan tindak pidana korupsi.",
        "description": "Pendampingan Proses Hukum & Pembelaan di Persidangan",
        "advocacyScope": [
            "Pendampingan saksi, pelapor, maupun tersangka dalam pemeriksaan",
            "Penyusunan eksepsi, pledoi, memori banding, kasasi, dan PK",
            "Penanganan perkara tindak pidana umum dan tindak pidana khusus/korupsi",
        ],
    },
    "hak-kekayaan-intelektual-hki": {
        "image": "/images/practice-ip.webp",
        "summary": "Pelindungan hukum atas merek, hak cipta, paten, desain industri, rahasia dagang, serta penyelesaian sengketa kekayaan intelektual.",
        "description": "Pelindungan Kekayaan Intelektual & Perjanjian Lisensi",
        "advocacyScope": [
            "Konsultasi pendaftaran dan pengelolaan portofolio HKI",
            "Penyusunan perjanjian lisensi, waralaba, dan kerahasiaan (NDA)",
            "Penanganan sengketa pelanggaran merek dan hak cipta di Pengadilan Niaga",
        ],
    },
    "ketenagakerjaan-dan-phi": {
        "image": "/images/practice-labor.webp",
        "summary": "Pendampingan hubungan industrial, perundingan bipartit dan tripartit, penyusunan kontrak kerja, serta penyelesaian sengketa di Pengadilan Hubungan Industrial.",
        "description": "Kepatuhan Ketenagakerjaan & Penyelesaian Perselisihan Hubungan Industrial",
        "advocacyScope": [
            "Penyusunan Perjanjian Kerja, Peraturan Perusahaan (PP), dan PKB",
            "Pendampingan perundingan bipartit dan mediasi tripartit",
            "Representasi sengketa Perselisihan Hubungan Industrial (PHI)",
        ],
    },
    "kepailitan-dan-pkpu-niaga": {
        "image": "/images/practice-bankruptcy.webp",
        "summary": "Pendampingan perkara Penundaan Kewajiban Pembayaran Utang (PKPU) dan kepailitan bagi kreditur maupun debitur di Pengadilan Niaga.",
        "description": "Restrukturisasi Kewajiban Utang & Perkara Pengadilan Niaga",
        "advocacyScope": [
            "Penyusunan permohonan PKPU dan kepailitan di Pengadilan Niaga",
            "Pendampingan rapat kreditur, verifikasi tagihan, dan proposal perdamaian",
            "Pengelolaan dokumen restrukturisasi utang korporasi",
        ],
    },
    "arbitrase-dan-mediasi-bisnis": {
        "image": "/images/gavel-banner.webp",
        "summary": "Penyelesaian sengketa komersial di luar pengadilan melalui mekanisme negosiasi, mediasi, dan forum arbitrase secara efektif dan terjaga kerahasiaannya.",
        "description": "Penyelesaian Sengketa Alternatif (ADR) & Mediasi Komersial",
        "advocacyScope": [
            "Perumusan strategi negosiasi dan fasilitasi mediasi bisnis",
            "Pendampingan proses beracara pada forum arbitrase",
            "Pendaftaran dan pelaksanaan putusan perdamaian atau arbitrase",
        ],
    },
    "hukum-perbankan-dan-pembiayaan": {
        "image": "/images/practice-banking.webp",
        "summary": "Pendampingan hukum di bidang perbankan dan pembiayaan, termasuk penanganan kredit bermasalah (Non-Performing Loan/NPL), restrukturisasi, dan eksekusi agunan.",
        "description": "Kepatuhan Perbankan, Restrukturisasi Kredit & Penanganan NPL",
        "advocacyScope": [
            "Penanganan pemulihan kredit bermasalah (Non-Performing Loan / NPL)",
            "Koordinasi restrukturisasi fasilitas kredit dan pengelolaan dokumen jaminan",
            "Pendampingan proses eksekusi hak tanggungan dan jaminan fidusia",
        ],
    },
    "hukum-keluarga-dan-waris": {
        "image": "/images/article-family.webp",
        "summary": "Konsultasi dan pendampingan perkara hukum keluarga, penyusunan perjanjian perkawinan, penataan harta keluarga, serta penyelesaian sengketa waris.",
        "description": "Pendampingan Hukum Keluarga & Penyelesaian Waris",
        "advocacyScope": [
            "Penyusunan dan peninjauan perjanjian perkawinan",
            "Konsultasi pembagian waris dan penataan harta keluarga",
            "Pendampingan penyelesaian sengketa keperdataan keluarga di pengadilan",
        ],
    },
}

ARTICLES = [
    {
        "id": "article-1",
        "slug": "strategi-mitigasi-risiko-litigasi-perjanjian-bisnis",
        "title": "Strategi Mitigasi Risiko Litigasi dalam Perjanjian Bisnis Komersial",
        "excerpt": "Penyusunan klausul penyelesaian sengketa, pembatasan tanggung jawab, dan klausul keadaan kahar guna mengantisipasi wanprestasi mitra usaha.",
        "category": {"slug": "hukum-korporasi", "name": "Hukum Korporasi & Bisnis"},
        "authorName": "Tim Redaksi FS dan Rekan",
        "publishedAt": "12 Oktober 2026",
        "coverUrl": "/images/practice-corporate.webp",
        "coverAlt": "Ilustrasi ruang diskusi hukum korporasi dan kontrak komersial",
        "bodyHtml": (
            "<p>Dalam dinamika bisnis komersial, sengketa antar mitra sering kali berakar dari perumusan klausul kontrak yang multitafsir. "
            "Penyusunan perjanjian yang cermat harus memperhitungkan mekanisme pencegahan dan penyelesaian sengketa sejak tahap negosiasi.</p>"
            "<h2>1. Klausul Pilihan Forum dan Penyelesaian Sengketa</h2>"
            "<p>Menentukan forum penyelesaian sengketa secara tegas—baik melalui Pengadilan Negeri maupun forum alternatif seperti mediasi dan arbitrase—"
            "sangat penting untuk menjaga kepastian hukum bagi para pihak.</p>"
            "<h2>2. Pembatasan Tanggung Jawab dan Keadaan Kahar (Force Majeure)</h2>"
            "<p>Perumusan definisi keadaan kahar serta batasan tanggung jawab perlu merujuk pada ketentuan Kitab Undang-Undang Hukum Perdata dan regulasi sektoral yang berlaku di Indonesia.</p>"
        ),
    },
    {
        "id": "article-2",
        "slug": "penyelesaian-sengketa-kepemilikan-lahan-dan-uji-tuntas",
        "title": "Penyelesaian Sengketa Kepemilikan Lahan & Uji Tuntas (Legal Due Diligence)",
        "excerpt": "Pentingnya pemeriksaan riwayat alas hak dan verifikasi dokumen pertanahan sebelum melakukan transaksi aset properti.",
        "category": {"slug": "agraria-dan-properti", "name": "Agraria & Properti"},
        "authorName": "Tim Redaksi FS dan Rekan",
        "publishedAt": "8 Oktober 2026",
        "coverUrl": "/images/article-land.webp",
        "coverAlt": "Ilustrasi dokumen hukum pertanahan dan agraria",
        "bodyHtml": (
            "<p>Sengketa pertanahan kerap melibatkan tumpang tindih dokumen kepemilikan atau ketidakjelasan riwayat penguasaan fisik. "
            "Uji tuntas hukum (<em>legal due diligence</em>) merupakan langkah preventif utama sebelum transaksi properti dilakukan.</p>"
            "<h2>1. Verifikasi Administrasi Pertanahan</h2>"
            "<p>Pemeriksaan kesesuaian data fisik dan data yuridis pada dokumen pertanahan bertujuan memastikan tidak adanya catatan blokir, sita jaminan, atau sengketa yang sedang berjalan.</p>"
            "<h2>2. Pemeriksaan Riwayat Penguasaan Fisik</h2>"
            "<p>Selain pemeriksaan dokumen, peninjauan batas sempadan dan riwayat penguasaan fisik di lapangan membantu memitigasi klaim pihak ketiga di kemudian hari.</p>"
        ),
    },
    {
        "id": "article-3",
        "slug": "perjanjian-perkawinan-dan-perlindungan-harta-keluarga",
        "title": "Pentingnya Perjanjian Perkawinan & Penataan Harta Keluarga",
        "excerpt": "Instrumen hukum perdata untuk mengatur pemisahan harta bawaan dan tanggung jawab perikatan dalam keluarga.",
        "category": {"slug": "perdata-keluarga", "name": "Perdata Keluarga"},
        "authorName": "Tim Redaksi FS dan Rekan",
        "publishedAt": "28 September 2026",
        "coverUrl": "/images/article-family.webp",
        "coverAlt": "Ilustrasi konsultasi hukum keluarga dan perdata",
        "bodyHtml": (
            "<p>Perjanjian perkawinan (baik sebelum maupun selama ikatan perkawinan berlangsung sesuai ketentuan peraturan perundang-undangan) "
            "merupakan instrumen hukum untuk memberikan kejelasan mengenai status harta dan tanggung jawab perdata masing-masing pasangan.</p>"
            "<h2>1. Pemisahan Tanggung Jawab Perikatan Usaha</h2>"
            "<p>Dengan adanya akta notariil yang dicatatkan pada instansi berwenang, tata kelola harta pribadi dan harta bersama menjadi lebih tertib "
            "apabila salah satu pihak menjalankan kegiatan usaha dengan risiko komersial.</p>"
            "<h2>2. Kepastian Perencanaan Harta Keluarga</h2>"
            "<p>Penataan dokumen kepemilikan aset sejak dini turut membantu meminimalkan potensi perselisihan waris di masa mendatang.</p>"
        ),
    },
]


def wa_link(number: str, message: str) -> str:
    digits = "".join(ch for ch in number if ch.isdigit())
    return f"https://wa.me/{digits}?text={urllib.parse.quote(message)}"


def clean_ui_team_member(m: dict) -> dict:
    m = dict(m)
    honorific = str(m.get("honorific", ""))
    if honorific.startswith("TODO(client)"):
        honorific = ""
    display_name = f"{m['fullName']}, {honorific}" if honorific else str(m["fullName"])
    role_title = str(m.get("roleTitle", ""))
    if role_title.startswith("TODO(client)"):
        role_title = str(m.get("group", "Legal Administrator"))
    photo = dict(m.get("photo", {}))
    photo["alt"] = f"Foto {display_name}"
    m["honorific"] = honorific
    m["displayName"] = display_name
    m["roleTitle"] = role_title
    m["photo"] = photo
    return m


def load_combined_css() -> str:
    tokens = (STYLES_DIR / "tokens.css").read_text(encoding="utf-8")
    globals_css = (STYLES_DIR / "globals.css").read_text(encoding="utf-8")
    cleaned_globals = "\n".join(
        line
        for line in globals_css.splitlines()
        if not line.strip().startswith("@import") and not line.strip().startswith("@tailwind")
    )
    return tokens + "\n" + cleaned_globals


def render_shell(title: str, description: str, body_html: str) -> str:
    css = load_combined_css()
    header_wa = wa_link(WHATSAPP_NUMBER, f"{DEFAULT_WA_MESSAGE} (Sumber: Header {SHORT_BRAND_NAME})")
    floating_wa = wa_link(WHATSAPP_NUMBER, f"{DEFAULT_WA_MESSAGE} (Sumber: Website Resmi {OFFICIAL_FIRM_NAME})")

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(description)}">
  <link rel="icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>{css}</style>
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrapper">
      <a href="/#beranda" class="brand-link" aria-label="Beranda {OFFICIAL_FIRM_NAME}">
        <img src="/logo-seal-transparent.png" alt="Logo {OFFICIAL_FIRM_NAME}" class="brand-logo-img" width="48" height="48">
        <div>
          <div class="brand-text-name">{SHORT_BRAND_NAME}</div>
          <div class="brand-text-sub">Law Firm</div>
        </div>
      </a>
      <nav aria-label="Navigasi Utama">
        <ul class="nav-menu" id="primaryNav">
          <li><a href="/#beranda" class="active">Beranda</a></li>
          <li><a href="/#keahlian">Keahlian</a></li>
          <li><a href="/#tentang">Tentang</a></li>
          <li><a href="/#tim-advokat">Tim Kami</a></li>
          <li><a href="/#rekam-jejak">Rekam Jejak</a></li>
          <li><a href="/#artikel">Wawasan</a></li>
          <li><a href="/#janji-temu">Janji Temu</a></li>
        </ul>
      </nav>
      <div class="header-cta-group">
        <a href="{header_wa}" target="_blank" rel="noopener noreferrer" class="btn-outline header-wa-btn">WhatsApp</a>
        <a href="/#janji-temu" class="btn-gold header-consult-btn">Konsultasi</a>
        <button type="button" class="mobile-hamburger" id="navToggleBtn" aria-label="Buka Menu Navigasi" onclick="document.getElementById('primaryNav').classList.toggle('is-open')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>
    </div>
  </header>

  <main id="main-content">
    {body_html}
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-top-row">
        <div class="footer-brand">
          <img src="/logo-seal-transparent.png" alt="Logo {OFFICIAL_FIRM_NAME}" width="44" height="44" class="brand-logo-img">
          <div>
            <div class="footer-firm-name">{OFFICIAL_FIRM_NAME}</div>
            <div class="footer-brand-short">{SHORT_BRAND_NAME}</div>
          </div>
        </div>
        <div class="footer-address-block">{OFFICIAL_ADDRESS}</div>
      </div>
      <div class="footer-bottom-row">
        <div>&copy; 2026 {OFFICIAL_FIRM_NAME}. Hak Cipta Dilindungi Undang-Undang.</div>
        <div class="footer-links-row">
          <a href="/kebijakan-privasi" class="footer-link">Kebijakan Privasi</a>
          <button type="button" class="footer-disclaimer-btn" onclick="openDisclaimerModal()">Kebijakan Kerahasiaan &amp; Disclaimer</button>
        </div>
      </div>
    </div>
  </footer>

  <a href="{floating_wa}" target="_blank" rel="noopener noreferrer" class="wa-floating-trigger" aria-label="Hubungi lewat WhatsApp">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  </a>

  <div id="disclaimerModal" class="modal-overlay" onclick="if(event.target===this)closeDisclaimerModal()">
    <div class="modal-dialog-box" role="dialog" aria-modal="true" aria-labelledby="disclaimer-modal-title">
      <button type="button" class="modal-close-trigger" aria-label="Tutup Jendela Disclaimer" onclick="closeDisclaimerModal()">&times;</button>
      <h3 id="disclaimer-modal-title" style="margin-bottom: 14px;">Kebijakan Kerahasiaan &amp; Disclaimer</h3>
      <p style="margin-bottom: 14px;">
        Informasi yang disajikan pada website <strong>{OFFICIAL_FIRM_NAME}</strong> disiapkan hanya untuk tujuan informasi umum dan bukan merupakan nasihat hukum formal (<em>legal advice</em>). Hubungan advokat dan klien baru berlaku secara sah setelah adanya penandatanganan Surat Kuasa Khusus dan Perjanjian Jasa Hukum secara resmi.
      </p>
      <p style="margin-bottom: 24px;">
        <strong>{OFFICIAL_FIRM_NAME}</strong> berkomitmen menjaga kerahasiaan data yang dikirimkan melalui situs ini sesuai Kode Etik Advokat Indonesia dan Undang-Undang Pelindungan Data Pribadi (UU No. 27 Tahun 2022). Baca selengkapnya di <a href="/kebijakan-privasi" class="link-gold">Kebijakan Privasi</a>.
      </p>
      <button type="button" class="btn-gold full-width-btn" onclick="closeDisclaimerModal()">Saya Mengerti</button>
    </div>
  </div>

  <script>
    function openDisclaimerModal() {{
      document.getElementById('disclaimerModal').classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }}
    function closeDisclaimerModal() {{
      document.getElementById('disclaimerModal').classList.remove('is-active');
      document.body.style.overflow = '';
    }}
  </script>
</body>
</html>"""


def render_home_page() -> str:
    raw_team = json.loads((CONTENT_DIR / "team.json").read_text(encoding="utf-8"))
    team = [clean_ui_team_member(m) for m in raw_team]
    practice_areas = json.loads((CONTENT_DIR / "practice_areas.json").read_text(encoding="utf-8"))
    case_records = json.loads((CONTENT_DIR / "case_records.json").read_text(encoding="utf-8"))

    for area in practice_areas:
        pres = PRACTICE_PRESENTATION_BY_SLUG.get(area["slug"])
        if pres:
            area["image"] = pres["image"]
            if str(area.get("icon", "")).startswith("TODO(client)"):
                area["icon"] = ""
            if str(area.get("summary", "")).startswith("TODO(client)"):
                area["summary"] = pres["summary"]
            if str(area.get("description", "")).startswith("TODO(client)"):
                area["description"] = pres["description"]
            if any(str(s).startswith("TODO(client)") for s in area.get("advocacyScope", [])):
                area["advocacyScope"] = pres["advocacyScope"]

    founder = next((m for m in team if m["slug"] == "ferdinan-hasiholan-silalahi"), team[0])
    # Exclude Founder from Team Grid so Ferdinan is not repeated twice
    associates_and_admins = [m for m in team if m["slug"] != "ferdinan-hasiholan-silalahi"]

    hero_wa = wa_link(WHATSAPP_NUMBER, f"{DEFAULT_WA_MESSAGE} (Halaman: Beranda {OFFICIAL_FIRM_NAME})")
    direct_wa = wa_link(WHATSAPP_NUMBER, f"{DEFAULT_WA_MESSAGE} (Kantor Pusat Menteng)")

    practice_buttons_html = ""
    for i, area in enumerate(practice_areas):
        active_cls = "is-active" if i == 0 else ""
        selected_attr = "true" if i == 0 else "false"
        practice_buttons_html += f"""
        <div class="practice-item-wrapper">
          <button type="button" role="tab" aria-selected="{selected_attr}" class="practice-row-item {active_cls}" data-slug="{area['slug']}" onclick="selectPracticeArea('{area['slug']}')">
            <span class="practice-row-title">{html.escape(area['name'])}</span>
            <span class="practice-row-badge">{html.escape(area['label'])}</span>
          </button>
        </div>"""

    first_area = practice_areas[0]

    team_cards_html = ""
    for member in associates_and_admins:
        team_cards_html += f"""
        <article class="team-card">
          <div class="team-card-photo">
            <img src="{member['photo']['url']}" srcset="{member['photo']['srcSet']}" sizes="(max-width: 768px) 100vw, 25vw" alt="{html.escape(member['photo']['alt'])}" width="{member['photo']['width']}" height="{member['photo']['height']}" loading="lazy">
            <div class="team-card-overlay" aria-hidden="true"></div>
          </div>
          <div class="team-card-body">
            <div>
              <h3 class="team-name">{html.escape(member['displayName'])}</h3>
              <div class="team-role">{html.escape(member['roleTitle'])}</div>
              <p class="team-short-bio">{html.escape(member['shortBio'])}</p>
            </div>
            <button type="button" class="link-gold" aria-haspopup="dialog" onclick="openTeamModal('{member['slug']}', this)">
              Selengkapnya &rarr;
            </button>
          </div>
        </article>"""

    case_cards_html = ""
    for rec in case_records:
        case_cards_html += f"""
        <div class="case-record-card">
          <div class="case-record-region">{html.escape(rec['region'])}</div>
          <div class="case-record-type">{html.escape(rec['caseType'])}</div>
        </div>"""

    featured = ARTICLES[0]
    secondary_html = ""
    for art in ARTICLES[1:]:
        secondary_html += f"""
        <article class="article-card-item">
          <div class="article-thumb-frame">
            <img src="{art['coverUrl']}" alt="{html.escape(art['coverAlt'])}" width="300" height="200" loading="lazy">
          </div>
          <div class="article-card-body">
            <div class="article-category-badge">{html.escape(art['category']['name'])}</div>
            <h3 class="article-card-title"><a href="/artikel/{art['slug']}">{html.escape(art['title'])}</a></h3>
            <a href="/artikel/{art['slug']}" class="link-gold">Baca Artikel &rarr;</a>
          </div>
        </article>"""

    options_html = "".join(
        f'<option value="{html.escape(a["name"])}">{html.escape(a["name"])}</option>'
        for a in practice_areas
    )

    body = f"""
    <!-- 1. Hero Section -->
    <section id="beranda" class="hero-section" aria-labelledby="hero-heading">
      <div class="hero-background-art">
        <img src="/images/hero-bg.webp" alt="Ruang Sidang dan Advokasi Hukum {OFFICIAL_FIRM_NAME}" width="1376" height="768" fetchpriority="high">
      </div>
      <div class="hero-overlay-scrim" aria-hidden="true"></div>
      <div class="container hero-content-wrap">
        <div class="hero-main-grid">
          <div>
            <h1 id="hero-heading" class="hero-title">
              Keahlian Litigasi.<br>
              <span class="gold-text">Integritas Tanpa Kompromi.</span>
            </h1>
          </div>
          <div>
            <p class="lead-statement">
              <strong>{OFFICIAL_FIRM_NAME}</strong> mengombinasikan analisis yuridis mendalam dengan strategi persidangan dan pendampingan hukum yang presisi untuk melindungi kepentingan klien individu maupun korporasi.
            </p>
            <div class="hero-actions-row">
              <a href="#janji-temu" class="btn-gold">Jadwalkan Konsultasi &rarr;</a>
              <a href="#keahlian" class="btn-outline">10 Bidang Praktik &darr;</a>
              <a href="{hero_wa}" target="_blank" rel="noopener noreferrer" class="link-gold">Kontak WhatsApp &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Practice Areas (10 Bidang Layanan) -->
    <section id="keahlian" class="section-gap section-surface" aria-labelledby="practice-heading">
      <div class="container">
        <div>
          <h2 id="practice-heading">10 Bidang Praktik Utama</h2>
          <p class="section-subtitle">Pilih salah satu bidang keahlian di bawah untuk meninjau ruang lingkup advokasi dan penanganan perkara.</p>
        </div>

        <div class="practice-split-layout">
          <div class="practice-docket-list" role="tablist" aria-label="Daftar 10 Bidang Layanan Hukum">
            {practice_buttons_html}
          </div>

          <div id="practiceStagePanel" role="tabpanel" class="practice-feature-stage">
            <img id="practiceStageImg" src="{first_area['image']}" alt="Ilustrasi {html.escape(first_area['name'])}" class="practice-stage-bg" width="900" height="600" loading="lazy">
            <div class="practice-stage-scrim" aria-hidden="true"></div>
            <div class="practice-stage-content">
              <div id="practiceStageLabel" class="practice-stage-label">{html.escape(first_area['label'])}</div>
              <h3 id="practiceStageTitle" class="practice-stage-title">{html.escape(first_area['name'])}</h3>
              <p id="practiceStageDesc" class="practice-stage-desc">{html.escape(first_area['summary'])}</p>
              <div class="practice-scope-box">
                <div class="practice-scope-heading">Cakupan Advokasi &amp; Penanganan Perkara</div>
                <p id="practiceScopeDesc" style="color:#FFFFFF;font-weight:600;margin-bottom:6px;">{html.escape(first_area['description'])}</p>
                <ul id="practiceScopeList" class="practice-scope-list">
                  {"".join(f"<li>{html.escape(item)}</li>" for item in first_area['advocacyScope'])}
                </ul>
              </div>
              <a id="practiceStageCta" href="#janji-temu" class="btn-gold" onclick="preselectPracticeInForm()">
                Konsultasi {html.escape(first_area['name'])} &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. About & Founder Section (Ferdinan Hasiholan Silalahi, S.H.) -->
    <section id="tentang" class="section-gap" aria-labelledby="about-heading">
      <div class="container">
        <div class="founder-editorial-grid">
          <div class="founder-portrait-mat">
            <div class="founder-photo-inner">
              <img src="{founder['photo']['url']}" srcset="{founder['photo']['srcSet']}" alt="{html.escape(founder['photo']['alt'])}" width="{founder['photo']['width']}" height="{founder['photo']['height']}" loading="lazy">
              <div class="founder-seal-tag">
                <div class="founder-seal-name">{html.escape(founder['displayName'])}</div>
                <div class="founder-seal-role">{html.escape(founder['roleTitle'])}</div>
              </div>
            </div>
          </div>
          <div>
            <h2 id="about-heading">Dedikasi Advokasi Berintegritas.</h2>
            <blockquote class="quote-editorial-box">&ldquo;{html.escape(founder['motto'] or 'Life must have meaning')}&rdquo;</blockquote>
            <p class="about-paragraph">
              Berangkat dari kepedulian terhadap akses masyarakat Indonesia terhadap layanan hukum yang berkualitas, <strong>{OFFICIAL_FIRM_NAME}</strong> didirikan dengan visi menghadirkan pendampingan hukum yang tepercaya, mudah diakses, dan profesional bagi individu, pelaku usaha, maupun masyarakat yang membutuhkan.
            </p>
            <div class="credentials-spec-grid">
              <div class="cred-box">
                <div class="cred-title">Pendekatan Berorientasi Solusi</div>
                <div class="cred-desc">Menjunjung tinggi nilai integritas, profesionalisme, dan keadilan dalam setiap tahapan pendampingan hukum.</div>
              </div>
              <div class="cred-box">
                <div class="cred-title">Komitmen Kerahasiaan Klien</div>
                <div class="cred-desc">Menghormati kerahasiaan informasi klien sesuai Kode Etik Advokat dan ketentuan pelindungan data pribadi yang berlaku.</div>
              </div>
            </div>
            <div class="hero-actions-row">
              <button type="button" class="btn-gold" onclick="openTeamModal('{founder['slug']}', this)">Profil Lengkap Partner &rarr;</button>
              <a href="#janji-temu" class="btn-outline">Konsultasi dengan Partner &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Team Section (4 Rekan Associate & Legal Administrator) -->
    <section id="tim-advokat" class="section-gap section-surface" aria-labelledby="team-heading">
      <div class="container">
        <div>
          <h2 id="team-heading">Tim Advokat &amp; Legal Administrator</h2>
          <p class="section-subtitle">Sinergi advokat dan tenaga administrasi hukum berintegritas tinggi di {OFFICIAL_FIRM_NAME}.</p>
        </div>
        <div class="team-grid-5">
          {team_cards_html}
        </div>
      </div>
    </section>

    <!-- 5. Case Records Section (7 Perkara Anonim — SK-14) -->
    <section id="rekam-jejak" class="section-gap" aria-labelledby="case-records-heading">
      <div class="container">
        <div>
          <h2 id="case-records-heading">Pengalaman Penanganan Perkara</h2>
          <p class="section-subtitle">Ringkasan bidang perkara dan wilayah yurisdiksi penanganan. Demi menjaga kewajiban kerahasiaan advokat, identitas pihak disajikan secara anonim.</p>
        </div>
        <div class="case-records-grid">
          {case_cards_html}
        </div>
      </div>
    </section>

    <!-- 6. Gavel CTA Banner -->
    <section class="gavel-banner-section" aria-labelledby="cta-banner-heading">
      <img src="/images/gavel-banner.webp" alt="Ilustrasi Palu Sidang — {OFFICIAL_FIRM_NAME}" class="gavel-banner-bg" width="1376" height="768" loading="lazy">
      <div class="gavel-banner-scrim" aria-hidden="true"></div>
      <div class="container gavel-banner-content">
        <h2 id="cta-banner-heading" class="banner-title">Solusi Hukum Efektif &amp; Berorientasi pada Kebutuhan Klien.</h2>
        <p class="banner-subtitle">Setiap klien berhak memperoleh pendampingan hukum yang kompeten disertai dedikasi, kepedulian, dan penghormatan dalam setiap tahapan proses hukum.</p>
        <a href="#janji-temu" class="btn-gold">Konsultasikan Perkara Anda &rarr;</a>
      </div>
    </section>

    <!-- 7. Latest Articles Section -->
    <section id="artikel" class="section-gap" aria-labelledby="articles-heading">
      <div class="container">
        <div class="section-header-row">
          <div>
            <h2 id="articles-heading">Wawasan Hukum Terkini</h2>
            <p class="section-subtitle">Kajian umum regulasi, kontrak komersial, pertanahan, dan hukum keluarga.</p>
          </div>
          <a href="/artikel" class="btn-outline">Lihat Semua Artikel &rarr;</a>
        </div>

        <div class="articles-editorial-split">
          <article class="featured-article-card">
            <div class="featured-article-thumb">
              <img src="{featured['coverUrl']}" alt="{html.escape(featured['coverAlt'])}" width="700" height="400" loading="lazy">
            </div>
            <div class="featured-article-body">
              <div class="article-category-badge">{html.escape(featured['category']['name'])}</div>
              <h3 class="featured-article-title"><a href="/artikel/{featured['slug']}">{html.escape(featured['title'])}</a></h3>
              <p class="featured-article-excerpt">{html.escape(featured['excerpt'])}</p>
              <a href="/artikel/{featured['slug']}" class="link-gold">Baca Kajian Hukum &rarr;</a>
            </div>
          </article>
          <div class="stacked-articles-column">
            {secondary_html}
          </div>
        </div>
      </div>
    </section>

    <!-- 8. Consultation Form & Contact Section -->
    <section id="janji-temu" class="section-gap section-surface" aria-labelledby="inquiry-heading">
      <div class="container">
        <div>
          <h2 id="inquiry-heading">Permohonan Janji Temu &amp; Kontak Kantor</h2>
          <p class="section-subtitle">Jadwalkan konsultasi tatap muka di Gedung Mandira Menteng maupun secara daring.</p>
        </div>

        <div class="docket-booking-grid">
          <div class="docket-info-card">
            <h3>Kantor Pusat Menteng</h3>
            <p class="office-address-text">{OFFICIAL_ADDRESS}</p>

            <div class="map-frame-box" id="mapContainer">
              <div class="map-lazy-placeholder">
                <p>Peta lokasi Gedung Mandira, Menteng, Jakarta Pusat</p>
                <div class="map-lazy-actions">
                  <button type="button" class="btn-outline" onclick="loadInteractiveMap()">Muat Peta Interaktif</button>
                  <a href="https://www.google.com/maps/search/?api=1&query=Gedung+Mandira+Jl.+RP+Soeroso+No.+33+Menteng+Jakarta+Pusat" target="_blank" rel="noopener noreferrer" class="link-gold">Buka di Maps &rarr;</a>
                </div>
              </div>
            </div>

            <div class="hotline-box">
              <div class="hotline-label">Hotline Konsultasi Cepat</div>
              <div class="hotline-number">{WHATSAPP_DISPLAY}</div>
            </div>

            <a href="{direct_wa}" target="_blank" rel="noopener noreferrer" class="btn-gold full-width-btn">
              Kirim via WhatsApp Langsung &rarr;
            </a>
          </div>

          <div class="docket-panel-form">
            <div class="confidential-warning-banner" role="note">
              <strong>Peringatan Kerahasiaan:</strong> Jangan menuliskan data rahasia atau dokumen perkara di sini. Uraikan pokok permasalahan secara umum untuk keperluan penjadwalan awal.
            </div>

            <form id="inquiryForm" onsubmit="submitInquiryForm(event)" novalidate>
              <div class="form-row-duo">
                <div class="form-group">
                  <label for="clientName" class="form-label">Nama Lengkap / Instansi</label>
                  <input id="clientName" name="name" type="text" class="form-input" required minlength="2" maxlength="100" placeholder="Nama Lengkap atau Badan Usaha">
                </div>
                <div class="form-group">
                  <label for="clientEmail" class="form-label">Alamat Email</label>
                  <input id="clientEmail" name="email" type="email" class="form-input" required placeholder="nama@perusahaan.com">
                </div>
              </div>

              <div class="form-row-duo">
                <div class="form-group">
                  <label for="clientPhone" class="form-label">Nomor WhatsApp</label>
                  <input id="clientPhone" name="phone" type="tel" class="form-input" required placeholder="+62812xxxxxxxx">
                </div>
                <div class="form-group">
                  <label for="serviceCategory" class="form-label">Bidang Hukum</label>
                  <select id="serviceCategory" name="practiceAreaId" class="form-select" required>
                    {options_html}
                  </select>
                </div>
              </div>

              <div class="form-row-duo">
                <div class="form-group">
                  <label for="meetingDate" class="form-label">Pilihan Tanggal</label>
                  <input id="meetingDate" name="preferredDate" type="date" class="form-input" required>
                </div>
                <div class="form-group">
                  <label for="meetingSession" class="form-label">Waktu Pertemuan</label>
                  <select id="meetingSession" name="sessionSlot" class="form-select" required>
                    <option value="pagi">Pagi (09.30 – 12.00 WIB)</option>
                    <option value="siang">Siang (13.30 – 15.30 WIB)</option>
                    <option value="sore">Sore (16.00 – 18.00 WIB)</option>
                  </select>
                </div>
              </div>

              <fieldset class="form-group form-fieldset">
                <legend class="form-label">Metode Pertemuan</legend>
                <div class="radio-group-row">
                  <label class="radio-label">
                    <input type="radio" name="method" value="tatap-muka" checked>
                    Tatap Muka di Gedung Mandira Menteng
                  </label>
                  <label class="radio-label">
                    <input type="radio" name="method" value="daring">
                    Konsultasi Daring (Video Conference)
                  </label>
                </div>
              </fieldset>

              <div class="form-group">
                <label for="issueDetails" class="form-label">Uraian Singkat Kebutuhan Hukum (Maks. 1000 Karakter)</label>
                <textarea id="issueDetails" name="summary" class="form-textarea" rows="4" required minlength="10" maxlength="1000" placeholder="Tuliskan gambaran umum kebutuhan konsultasi Anda tanpa menyertakan informasi rahasia..."></textarea>
              </div>

              <div class="form-group">
                <label class="consent-checkbox-label">
                  <input id="privacyConsent" name="consent" type="checkbox" required>
                  <span>
                    Saya menyetujui pemrosesan data pribadi yang saya isikan di atas oleh <strong>{OFFICIAL_FIRM_NAME}</strong> untuk tujuan penjadwalan konsultasi (disimpan maksimal 12 bulan) sesuai <a href="/kebijakan-privasi" class="link-gold">Kebijakan Privasi</a>.
                  </span>
                </label>
              </div>

              <div id="formErrorAlert" class="server-error-box" style="display:none;" role="alert"></div>

              <button type="submit" id="submitBtn" class="btn-gold full-width-btn">
                Kirim Permohonan Janji Temu &rarr;
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- Team Profile Modal ("Selengkapnya") -->
    <div id="teamModal" class="modal-overlay" onclick="if(event.target===this)closeTeamModal()">
      <div class="modal-dialog-box" role="dialog" aria-modal="true" aria-labelledby="teamModalName">
        <button type="button" id="teamModalCloseBtn" class="modal-close-trigger" aria-label="Tutup Panel Profil" onclick="closeTeamModal()">&times;</button>
        <div id="teamModalContent"></div>
      </div>
    </div>

    <!-- Form Success Modal -->
    <div id="successModal" class="modal-overlay" onclick="if(event.target===this)closeSuccessModal()">
      <div class="modal-dialog-box" role="dialog" aria-modal="true" aria-labelledby="successModalTitle" style="max-width:540px;text-align:center;">
        <img src="/logo-seal-transparent.png" alt="Logo {OFFICIAL_FIRM_NAME}" width="56" height="56" style="margin:0 auto 16px;display:block;">
        <h3 id="successModalTitle" style="margin-bottom:10px;">Permohonan Janji Temu Diterima</h3>
        <p style="margin-bottom:24px;">
          Terima kasih. Permohonan janji temu Anda telah tersimpan di sistem <strong>{SHORT_BRAND_NAME}</strong>. Tim kami akan menghubungi Anda melalui email atau WhatsApp untuk konfirmasi jadwal.
        </p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <a href="{direct_wa}" target="_blank" rel="noopener noreferrer" class="btn-gold full-width-btn">Lanjutkan via WhatsApp &rarr;</a>
          <button type="button" class="btn-outline full-width-btn" onclick="closeSuccessModal()">Tutup</button>
        </div>
      </div>
    </div>

    <script>
      const TEAM_DATA = {json.dumps({m["slug"]: m for m in team}, ensure_ascii=False)};
      const PRACTICE_DATA = {json.dumps({a["slug"]: a for a in practice_areas}, ensure_ascii=False)};
      let currentPracticeName = {json.dumps(first_area["name"], ensure_ascii=False)};
      let lastTriggerBtn = null;

      function selectPracticeArea(slug) {{
        const area = PRACTICE_DATA[slug];
        if (!area) return;
        currentPracticeName = area.name;
        document.querySelectorAll('.practice-row-item').forEach(btn => {{
          const active = btn.getAttribute('data-slug') === slug;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        }});
        document.getElementById('practiceStageImg').src = area.image;
        document.getElementById('practiceStageLabel').textContent = area.label;
        document.getElementById('practiceStageTitle').textContent = area.name;
        document.getElementById('practiceStageDesc').textContent = area.summary;
        document.getElementById('practiceScopeDesc').textContent = area.description;
        document.getElementById('practiceScopeList').innerHTML = area.advocacyScope.map(i => '<li>' + i + '</li>').join('');
        document.getElementById('practiceStageCta').innerHTML = 'Konsultasi ' + area.name + ' &rarr;';
      }}

      function preselectPracticeInForm() {{
        const select = document.getElementById('serviceCategory');
        if (select) select.value = currentPracticeName;
      }}

      function openTeamModal(slug, triggerEl) {{
        const m = TEAM_DATA[slug];
        if (!m) return;
        lastTriggerBtn = triggerEl || null;
        const tagsHtml = (m.tags || []).length
          ? '<div class="bio-tags-row">' + m.tags.map(t => '<span class="bio-tag-chip">' + t + '</span>').join('') + '</div>'
          : '';
        const paragraphsHtml = m.fullBio.split('\\n\\n').map(p => '<p class="bio-paragraph">' + p + '</p>').join('');
        const eduHtml = (m.education || []).length
          ? '<div class="bio-meta-section"><div class="bio-meta-heading">Pendidikan</div><ul class="bio-meta-list">' + m.education.map(e => '<li>' + e + '</li>').join('') + '</ul></div>'
          : '';
        const credHtml = (m.credentials || []).length
          ? '<div class="bio-meta-section"><div class="bio-meta-heading">Kredensial</div><ul class="bio-meta-list">' + m.credentials.map(c => '<li>' + c + '</li>').join('') + '</ul></div>'
          : '';
        const langHtml = (m.languages || []).length
          ? '<div class="bio-meta-section"><div class="bio-meta-heading">Bahasa</div><ul class="bio-meta-list">' + m.languages.map(l => '<li>' + l + '</li>').join('') + '</ul></div>'
          : '';

        document.getElementById('teamModalContent').innerHTML = `
          <div class="bio-modal-layout">
            <div class="bio-modal-aside">
              <div class="bio-modal-photo-box">
                <img src="${{m.photo.url}}" alt="${{m.photo.alt}}">
              </div>
              <div style="font-size:14px;font-weight:600;color:var(--color-gold-strong);margin-top:10px;">${{m.roleTitle}}</div>
              <div style="font-size:13px;color:var(--color-text-muted);margin-top:2px;">{OFFICIAL_FIRM_NAME}</div>
            </div>
            <div class="bio-modal-main">
              <h3 id="teamModalName" style="margin-bottom:8px;">${{m.displayName}}</h3>
              ${{tagsHtml}}
              <div class="bio-full-text">${{paragraphsHtml}}</div>
              ${{eduHtml}}
              ${{credHtml}}
              ${{langHtml}}
              <div class="bio-modal-actions">
                <a href="#janji-temu" onclick="closeTeamModal()" class="btn-gold">Jadwalkan Janji Temu &rarr;</a>
                <button type="button" onclick="closeTeamModal()" class="btn-outline">Tutup Profil</button>
              </div>
            </div>
          </div>
        `;
        document.getElementById('teamModal').classList.add('is-active');
        document.body.style.overflow = 'hidden';
        document.getElementById('teamModalCloseBtn').focus();
      }}

      function closeTeamModal() {{
        document.getElementById('teamModal').classList.remove('is-active');
        document.body.style.overflow = '';
        if (lastTriggerBtn) lastTriggerBtn.focus();
      }}

      function closeSuccessModal() {{
        document.getElementById('successModal').classList.remove('is-active');
        document.body.style.overflow = '';
      }}

      function loadInteractiveMap() {{
        document.getElementById('mapContainer').innerHTML = '<iframe title="Peta Lokasi Resmi {OFFICIAL_FIRM_NAME}" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.5292868019124!2d106.83606777579133!3d-6.193674693793977!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f43b67eb123b%3A0x6b4fbfe311e92067!2sGedung%20Mandira!5e0!3m2!1sid!2sid!4v1715000000000!5m2!1sid!2sid" width="100%" height="100%" style="border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
      }}

      async function submitInquiryForm(e) {{
        e.preventDefault();
        const errBox = document.getElementById('formErrorAlert');
        errBox.style.display = 'none';
        const form = e.target;
        const payload = {{
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
          practiceAreaId: form.practiceAreaId.value,
          preferredDate: form.preferredDate.value,
          sessionSlot: form.sessionSlot.value,
          method: form.method.value,
          summary: form.summary.value.trim(),
          consent: form.consent.checked,
          turnstileToken: 'preview-token'
        }};

        if (payload.name.length < 2) {{
          errBox.textContent = 'Nama lengkap minimal 2 karakter.';
          errBox.style.display = 'block';
          return;
        }}
        if (!payload.consent) {{
          errBox.textContent = 'Anda wajib menyetujui kebijakan pelindungan data pribadi.';
          errBox.style.display = 'block';
          return;
        }}
        if (payload.summary.length < 10) {{
          errBox.textContent = 'Uraian singkat minimal 10 karakter.';
          errBox.style.display = 'block';
          return;
        }}

        const res = await fetch('/api/inquiry', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify(payload)
        }});
        if (res.ok) {{
          form.reset();
          document.getElementById('successModal').classList.add('is-active');
          document.body.style.overflow = 'hidden';
        }} else {{
          const data = await res.json().catch(() => ({{}}));
          errBox.textContent = data.error || 'Data tidak valid.';
          errBox.style.display = 'block';
        }}
      }}

      window.addEventListener('keydown', (e) => {{
        if (e.key === 'Escape') {{
          closeTeamModal();
          closeDisclaimerModal();
          closeSuccessModal();
        }}
      }});
    </script>
    """
    return render_shell(
        f"{OFFICIAL_FIRM_NAME} | Kantor Hukum & Advokat Jakarta Pusat",
        f"Website resmi {OFFICIAL_FIRM_NAME} ({SHORT_BRAND_NAME}), Gedung Mandira Lt. 4, Menteng, Jakarta Pusat.",
        body,
    )


def render_articles_index() -> str:
    cards = ""
    for art in ARTICLES:
        cards += f"""
        <article class="featured-article-card">
          <div class="featured-article-thumb">
            <img src="{art['coverUrl']}" alt="{html.escape(art['coverAlt'])}" width="600" height="340" loading="lazy">
          </div>
          <div class="featured-article-body">
            <div class="article-category-badge">{html.escape(art['category']['name'])}</div>
            <h2 class="team-name"><a href="/artikel/{art['slug']}">{html.escape(art['title'])}</a></h2>
            <p class="featured-article-excerpt">{html.escape(art['excerpt'])}</p>
            <a href="/artikel/{art['slug']}" class="link-gold">Baca Selengkapnya &rarr;</a>
          </div>
        </article>"""

    body = f"""
    <section class="section-gap">
      <div class="container">
        <h1>Wawasan &amp; Artikel Hukum</h1>
        <p class="section-subtitle">Informasi dan kajian hukum umum yang disusun oleh tim {OFFICIAL_FIRM_NAME}.</p>
        <div class="team-grid-5">
          {cards}
        </div>
      </div>
    </section>
    """
    return render_shell(
        f"Artikel & Wawasan Hukum | {OFFICIAL_FIRM_NAME}",
        f"Kumpulan artikel hukum dari {OFFICIAL_FIRM_NAME}.",
        body,
    )


def render_article_detail(slug: str) -> str | None:
    art = next((a for a in ARTICLES if a["slug"] == slug), None)
    if not art:
        return None
    share_wa = wa_link(
        WHATSAPP_NUMBER,
        f'Halo FS dan Rekan, saya ingin berkonsultasi terkait topik artikel "{art["title"]}".',
    )
    body = f"""
    <article class="section-gap">
      <div class="container">
        <div class="article-category-badge">{html.escape(art['category']['name'])}</div>
        <h1>{html.escape(art['title'])}</h1>
        <div class="trust-stat-desc" style="margin: 8px 0 24px;">
          Diterbitkan pada {html.escape(art['publishedAt'])} &middot; Penulis: {html.escape(art['authorName'])}
        </div>
        <div class="featured-article-thumb" style="max-width:900px;margin-bottom:28px;">
          <img src="{art['coverUrl']}" alt="{html.escape(art['coverAlt'])}" width="900" height="500">
        </div>
        <div class="article-prose">{art['bodyHtml']}</div>
        <aside class="article-disclaimer-box" aria-label="Peringatan dan Disclaimer Hukum">
          <strong>Catatan Penting (Disclaimer):</strong> Seluruh konten artikel ini disediakan oleh <strong>{OFFICIAL_FIRM_NAME}</strong> semata-mata untuk tujuan informasi dan edukasi umum, serta <strong>bukan merupakan nasihat hukum (legal advice)</strong>. Hubungan advokat dan klien baru berlaku secara sah setelah adanya penandatanganan Surat Kuasa Khusus dan Perjanjian Jasa Hukum.
        </aside>
        <div class="hero-actions-row" style="margin-top:28px;">
          <a href="/#janji-temu" class="btn-gold">Jadwalkan Janji Temu Konsultasi &rarr;</a>
          <a href="{share_wa}" target="_blank" rel="noopener noreferrer" class="btn-outline">Konsultasi Topik Ini via WhatsApp</a>
          <a href="/artikel" class="link-gold">&larr; Kembali ke Daftar Artikel</a>
        </div>
      </div>
    </article>
    """
    return render_shell(f"{art['title']} | {OFFICIAL_FIRM_NAME}", art["excerpt"], body)


def render_privacy_policy() -> str:
    body = f"""
    <section class="section-gap">
      <div class="container">
        <h1>Kebijakan Privasi &amp; Disclaimer Hukum</h1>
        <p class="section-subtitle">Komitmen pelindungan data pribadi pengunjung dan batas tanggung jawab informasi umum <strong>{OFFICIAL_FIRM_NAME}</strong>.</p>
        <div class="article-prose">
          <h2>1. Disclaimer Informasi Umum (Bukan Nasihat Hukum)</h2>
          <p>Seluruh konten, artikel, dan informasi yang ditayangkan pada situs web <strong>{OFFICIAL_FIRM_NAME}</strong> disusun semata-mata untuk tujuan informasi umum dan edukasi hukum. Tidak ada bagian dari situs ini yang dapat ditafsirkan sebagai nasihat hukum formal (<em>legal advice</em>).</p>
          <p>Pengiriman formulir permohonan janji temu atau pesan melalui WhatsApp dari situs ini <strong>belum menciptakan hubungan advokat dan klien</strong>. Hubungan hukum antara advokat dan klien baru berlaku secara sah setelah adanya penandatanganan Surat Kuasa Khusus dan/atau Perjanjian Jasa Hukum.</p>
          <h2>2. Pengumpulan dan Tujuan Pemrosesan Data Pribadi</h2>
          <p>Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), kami hanya mengumpulkan data pribadi yang secara sukarela Anda berikan melalui formulir permohonan janji temu untuk tujuan menghubungi Anda kembali guna mengonfirmasi jadwal konsultasi awal.</p>
          <h2>3. Masa Simpan (Retensi) dan Hak Subjek Data</h2>
          <p>Data permohonan janji temu disimpan paling lama <strong>12 (dua belas) bulan</strong> sejak tanggal pengiriman dan akan dihapus secara berkala. Kantor Pusat: <strong>{OFFICIAL_FIRM_NAME}</strong>, {OFFICIAL_ADDRESS}.</p>
        </div>
        <div class="hero-actions-row" style="margin-top:28px;">
          <a href="/" class="btn-outline">&larr; Kembali ke Beranda</a>
        </div>
      </div>
    </section>
    """
    return render_shell(
        f"Kebijakan Privasi & Disclaimer | {OFFICIAL_FIRM_NAME}",
        "Kebijakan Pelindungan Data Pribadi dan Disclaimer informasi hukum.",
        body,
    )


class PreviewRequestHandler(BaseHTTPRequestHandler):
    def send_security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; object-src 'none'")

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            page = render_home_page().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(page)
            return

        if path == "/artikel":
            page = render_articles_index().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(page)
            return

        if path.startswith("/artikel/"):
            slug = path.removeprefix("/artikel/").strip("/")
            detail = render_article_detail(slug)
            if detail is None:
                not_found = render_shell(
                    f"404 Halaman Tidak Ditemukan | {OFFICIAL_FIRM_NAME}",
                    "Halaman tidak ditemukan.",
                    '<section class="section-gap"><div class="container"><h1>404 — Halaman atau Artikel Tidak Ditemukan</h1><p class="section-subtitle">Artikel yang Anda cari tidak tersedia atau masih berstatus draf.</p><div class="hero-actions-row" style="margin-top:24px;"><a href="/" class="btn-gold">Kembali ke Beranda</a></div></div></section>',
                ).encode("utf-8")
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(not_found)))
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(not_found)
                return

            encoded = detail.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(encoded)
            return

        if path == "/kebijakan-privasi":
            page = render_privacy_policy().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(page)
            return

        # Serve static assets from public/
        rel = path.lstrip("/")
        static_file = (PUBLIC_DIR / rel).resolve()
        if static_file.is_file() and PUBLIC_DIR.resolve() in static_file.parents:
            data = static_file.read_bytes()
            mime, _ = mimetypes.guess_type(str(static_file))
            self.send_response(200)
            self.send_header("Content-Type", mime or "application/octet-stream")
            self.send_header("Content-Length", str(len(data)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(data)
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:
        if self.path == "/api/inquiry":
            ctype = self.headers.get("Content-Type", "")
            if "application/json" not in ctype:
                self.send_response(415)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Format permintaan tidak didukung."}')
                return

            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = -1

            if length <= 0 or length > 100 * 1024:
                self.send_response(413 if length > 100 * 1024 else 400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Ukuran data tidak valid atau melebihi batas."}')
                return

            raw = self.rfile.read(length).decode("utf-8", "ignore")
            try:
                body = json.loads(raw)
            except Exception:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Data tidak valid."}')
                return

            if not isinstance(body, dict) or not body.get("consent") or len(str(body.get("name", "")).strip()) < 2:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Data tidak valid."}')
                return

            resp = b'{"ok":true}'
            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(resp)
            return

        self.send_response(404)
        self.end_headers()


def main() -> None:
    mimetypes.add_type("image/webp", ".webp")
    server = HTTPServer(("127.0.0.1", 3000), PreviewRequestHandler)
    print("Preview server running at http://localhost:3000")
    server.serve_forever()


if __name__ == "__main__":
    main()
