"""
Local Preview Server for Ferdinan Silalahi dan Rekan Law Firm (FS dan Rekan)
Serves the official production design tokens, real content seeds (content/*.json),
processed WebP team portraits & background images (public/*), interactive modals,
scroll-reveal & micro-interaction animations, consultation form submission,
and the interactive /admin CMS Dashboard on http://localhost:3000/admin.
"""

from __future__ import annotations

import datetime
import hashlib
import html
import http.cookies
import json
import mimetypes
import secrets
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

CONTENT_DIR = ROOT_DIR / "content"
PUBLIC_DIR = ROOT_DIR / "public"
STYLES_DIR = ROOT_DIR / "src" / "styles"

OFFICIAL_FIRM_NAME = "Ferdinan Silalahi dan Rekan Law Firm"
SHORT_BRAND_NAME = "FS dan Rekan"
OFFICIAL_ADDRESS = "Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng, Jakarta Pusat 10350"
WHATSAPP_NUMBER = "62811830991"
WHATSAPP_DISPLAY = "+62 811-830-991"
DEFAULT_WA_MESSAGE = "Halo FS dan Rekan, saya ingin konsultasi hukum."

# Local Admin Auth Store (SEC-001: 2-hour session, max 5 failed login attempts -> 15 min lock)
ADMIN_EMAIL = "admin@fsdanrekan.id"
ADMIN_PASSWORD_SHA256 = hashlib.sha256(b"AdminFS2026!#").hexdigest()
ACTIVE_ADMIN_SESSIONS: dict[str, float] = {}
LOGIN_ATTEMPTS: dict[str, list[float]] = {}
CHAT_ATTEMPTS: dict[str, list[float]] = {}

PRACTICE_PRESENTATION_BY_SLUG: dict[str, dict] = {
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
        "summary": "Pendampingan hukum atas sengketa kepemilikan hak atas tanah, tumpang tindih sertifikat, pembebasan lahan, dan administrasi pertanahan.",
        "description": "Advokasi Hak Atas Tanah & Penyelesaian Sengketa Properti",
        "advocacyScope": [
            "Penanganan sengketa hak atas tanah di Peradilan Umum dan PTUN",
            "Uji tuntas hukum (legal due diligence) atas objek tanah dan bangunan",
            "Pendampingan negosiasi, mediasi agraria, dan pengamanan aset properti",
        ],
    },
    "hukum-perdata-dan-perlindungan-aset": {
        "image": "/images/lady-justice.webp",
        "summary": "Advokasi gugatan wanprestasi, perbuatan melawan hukum (PMH), serta penyusunan instrumen hukum untuk pelindungan aset individu maupun badan hukum.",
        "description": "Penanganan Gugatan Perdata & Pengamanan Aset",
        "advocacyScope": [
            "Gugatan wanprestasi dan Perbuatan Melawan Hukum (PMH)",
            "Permohonan sita jaminan dan pelaksanaan eksekusi putusan pengadilan",
            "Penataan dokumen kepemilikan dan perlindungan hukum atas aset",
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


def load_articles(include_drafts: bool = False) -> list[dict]:
    articles_file = CONTENT_DIR / "articles.json"
    if not articles_file.exists():
        return []
    raw = json.loads(articles_file.read_text(encoding="utf-8"))
    if include_drafts:
        return raw
    return [a for a in raw if a.get("status", "published") == "published"]


def save_articles(articles: list[dict]) -> None:
    (CONTENT_DIR / "articles.json").write_text(
        json.dumps(articles, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_inquiries() -> list[dict]:
    inq_file = CONTENT_DIR / "inquiries.json"
    if not inq_file.exists():
        return []
    return json.loads(inq_file.read_text(encoding="utf-8"))


def save_inquiries(inquiries: list[dict]) -> None:
    (CONTENT_DIR / "inquiries.json").write_text(
        json.dumps(inquiries, ensure_ascii=False, indent=2), encoding="utf-8"
    )


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
  <div class="scroll-progress-track" aria-hidden="true">
    <div class="scroll-progress-bar" id="scrollProgressBar"></div>
  </div>

  <header class="site-header" id="siteHeader">
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
          <li><a href="/#beranda" data-nav-sec="beranda" class="active">Beranda</a></li>
          <li><a href="/#keahlian" data-nav-sec="keahlian">Keahlian</a></li>
          <li><a href="/#tentang" data-nav-sec="tentang">Tentang</a></li>
          <li><a href="/#tim-advokat" data-nav-sec="tim-advokat">Tim Kami</a></li>
          <li><a href="/#rekam-jejak" data-nav-sec="rekam-jejak">Rekam Jejak</a></li>
          <li><a href="/#artikel" data-nav-sec="artikel">Wawasan</a></li>
          <li><a href="/#galeri-instagram" data-nav-sec="galeri-instagram">Galeri</a></li>
          <li><a href="/#janji-temu" data-nav-sec="janji-temu">Janji Temu</a></li>
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
          <a href="/admin" class="footer-link">Panel Admin CMS</a>
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

    // Scroll-Reveal IntersectionObserver + Scroll Progress + Header Elevation + Hero Background Crossfade
    (function initAnimations() {{
      const revealEls = document.querySelectorAll('[data-reveal]');
      if ('IntersectionObserver' in window) {{
        const io = new IntersectionObserver((entries) => {{
          entries.forEach(entry => {{
            if (entry.isIntersecting) {{
              entry.target.classList.add('is-revealed');
              io.unobserve(entry.target);
            }}
          }});
        }}, {{ threshold: 0.12, rootMargin: '0px 0px -36px 0px' }});
        revealEls.forEach(el => io.observe(el));
      }} else {{
        revealEls.forEach(el => el.classList.add('is-revealed'));
      }}

      const header = document.getElementById('siteHeader');
      const progressBar = document.getElementById('scrollProgressBar');
      const sections = document.querySelectorAll('main section[id]');
      const navLinks = document.querySelectorAll('.nav-menu a[data-nav-sec]');

      function onScroll() {{
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        if (progressBar) {{
          progressBar.style.width = Math.min(100, (scrollTop / docHeight) * 100) + '%';
        }}
        if (header) {{
          header.classList.toggle('is-scrolled', scrollTop > 36);
        }}
        if (sections.length && navLinks.length) {{
          let currentId = 'beranda';
          sections.forEach(sec => {{
            if (scrollTop >= sec.offsetTop - 180) {{
              currentId = sec.id;
            }}
          }});
          navLinks.forEach(link => {{
            link.classList.toggle('active', link.getAttribute('data-nav-sec') === currentId);
          }});
        }}
      }}
      window.addEventListener('scroll', onScroll, {{ passive: true }});
      onScroll();

      // Hero Dual-Slide Ken Burns Crossfade
      const heroSlides = document.querySelectorAll('.hero-bg-slide');
      if (heroSlides.length > 1) {{
        let slideIdx = 0;
        setInterval(() => {{
          heroSlides[slideIdx].classList.remove('is-visible');
          slideIdx = (slideIdx + 1) % heroSlides.length;
          heroSlides[slideIdx].classList.add('is-visible');
        }}, 6500);
      }}
    }})();
  </script>
</body>
</html>"""


def render_home_page() -> str:
    from scripts.admin_cms import (
        get_merged_case_records,
        get_merged_instagram_gallery,
        get_merged_practice_areas,
        get_merged_team_members,
        load_cms_state,
    )

    cms_settings = load_cms_state()["siteSettings"]
    team = get_merged_team_members(clean_ui_team_member, include_unpublished=False)
    practice_areas = get_merged_practice_areas(PRACTICE_PRESENTATION_BY_SLUG, include_unpublished=False)
    case_records = get_merged_case_records(include_unpublished=False)
    published_articles = load_articles(include_drafts=False)
    instagram_items = get_merged_instagram_gallery(include_unpublished=False)

    founder = next((m for m in team if m["slug"] == "ferdinan-hasiholan-silalahi"), team[0])
    # Exclude Founder from Team Grid so Ferdinan is not repeated twice
    associates_and_admins = [m for m in team if m["slug"] != "ferdinan-hasiholan-silalahi"]

    hero_wa = wa_link(
        cms_settings["whatsappNumber"],
        f"{cms_settings['defaultWaMessage']} (Halaman: Beranda {cms_settings['officialFirmName']})",
    )
    direct_wa = wa_link(
        cms_settings["whatsappNumber"],
        f"{cms_settings['defaultWaMessage']} (Kantor Pusat Menteng)",
    )

    practice_buttons_html = ""
    for i, area in enumerate(practice_areas):
        active_cls = "is-active" if i == 0 else ""
        selected_attr = "true" if i == 0 else "false"
        delay = f"{i * 0.04:.2f}s"
        practice_buttons_html += f"""
        <div class="practice-item-wrapper" data-reveal="left" style="--reveal-delay:{delay}">
          <button type="button" role="tab" aria-selected="{selected_attr}" class="practice-row-item {active_cls}" data-slug="{area['slug']}" onclick="selectPracticeArea('{area['slug']}')">
            <span class="practice-row-title">{html.escape(area['name'])}</span>
            <span class="practice-row-badge">{html.escape(area['label'])}</span>
          </button>
        </div>"""

    first_area = practice_areas[0]

    ig_cards_html = ""
    for idx, ig in enumerate(instagram_items):
        delay = f"{idx * 0.08:.2f}s"
        ig_cards_html += f"""
        <article class="instagram-card" data-reveal="up" style="--reveal-delay:{delay}">
          <div class="instagram-card-thumb">
            <img src="{ig['imageUrl']}" alt="{html.escape(ig['alt'])}" width="480" height="480" loading="lazy">
            <span class="instagram-badge">{html.escape(ig['category'])}</span>
          </div>
          <div class="instagram-card-body">
            <div class="instagram-card-date">{html.escape(ig['publishedDate'])}</div>
            <p class="instagram-card-caption">{html.escape(ig['caption'])}</p>
            <a href="{html.escape(ig['permalink'])}" target="_blank" rel="noopener noreferrer" class="link-gold">
              Lihat di Instagram &nearr;
            </a>
          </div>
        </article>"""

    team_cards_html = ""
    for idx, member in enumerate(associates_and_admins):
        delay = f"{idx * 0.1:.2f}s"
        team_cards_html += f"""
        <article class="team-card" data-reveal="up" style="--reveal-delay:{delay}">
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
    for idx, rec in enumerate(case_records):
        delay = f"{idx * 0.07:.2f}s"
        case_cards_html += f"""
        <div class="case-record-card" data-reveal="up" style="--reveal-delay:{delay}">
          <div class="case-record-region">{html.escape(rec['region'])}</div>
          <div class="case-record-type">{html.escape(rec['caseType'])}</div>
        </div>"""

    featured = published_articles[0] if published_articles else {
        "slug": "strategi-mitigasi-risiko-litigasi-perjanjian-bisnis",
        "title": "Strategi Mitigasi Risiko Litigasi dalam Perjanjian Bisnis Komersial",
        "excerpt": "Penyusunan klausul penyelesaian sengketa dan pembatasan tanggung jawab.",
        "category": {"name": "Hukum Korporasi & Bisnis"},
        "coverUrl": "/images/practice-corporate.webp",
        "coverAlt": "Ilustrasi hukum korporasi",
    }
    secondary_html = ""
    for idx, art in enumerate(published_articles[1:3]):
        delay = f"{(idx + 1) * 0.12:.2f}s"
        secondary_html += f"""
        <article class="article-card-item" data-reveal="right" style="--reveal-delay:{delay}">
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
        <img src="/images/hero-bg.webp" alt="Ruang Sidang dan Advokasi Hukum {html.escape(cms_settings['officialFirmName'])}" class="hero-bg-slide is-visible" width="1376" height="768" fetchpriority="high">
        <img src="/images/hero-slide-courtroom.webp" alt="Persidangan dan Advokasi Litigasi {html.escape(cms_settings['officialFirmName'])}" class="hero-bg-slide" width="1376" height="768" loading="lazy">
      </div>
      <div class="hero-overlay-scrim" aria-hidden="true"></div>
      <div class="hero-ambient-glow" aria-hidden="true"></div>
      <div class="container hero-content-wrap">
        <div class="hero-main-grid">
          <div data-reveal="up">
            <div class="eyebrow-tag">{html.escape(cms_settings['heroEyebrow'])}</div>
            <h1 id="hero-heading" class="hero-title">
              {html.escape(cms_settings['heroTitleLine1'])}<br>
              <span class="gold-text gold-shimmer-text">{html.escape(cms_settings['heroTitleGold'])}</span>
            </h1>
          </div>
          <div data-reveal="up" style="--reveal-delay:0.15s">
            <p class="lead-statement">
              {html.escape(cms_settings['heroLead'])}
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
        <div data-reveal="up">
          <div class="eyebrow-tag">BIDANG KEAHLIAN HUKUM</div>
          <h2 id="practice-heading">10 Bidang Praktik Utama</h2>
          <p class="section-subtitle">Pilih salah satu bidang keahlian di bawah untuk meninjau ruang lingkup advokasi dan penanganan perkara.</p>
        </div>

        <div class="practice-split-layout">
          <div class="practice-docket-list" role="tablist" aria-label="Daftar 10 Bidang Layanan Hukum">
            {practice_buttons_html}
          </div>

          <div id="practiceStagePanel" role="tabpanel" class="practice-feature-stage" data-reveal="right" style="--reveal-delay:0.12s">
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
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:14px;">
                <a id="practiceStageCta" href="#janji-temu" class="btn-gold" onclick="preselectPracticeInForm()">
                  Konsultasi {html.escape(first_area['name'])} &rarr;
                </a>
                <a id="practiceDetailLink" href="/layanan/{first_area['slug']}" class="link-gold">
                  Halaman Detail Layanan &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. About & Founder Section (Ferdinan Hasiholan Silalahi, S.H.) -->
    <section id="tentang" class="section-gap" aria-labelledby="about-heading">
      <div class="container">
        <div class="founder-editorial-grid">
          <div class="founder-portrait-mat" data-reveal="left">
            <div class="founder-photo-inner">
              <img src="{founder['photo']['url']}" srcset="{founder['photo']['srcSet']}" alt="{html.escape(founder['photo']['alt'])}" width="{founder['photo']['width']}" height="{founder['photo']['height']}" loading="lazy">
              <div class="founder-seal-tag">
                <div class="founder-seal-name">{html.escape(founder['displayName'])}</div>
                <div class="founder-seal-role">{html.escape(founder['roleTitle'])}</div>
              </div>
            </div>
          </div>
          <div data-reveal="right" style="--reveal-delay:0.12s">
            <div class="eyebrow-tag">{html.escape(cms_settings['aboutEyebrow'])}</div>
            <h2 id="about-heading">{html.escape(cms_settings['aboutHeading'])}</h2>
            <blockquote class="quote-editorial-box">&ldquo;{html.escape(cms_settings['founderMotto'] or founder['motto'] or 'Life must have meaning')}&rdquo;</blockquote>
            <p class="about-paragraph">
              {html.escape(cms_settings['aboutParagraph'])}
            </p>
            <div class="credentials-spec-grid">
              <div class="cred-box">
                <div class="cred-title">{html.escape(cms_settings['cred1Title'])}</div>
                <div class="cred-desc">{html.escape(cms_settings['cred1Desc'])}</div>
              </div>
              <div class="cred-box">
                <div class="cred-title">{html.escape(cms_settings['cred2Title'])}</div>
                <div class="cred-desc">{html.escape(cms_settings['cred2Desc'])}</div>
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
        <div data-reveal="up">
          <div class="eyebrow-tag">REKAN &amp; TIM PROFESIONAL</div>
          <h2 id="team-heading">Tim Advokat &amp; Legal Administrator</h2>
          <p class="section-subtitle">Sinergi advokat dan tenaga administrasi hukum berintegritas tinggi di {html.escape(cms_settings['officialFirmName'])}.</p>
        </div>
        <div class="team-grid-5">
          {team_cards_html}
        </div>
      </div>
    </section>

    <!-- 5. Case Records Section (7 Perkara Anonim — SK-14) -->
    <section id="rekam-jejak" class="section-gap" aria-labelledby="case-records-heading">
      <div class="container">
        <div data-reveal="up">
          <div class="eyebrow-tag">PORTOFOLIO PENANGANAN PERKARA</div>
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
      <img src="/images/gavel-banner.webp" alt="Ilustrasi Palu Sidang — {html.escape(cms_settings['officialFirmName'])}" class="gavel-banner-bg" width="1376" height="768" loading="lazy">
      <div class="gavel-banner-scrim" aria-hidden="true"></div>
      <div class="container gavel-banner-content" data-reveal="scale">
        <div class="eyebrow-tag">{html.escape(cms_settings['ctaEyebrow'])}</div>
        <h2 id="cta-banner-heading" class="banner-title">{html.escape(cms_settings['ctaTitle'])}</h2>
        <p class="banner-subtitle">{html.escape(cms_settings['ctaSubtitle'])}</p>
        <a href="#janji-temu" class="btn-gold">Konsultasikan Perkara Anda &rarr;</a>
      </div>
    </section>

    <!-- 7. Latest Articles Section -->
    <section id="artikel" class="section-gap" aria-labelledby="articles-heading">
      <div class="container">
        <div class="section-header-row" data-reveal="up">
          <div>
            <div class="eyebrow-tag">PUBLIKASI &amp; EDUKASI HUKUM</div>
            <h2 id="articles-heading">Wawasan Hukum Terkini</h2>
            <p class="section-subtitle">Kajian umum regulasi, kontrak komersial, pertanahan, dan hukum keluarga.</p>
          </div>
          <a href="/artikel" class="btn-outline">Lihat Semua Artikel &rarr;</a>
        </div>

        <div class="articles-editorial-split">
          <article class="featured-article-card" data-reveal="left">
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

    <!-- 7.5. Curated Instagram Educational Gallery (SK-13 / PRD V3) -->
    <section id="galeri-instagram" class="section-gap" aria-labelledby="instagram-heading">
      <div class="container">
        <div class="section-header-row" data-reveal="up">
          <div>
            <div class="eyebrow-tag">PUBLIKASI RESMI INSTAGRAM (SK-13)</div>
            <h2 id="instagram-heading">Galeri Edukasi Hukum &amp; Kegiatan Firma</h2>
            <p class="section-subtitle">Kutipan edukasi hukum, analisis kasus, dan kegiatan advokasi resmi dari akun Instagram @fsdanrekan.</p>
          </div>
          <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" class="btn-outline">
            Ikuti di Instagram &nearr;
          </a>
        </div>
        <div class="instagram-gallery-grid" style="margin-top:36px;">
          {ig_cards_html}
        </div>
      </div>
    </section>

    <!-- 8. Consultation Form & Contact Section -->
    <section id="janji-temu" class="section-gap section-surface" aria-labelledby="inquiry-heading">
      <div class="container">
        <div data-reveal="up">
          <div class="eyebrow-tag">JADWALKAN KONSULTASI RESMI</div>
          <h2 id="inquiry-heading">Permohonan Janji Temu &amp; Kontak Kantor</h2>
          <p class="section-subtitle">Jadwalkan konsultasi tatap muka di Gedung Mandira Menteng maupun secara daring.</p>
        </div>

        <div class="docket-booking-grid">
          <div class="docket-info-card" data-reveal="left">
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

          <div class="docket-panel-form" data-reveal="right" style="--reveal-delay:0.12s">
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

    <!-- Guided Consultation Chat Widget (SK-11 / PRD Phase 2) -->
    <div id="guidedChatWidgetRoot" class="guided-chat-root">
      <button type="button" id="guidedChatTrigger" class="guided-chat-trigger" aria-label="Buka Chat Pemandu Konsultasi" onclick="toggleGuidedChat()">
        <span class="chat-trigger-icon">💬</span>
        <span class="chat-trigger-label">Konsultasi Pemandu</span>
      </button>

      <div id="guidedChatPanel" class="guided-chat-panel" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="chatPanelHeading">
        <div class="guided-chat-header">
          <div>
            <h4 id="chatPanelHeading" style="margin:0;font-size:1rem;color:var(--color-gold-strong);">Pemandu Konsultasi Hukum</h4>
            <div style="font-size:11.5px;color:var(--color-text-muted);">{SHORT_BRAND_NAME} &middot; Respons Cepat</div>
          </div>
          <button type="button" class="modal-close-trigger" style="position:static;font-size:22px;" onclick="toggleGuidedChat()">&times;</button>
        </div>

        <div class="guided-chat-body" id="chatStepContainer">
          <!-- Step 1: Consent & Disclaimer -->
          <div id="chatStep1" class="chat-step-pane">
            <p style="font-size:13px;line-height:1.5;color:var(--color-text-secondary);margin-bottom:12px;">
              Selamat datang di sarana konsultasi awal terpandu <strong>{OFFICIAL_FIRM_NAME}</strong>.
            </p>
            <div class="confidential-warning-banner" style="font-size:11.5px;padding:8px 10px;margin-bottom:14px;">
              <strong>SEC-015:</strong> Layanan ini adalah sarana konsultasi awal terpandu dan bukan merupakan nasihat hukum formal (legal opinion).
            </div>
            <label class="consent-checkbox-label" style="font-size:12px;margin-bottom:16px;">
              <input type="checkbox" id="chatConsentCheck" onchange="document.getElementById('chatBtnStep1').disabled = !this.checked">
              <span>Saya menyetujui pemrosesan data awal konsultasi sesuai <a href="/kebijakan-privasi" target="_blank" class="link-gold">Kebijakan Privasi</a>.</span>
            </label>
            <button type="button" id="chatBtnStep1" class="btn-gold full-width-btn cms-btn-sm" disabled onclick="goToChatStep(2)">Mulai Konsultasi &rarr;</button>
          </div>

          <!-- Step 2: Practice Area Selection -->
          <div id="chatStep2" class="chat-step-pane" style="display:none;">
            <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:10px;">
              Pilih bidang hukum yang paling sesuai dengan kebutuhan perkara Anda:
            </p>
            <select id="chatPracticeSelect" class="form-select cms-btn-sm" style="margin-bottom:14px;">
              {"".join(f'<option value="{html.escape(a["name"])}">{html.escape(a["name"])}</option>' for a in practice_areas)}
            </select>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn-outline cms-btn-sm" onclick="goToChatStep(1)">&larr; Kembali</button>
              <button type="button" class="btn-gold cms-btn-sm" style="flex:1;" onclick="goToChatStep(3)">Lanjut &rarr;</button>
            </div>
          </div>

          <!-- Step 3: Preferred Schedule & Notes -->
          <div id="chatStep3" class="chat-step-pane" style="display:none;">
            <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;">
              Preferensi jadwal dan uraian singkat masalah:
            </p>
            <input type="text" id="chatScheduleInput" class="form-input cms-btn-sm" placeholder="Contoh: Senin depan siang / Segera" style="margin-bottom:10px;">
            <textarea id="chatNotesInput" class="form-textarea" rows="3" placeholder="Uraikan gambaran umum kebutuhan konsultasi Anda (tanpa data rahasia)..." style="font-size:12.5px;margin-bottom:12px;"></textarea>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn-outline cms-btn-sm" onclick="goToChatStep(2)">&larr; Kembali</button>
              <button type="button" class="btn-gold cms-btn-sm" style="flex:1;" onclick="goToChatStep(4)">Lanjut &rarr;</button>
            </div>
          </div>

          <!-- Step 4: Contact Details -->
          <div id="chatStep4" class="chat-step-pane" style="display:none;">
            <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;">
              Kontak Anda untuk tindak lanjut advokat:
            </p>
            <input type="text" id="chatNameInput" class="form-input cms-btn-sm" placeholder="Nama Lengkap Anda" style="margin-bottom:10px;">
            <input type="tel" id="chatPhoneInput" class="form-input cms-btn-sm" placeholder="Nomor WhatsApp (mis. 0812xxxxxxxx)" style="margin-bottom:12px;">
            <div id="chatErrorMsg" class="server-error-box" style="display:none;font-size:12px;padding:6px 10px;margin-bottom:10px;"></div>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn-outline cms-btn-sm" onclick="goToChatStep(3)">&larr; Kembali</button>
              <button type="button" id="chatSubmitBtn" class="btn-gold cms-btn-sm" style="flex:1;" onclick="submitGuidedChat()">Hubungkan ke WhatsApp &rarr;</button>
            </div>
          </div>

          <!-- Step 5: Success / Hand-off -->
          <div id="chatStep5" class="chat-step-pane" style="display:none;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">✅</div>
            <h4 style="color:var(--color-gold-strong);margin-bottom:6px;">Sesi Konsultasi Terbentuk</h4>
            <p style="font-size:12.5px;color:var(--color-text-secondary);line-height:1.5;margin-bottom:14px;">
              Data konsultasi awal Anda telah tersimpan dengan aman di sistem firma. Klik tombol di bawah untuk melanjutkan pesan WhatsApp terformat ke Hotline kami.
            </p>
            <a id="chatWaRedirectBtn" href="#" target="_blank" rel="noopener noreferrer" class="btn-gold full-width-btn cms-btn-sm">Buka WhatsApp Sekarang &rarr;</a>
          </div>
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
        const stage = document.getElementById('practiceStagePanel');
        if (stage) {{
          stage.classList.add('is-switching');
          setTimeout(() => {{
            document.getElementById('practiceStageImg').src = area.image;
            document.getElementById('practiceStageLabel').textContent = area.label;
            document.getElementById('practiceStageTitle').textContent = area.name;
            document.getElementById('practiceStageDesc').textContent = area.summary;
            document.getElementById('practiceScopeDesc').textContent = area.description;
            document.getElementById('practiceScopeList').innerHTML = area.advocacyScope.map(i => '<li>' + i + '</li>').join('');
            document.getElementById('practiceStageCta').innerHTML = 'Konsultasi ' + area.name + ' &rarr;';
            const pLink = document.getElementById('practiceDetailLink');
            if (pLink) pLink.href = '/layanan/' + slug;
            stage.classList.remove('is-switching');
          }}, 210);
        }}
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
                <a href="/tim/${{m.slug}}" class="btn-outline">Halaman Profil Lengkap &rarr;</a>
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

      function toggleGuidedChat() {{
        const panel = document.getElementById('guidedChatPanel');
        if (panel) {{
          const isShown = panel.style.display !== 'none';
          panel.style.display = isShown ? 'none' : 'block';
        }}
      }}

      function goToChatStep(step) {{
        for (let i = 1; i <= 5; i++) {{
          const el = document.getElementById('chatStep' + i);
          if (el) el.style.display = (i === step) ? 'block' : 'none';
        }}
      }}

      async function submitGuidedChat() {{
        const name = document.getElementById('chatNameInput').value.trim();
        const phone = document.getElementById('chatPhoneInput').value.trim();
        const practice = document.getElementById('chatPracticeSelect').value;
        const schedule = document.getElementById('chatScheduleInput').value.trim() || 'Fleksibel';
        const notes = document.getElementById('chatNotesInput').value.trim();
        const errEl = document.getElementById('chatErrorMsg');

        if (!name || name.length < 2) {{
          errEl.textContent = 'Silakan masukkan nama lengkap Anda.';
          errEl.style.display = 'block';
          return;
        }}
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 9) {{
          errEl.textContent = 'Silakan masukkan nomor WhatsApp yang valid.';
          errEl.style.display = 'block';
          return;
        }}
        errEl.style.display = 'none';
        const submitBtn = document.getElementById('chatSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menghubungkan...';

        try {{
          const res = await fetch('/api/chat', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{
              visitorName: name,
              visitorPhone: phone,
              practiceArea: practice,
              preferredSchedule: schedule,
              notes: notes,
              consent: true
            }})
          }});
          const data = await res.json();
          if (res.ok && data.waUrl) {{
            document.getElementById('chatWaRedirectBtn').href = data.waUrl;
            goToChatStep(5);
            window.open(data.waUrl, '_blank');
          }} else {{
            errEl.textContent = data.error || 'Terjadi kendala memproses sesi chat.';
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Hubungkan ke WhatsApp →';
          }}
        }} catch (e) {{
          errEl.textContent = 'Gagal menghubungi server.';
          errEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Hubungkan ke WhatsApp →';
        }}
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


def render_articles_index(search_query: str = "") -> str:
    published_articles = load_articles(include_drafts=False)
    q = search_query.strip().lower()
    if q:
        filtered = []
        for a in published_articles:
            haystack = f"{a.get('title', '')} {a.get('excerpt', '')} {a.get('category', {}).get('name', '')} {a.get('bodyHtml', '')}".lower()
            if q in haystack:
                filtered.append(a)
        published_articles = filtered

    cards = ""
    if not published_articles:
        cards = '<div class="cms-empty-box" style="grid-column: 1 / -1; padding: 40px; text-align: center;">Tidak ada artikel atau kajian hukum yang sesuai dengan kata kunci pencarian.</div>'
    else:
        for idx, art in enumerate(published_articles):
            delay = f"{idx * 0.08:.2f}s"
            pub_label = art.get("publishedLabel") or art.get("publishedAt", "")[:10]
            cards += f"""
            <article class="featured-article-card" data-reveal="up" style="--reveal-delay:{delay}">
              <div class="featured-article-thumb">
                <img src="{art['coverUrl']}" alt="{html.escape(art['coverAlt'])}" width="600" height="340" loading="lazy">
              </div>
              <div class="featured-article-body">
                <div class="article-category-badge">{html.escape(art['category']['name'])} &middot; {html.escape(pub_label)}</div>
                <h2 class="featured-article-title"><a href="/artikel/{art['slug']}">{html.escape(art['title'])}</a></h2>
                <p class="featured-article-excerpt">{html.escape(art['excerpt'])}</p>
                <a href="/artikel/{art['slug']}" class="link-gold">Baca Kajian Lengkap &rarr;</a>
              </div>
            </article>"""

    body = f"""
    <section class="section-gap">
      <div class="container">
        <div data-reveal="up">
          <div class="eyebrow-tag">PUBLIKASI &amp; WAWASAN HUKUM</div>
          <h1>Wawasan &amp; Publikasi Hukum</h1>
          <p class="section-subtitle">Artikel edukasi hukum dan analisis regulasi terkini dari tim {OFFICIAL_FIRM_NAME}.</p>
          <form method="GET" action="/artikel" class="article-search-bar" style="margin-top:24px;display:flex;gap:10px;max-width:540px;">
            <input type="text" name="q" class="form-input" placeholder="Cari topik atau kata kunci artikel..." value="{html.escape(search_query)}">
            <button type="submit" class="btn-gold" style="white-space:nowrap;">Cari</button>
            {f'<a href="/artikel" class="btn-outline" style="white-space:nowrap;display:inline-flex;align-items:center;">Reset</a>' if search_query else ''}
          </form>
        </div>
        <div class="case-records-grid" style="margin-top:40px;">
          {cards}
        </div>
      </div>
    </section>
    """
    return render_shell(
        f"Artikel & Wawasan Hukum | {OFFICIAL_FIRM_NAME}",
        f"Kumpulan artikel hukum dan wawasan regulasi dari {OFFICIAL_FIRM_NAME}.",
        body,
    )


def render_practice_detail(slug: str) -> str | None:
    from scripts.admin_cms import get_merged_practice_areas, load_cms_state

    state = load_cms_state()
    settings = state["siteSettings"]
    practices = get_merged_practice_areas(PRACTICE_PRESENTATION_BY_SLUG, include_unpublished=False)
    area = next((a for a in practices if a.get("slug") == slug), None)
    if not area:
        return None

    wa_text = urllib.parse.quote(
        f"Halo {settings['officialFirmName']}, saya ingin berkonsultasi mengenai layanan {area['name']}."
    )
    wa_url = f"https://wa.me/{settings['whatsappNumber']}?text={wa_text}"
    scope_list_html = "".join(f"<li>{html.escape(item)}</li>" for item in area.get("advocacyScope", []))

    body = f"""
    <section class="section-gap">
      <div class="container" data-reveal="up">
        <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:20px;">
          <a href="/" class="link-gold">Beranda</a> &rsaquo;
          <a href="/#bidang-praktik" class="link-gold">Bidang Layanan</a> &rsaquo;
          <span>{html.escape(area['name'])}</span>
        </div>

        <div class="article-category-badge">{html.escape(area.get('label', 'Layanan Advokasi'))}</div>
        <h1 style="margin-top:8px;font-size:clamp(2rem, 4vw, 3rem);">{html.escape(area['name'])}</h1>
        <p class="section-subtitle" style="margin-top:12px;font-size:1.15rem;color:var(--color-text-secondary);max-width:820px;">
          {html.escape(area.get('summary', ''))}
        </p>

        <div style="margin:36px 0 44px;border-radius:4px;overflow:hidden;max-height:480px;border:1px solid var(--color-border-subtle);">
          <img src="{area.get('image', '/images/practice-corporate.webp')}" alt="{html.escape(area['name'])} - {html.escape(settings['officialFirmName'])}" style="width:100%;height:100%;object-fit:cover;">
        </div>

        <div class="cms-panel-box" style="margin-bottom:36px;">
          <h2 style="font-size:1.5rem;color:var(--color-gold-strong);margin-bottom:12px;">{html.escape(area.get('description', 'Cakupan Penanganan Hukum'))}</h2>
          <p style="font-size:14.5px;color:var(--color-text-secondary);margin-bottom:20px;">
            Firma hukum kami memberikan pendampingan litigasi dan non-litigasi yang komprehensif, strategis, dan berintegritas tinggi pada lingkup perkara berikut:
          </p>
          <ul class="practice-scope-list" style="padding-left:24px;line-height:1.9;font-size:15px;color:var(--color-text);">
            {scope_list_html}
          </ul>
        </div>

        <div class="confidential-warning-banner" style="margin-bottom:36px;">
          <strong>Bukan Nasihat Hukum Formal:</strong> Informasi pada halaman ini disajikan semata-mata sebagai gambaran umum ruang lingkup advokasi firma kami. Hubungan hukum advokat-klien (attorney-client relationship) baru terbentuk setelah verifikasi bebas benturan kepentingan dan penandatanganan Perjanjian Jasa Hukum resmi.
        </div>

        <div class="hero-actions-row">
          <a href="/#janji-temu" class="btn-gold">Jadwalkan Konsultasi Perkara Ini &rarr;</a>
          <a href="{wa_url}" target="_blank" rel="noopener noreferrer" class="btn-outline">Konsultasi via WhatsApp &nearr;</a>
          <a href="/#bidang-praktik" class="link-gold" style="display:inline-flex;align-items:center;margin-left:12px;">&larr; Lihat 10 Bidang Praktik Lainnya</a>
        </div>
      </div>
    </section>
    """
    return render_shell(
        f"{area['name']} | {settings['officialFirmName']}",
        f"Layanan advokasi dan pendampingan hukum {area['name']} dari {settings['officialFirmName']}.",
        body,
    )


def render_team_detail(slug: str) -> str | None:
    from scripts.admin_cms import get_merged_team_members, load_cms_state

    state = load_cms_state()
    settings = state["siteSettings"]
    team = get_merged_team_members(clean_ui_team_member, include_unpublished=False)
    member = next((m for m in team if m.get("slug") == slug), None)
    if not member:
        return None

    wa_text = urllib.parse.quote(
        f"Halo {settings['officialFirmName']}, saya ingin berkonsultasi dengan {member['displayName']} ({member['roleTitle']})."
    )
    wa_url = f"https://wa.me/{settings['whatsappNumber']}?text={wa_text}"

    paragraphs_html = "".join(
        f'<p class="bio-paragraph" style="margin-bottom:18px;line-height:1.8;font-size:15px;color:var(--color-text-secondary);">{html.escape(p)}</p>'
        for p in member.get("fullBio", "").split("\n\n")
        if p.strip()
    )
    tags_html = "".join(
        f'<span class="bio-tag-chip" style="display:inline-block;padding:4px 10px;background:var(--color-surface-2);border:1px solid var(--color-border-subtle);color:var(--color-gold-strong);font-size:12px;border-radius:2px;margin:0 6px 6px 0;">{html.escape(t)}</span>'
        for t in member.get("tags", [])
    )
    edu_html = "".join(f"<li>{html.escape(e)}</li>" for e in member.get("education", []))
    cred_html = "".join(f"<li>{html.escape(c)}</li>" for c in member.get("credentials", []))
    lang_html = "".join(f"<li>{html.escape(l)}</li>" for l in member.get("languages", []))
    motto_html = (
        f'<blockquote class="quote-editorial-box" style="margin:20px 0 28px;font-family:var(--font-serif);font-size:1.25rem;font-style:italic;color:var(--color-gold-strong);padding:14px 20px;border-left:3px solid var(--color-gold);background:var(--color-bg);">&ldquo;{html.escape(member["motto"])}&rdquo;</blockquote>'
        if member.get("motto")
        else ""
    )

    body = f"""
    <section class="section-gap">
      <div class="container" data-reveal="up">
        <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:24px;">
          <a href="/" class="link-gold">Beranda</a> &rsaquo;
          <a href="/#tim-advokat" class="link-gold">Tim Advokat</a> &rsaquo;
          <span>{html.escape(member['displayName'])}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:44px;align-items:start;">
          <!-- Left Column: Portrait & Key Metadata -->
          <div>
            <div style="aspect-ratio:4/5;border-radius:4px;overflow:hidden;border:2px solid var(--color-gold);box-shadow:var(--shadow-lg);background:var(--bg-photo-well);">
              <img src="{member['photo']['url']}" srcset="{member['photo']['srcSet']}" alt="{html.escape(member['photo']['alt'])}" width="{member['photo']['width']}" height="{member['photo']['height']}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div style="margin-top:20px;padding:20px;background:var(--color-surface);border:1px solid var(--color-border-subtle);">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:var(--color-gold-strong);font-weight:700;">Jabatan &amp; Peran</div>
              <div style="font-size:1.15rem;font-weight:700;color:var(--color-text);margin-top:4px;">{html.escape(member['roleTitle'])}</div>
              {motto_html}
              <div style="display:flex;flex-direction:column;gap:10px;margin-top:20px;">
                <a href="/#janji-temu" class="btn-gold full-width-btn" style="text-align:center;">Jadwalkan Konsultasi &rarr;</a>
                <a href="{wa_url}" target="_blank" rel="noopener noreferrer" class="btn-outline full-width-btn" style="text-align:center;">Hubungi via WhatsApp &nearr;</a>
              </div>
            </div>
          </div>

          <!-- Right Column: Full Biography & Credentials -->
          <div>
            <div class="eyebrow-tag">PROFIL ADVOKAT &amp; REKAN</div>
            <h1 style="font-size:clamp(2.2rem, 4vw, 3.2rem);margin-bottom:8px;">{html.escape(member['displayName'])}</h1>
            <div style="font-size:1.1rem;color:var(--color-gold-strong);font-weight:600;margin-bottom:20px;">{html.escape(member['roleTitle'])}</div>
            <div style="margin-bottom:24px;">{tags_html}</div>

            <div class="cms-panel-box" style="margin-bottom:28px;">
              <h2 style="font-size:1.35rem;margin-bottom:14px;color:var(--color-gold-strong);">Biografi Lengkap &amp; Rekam Jejak</h2>
              {paragraphs_html}
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:28px;">
              {'<div class="cms-panel-box" style="margin-bottom:0;"><h3 style="font-size:1.1rem;margin-bottom:10px;color:var(--color-gold-strong);">Pendidikan</h3><ul style="padding-left:18px;line-height:1.8;font-size:13.5px;color:var(--color-text-secondary);">' + edu_html + '</ul></div>' if edu_html else ''}
              {'<div class="cms-panel-box" style="margin-bottom:0;"><h3 style="font-size:1.1rem;margin-bottom:10px;color:var(--color-gold-strong);">Kredensial &amp; Sertifikasi</h3><ul style="padding-left:18px;line-height:1.8;font-size:13.5px;color:var(--color-text-secondary);">' + cred_html + '</ul></div>' if cred_html else ''}
              {'<div class="cms-panel-box" style="margin-bottom:0;"><h3 style="font-size:1.1rem;margin-bottom:10px;color:var(--color-gold-strong);">Bahasa</h3><ul style="padding-left:18px;line-height:1.8;font-size:13.5px;color:var(--color-text-secondary);">' + lang_html + '</ul></div>' if lang_html else ''}
            </div>

            <div>
              <a href="/#tim-advokat" class="link-gold">&larr; Kembali ke Daftar Seluruh Tim Advokat</a>
            </div>
          </div>
        </div>
      </div>
    </section>
    """
    return render_shell(
        f"{member['displayName']} | {settings['officialFirmName']}",
        f"Profil lengkap dan rekam jejak advokasi {member['displayName']}, {member['roleTitle']} pada {settings['officialFirmName']}.",
        body,
    )


def render_article_detail(slug: str, is_admin_preview: bool = False) -> str | None:
    all_articles = load_articles(include_drafts=is_admin_preview)
    art = next((a for a in all_articles if a["slug"] == slug), None)
    if not art:
        return None

    share_wa = wa_link(
        WHATSAPP_NUMBER,
        f'Halo FS dan Rekan, saya ingin berkonsultasi terkait topik artikel "{art["title"]}".',
    )
    pub_label = art.get("publishedLabel") or art.get("publishedAt", "")[:10]
    draft_banner = (
        '<div class="confidential-warning-banner" style="margin-bottom:20px;"><strong>MODE PRATINJAU ADMIN (DRAF):</strong> Artikel ini berstatus Draf dan belum dapat diakses oleh pengunjung umum (menghasilkan 404 bagi publik).</div>'
        if art.get("status") == "draft"
        else ""
    )

    body = f"""
    <article class="section-gap">
      <div class="container" data-reveal="up">
        {draft_banner}
        <div class="article-category-badge">{html.escape(art['category']['name'])}</div>
        <h1>{html.escape(art['title'])}</h1>
        <p class="trust-stat-desc" style="margin: 12px 0 28px;">Diterbitkan pada {html.escape(pub_label)} &middot; Penulis: {html.escape(art['authorName'])}</p>
        <div class="featured-article-thumb" style="margin-bottom: 32px;">
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
      <div class="container" data-reveal="up">
        <div class="eyebrow-tag">KEPATUHAN UU PDP &amp; KODE ETIK ADVOKAT</div>
        <h1>Kebijakan Privasi &amp; Disclaimer Hukum</h1>
        <p class="section-subtitle">Komitmen pelindungan data pribadi pengunjung dan batas tanggung jawab informasi umum <strong>{OFFICIAL_FIRM_NAME}</strong>.</p>
        <div class="article-prose" style="margin-top:28px;">
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


def render_admin_login(error_msg: str = "") -> str:
    css = load_combined_css()
    err_html = (
        f'<div class="server-error-box" role="alert" style="margin-bottom:18px;">{html.escape(error_msg)}</div>'
        if error_msg
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Panel Admin CMS | {OFFICIAL_FIRM_NAME}</title>
  <link rel="icon" href="/favicon.ico">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>{css}</style>
</head>
<body style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
  <div class="docket-panel-form" style="max-width:460px;width:100%;box-shadow:var(--shadow-lg);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="/logo-seal-transparent.png" alt="Logo {OFFICIAL_FIRM_NAME}" width="64" height="64" style="margin:0 auto 12px;display:block;">
      <div class="eyebrow-tag" style="justify-content:center;">PAYLOAD CMS &mdash; PANEL ADMIN</div>
      <h1 style="font-size:1.9rem;">{SHORT_BRAND_NAME}</h1>
      <p style="font-size:0.9rem;color:var(--color-text-muted);margin-top:4px;">Masuk untuk mengelola artikel, draf, profil tim, dan permohonan janji temu.</p>
    </div>

    {err_html}

    <form method="POST" action="/admin/login">
      <div class="form-group">
        <label for="adminEmail" class="form-label">Email Administrator</label>
        <input id="adminEmail" name="email" type="email" class="form-input" required value="admin@fsdanrekan.id">
      </div>
      <div class="form-group">
        <label for="adminPassword" class="form-label">Kata Sandi</label>
        <input id="adminPassword" name="password" type="password" class="form-input" required value="AdminFS2026!#">
      </div>
      <button type="submit" class="btn-gold full-width-btn">Masuk ke Panel Admin &rarr;</button>
    </form>

    <div class="confidential-warning-banner" style="margin-top:20px;margin-bottom:0;font-size:12.5px;">
      <strong>Info Pratinjau Lokal:</strong> Kredensial pratinjau lokal telah terisi otomatis (<code>admin@fsdanrekan.id</code> / <code>AdminFS2026!#</code>). Maksimal 5 percobaan gagal sebelum penguncian akun 15 menit (<code>SEC-001</code>).
    </div>

    <div style="text-align:center;margin-top:18px;">
      <a href="/" class="link-gold">&larr; Kembali ke Halaman Publik</a>
    </div>
  </div>
</body>
</html>"""


def render_admin_dashboard() -> str:
    from scripts.admin_cms import (
        get_chat_sessions,
        get_merged_instagram_gallery,
        render_enterprise_admin_dashboard,
    )

    css = load_combined_css()
    all_articles = load_articles(include_drafts=True)
    inquiries = load_inquiries()
    instagram_items = get_merged_instagram_gallery(include_unpublished=True)
    chat_sessions = get_chat_sessions()
    return render_enterprise_admin_dashboard(
        css=css,
        actor_email=ADMIN_EMAIL,
        all_articles=all_articles,
        inquiries=inquiries,
        clean_ui_fn=clean_ui_team_member,
        default_pres_by_slug=PRACTICE_PRESENTATION_BY_SLUG,
        instagram_items=instagram_items,
        chat_sessions=chat_sessions,
    )


class PreviewRequestHandler(BaseHTTPRequestHandler):
    def send_security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header(
            "Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
        )

    def is_admin_authenticated(self) -> bool:
        cookie_header = self.headers.get("Cookie", "")
        if not cookie_header:
            return False
        jar = http.cookies.SimpleCookie()
        jar.load(cookie_header)
        token_morsel = jar.get("fs_admin_session")
        if not token_morsel:
            return False
        token = token_morsel.value
        exp = ACTIVE_ADMIN_SESSIONS.get(token)
        if not exp or exp < time.time():
            ACTIVE_ADMIN_SESSIONS.pop(token, None)
            return False
        return True

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/" or path == "/index.html":
            page = render_home_page().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(page)
            return

        if path == "/admin" or path == "/admin/":
            if not self.is_admin_authenticated():
                page = render_admin_login().encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(page)))
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(page)
                return

            page = render_admin_dashboard().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(page)
            return

        if path == "/admin/logout":
            cookie_header = self.headers.get("Cookie", "")
            if cookie_header:
                jar = http.cookies.SimpleCookie()
                jar.load(cookie_header)
                if "fs_admin_session" in jar:
                    ACTIVE_ADMIN_SESSIONS.pop(jar["fs_admin_session"].value, None)
            self.send_response(302)
            self.send_header("Location", "/admin")
            self.send_header("Set-Cookie", "fs_admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax")
            self.end_headers()
            return

        if path == "/artikel":
            q = query.get("q", [""])[0]
            page = render_articles_index(search_query=q).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(page)
            return

        if path.startswith("/layanan/"):
            slug = path.removeprefix("/layanan/").strip("/")
            detail = render_practice_detail(slug)
            if detail is None:
                not_found = render_shell(
                    f"404 Bidang Layanan Tidak Ditemukan | {OFFICIAL_FIRM_NAME}",
                    "Bidang layanan hukum tidak ditemukan.",
                    '<section class="section-gap"><div class="container"><h1>404 — Layanan Tidak Ditemukan</h1><p class="section-subtitle">Bidang praktik hukum yang Anda cari tidak tersedia.</p><div class="hero-actions-row" style="margin-top:24px;"><a href="/#bidang-praktik" class="btn-gold">Lihat Semua Bidang Layanan</a></div></div></section>',
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

        if path.startswith("/tim/"):
            slug = path.removeprefix("/tim/").strip("/")
            detail = render_team_detail(slug)
            if detail is None:
                not_found = render_shell(
                    f"404 Profil Advokat Tidak Ditemukan | {OFFICIAL_FIRM_NAME}",
                    "Profil advokat tidak ditemukan.",
                    '<section class="section-gap"><div class="container"><h1>404 — Profil Tidak Ditemukan</h1><p class="section-subtitle">Profil anggota tim advokat yang Anda cari tidak tersedia.</p><div class="hero-actions-row" style="margin-top:24px;"><a href="/#tim-advokat" class="btn-gold">Lihat Seluruh Tim Advokat</a></div></div></section>',
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

        if path.startswith("/artikel/"):
            slug = path.removeprefix("/artikel/").strip("/")
            allow_preview = query.get("preview") == ["1"] and self.is_admin_authenticated()
            detail = render_article_detail(slug, is_admin_preview=allow_preview)
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
        if self.path == "/admin/login":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(min(length, 16384)).decode("utf-8", "ignore")
            form = urllib.parse.parse_qs(raw)
            email = (form.get("email", [""])[0]).strip()
            password = form.get("password", [""])[0]
            client_ip = self.client_address[0]

            now = time.time()
            recent_attempts = [t for t in LOGIN_ATTEMPTS.get(client_ip, []) if now - t < 900]
            if len(recent_attempts) >= 5:
                page = render_admin_login(
                    "Akun dikunci sementara selama 15 menit karena 5 percobaan gagal berturut-turut (SEC-001)."
                ).encode("utf-8")
                self.send_response(429)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(page)))
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(page)
                return

            pw_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
            if email.lower() == ADMIN_EMAIL and secrets.compare_digest(pw_hash, ADMIN_PASSWORD_SHA256):
                LOGIN_ATTEMPTS.pop(client_ip, None)
                session_token = secrets.token_urlsafe(32)
                ACTIVE_ADMIN_SESSIONS[session_token] = now + 7200  # 2-hour session (SEC-001)
                self.send_response(302)
                self.send_header("Location", "/admin")
                self.send_header(
                    "Set-Cookie",
                    f"fs_admin_session={session_token}; HttpOnly; Path=/; Max-Age=7200; SameSite=Lax",
                )
                self.send_security_headers()
                self.end_headers()
                return

            recent_attempts.append(now)
            LOGIN_ATTEMPTS[client_ip] = recent_attempts
            page = render_admin_login("Email atau kata sandi salah.").encode("utf-8")
            self.send_response(401)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(page)
            return

        if self.path == "/api/admin/article":
            if not self.is_admin_authenticated():
                self.send_response(401)
                self.end_headers()
                return
            from scripts.admin_cms import append_audit_log

            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(min(length, 100 * 1024)).decode("utf-8"))
            articles = load_articles(include_drafts=True)
            action = body.get("action")
            if action == "create":
                title = str(body.get("title", "")).strip()
                custom_slug = str(body.get("slug", "")).strip()
                slug = (
                    "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in (custom_slug or title)).split())
                    or f"artikel-{int(time.time())}"
                )
                raw_body = str(body.get("bodyText", "")).strip()
                if "<p>" in raw_body or "<h2>" in raw_body:
                    body_html = raw_body
                else:
                    body_html = "".join(
                        f"<p>{html.escape(p.strip())}</p>" for p in raw_body.split("\n") if p.strip()
                    )
                new_id = f"article-{int(time.time())}"
                articles.insert(
                    0,
                    {
                        "id": new_id,
                        "slug": slug,
                        "title": title,
                        "excerpt": str(body.get("excerpt", "")).strip(),
                        "category": {
                            "slug": "kajian-hukum",
                            "name": str(body.get("categoryName", "Hukum Korporasi & Bisnis")),
                        },
                        "authorName": str(body.get("authorName", "Tim Redaksi FS dan Rekan")).strip() or "Tim Redaksi FS dan Rekan",
                        "status": "draft" if body.get("status") == "draft" else "published",
                        "publishedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "publishedLabel": datetime.date.today().strftime("%d %B %Y"),
                        "coverUrl": str(body.get("coverUrl", "/images/practice-corporate.webp")),
                        "coverAlt": f"Ilustrasi {title}",
                        "seoTitle": str(body.get("seoTitle", "")).strip(),
                        "seoDescription": str(body.get("seoDescription", "")).strip(),
                        "bodyHtml": body_html,
                    },
                )
                save_articles(articles)
                append_audit_log(ADMIN_EMAIL, "CREATE_ARTICLE", "articles", new_id, f"Membuat artikel: {title}")
            elif action == "update":
                aid = str(body.get("id", ""))
                for a in articles:
                    if a.get("id") == aid:
                        a["title"] = str(body.get("title", a["title"])).strip()
                        if body.get("slug"):
                            a["slug"] = "-".join(
                                "".join(ch.lower() if ch.isalnum() else " " for ch in str(body["slug"])).split()
                            )
                        a["excerpt"] = str(body.get("excerpt", a.get("excerpt", ""))).strip()
                        a["category"] = {
                            "slug": "kajian-hukum",
                            "name": str(body.get("categoryName", a.get("category", {}).get("name", "Umum"))),
                        }
                        a["authorName"] = str(body.get("authorName", a.get("authorName", "Tim Redaksi FS dan Rekan"))).strip()
                        a["status"] = "draft" if body.get("status") == "draft" else "published"
                        a["coverUrl"] = str(body.get("coverUrl", a.get("coverUrl", "/images/practice-corporate.webp")))
                        a["seoTitle"] = str(body.get("seoTitle", a.get("seoTitle", ""))).strip()
                        a["seoDescription"] = str(body.get("seoDescription", a.get("seoDescription", ""))).strip()
                        raw_body = str(body.get("bodyText", "")).strip()
                        if "<p>" in raw_body or "<h2>" in raw_body:
                            a["bodyHtml"] = raw_body
                        else:
                            a["bodyHtml"] = "".join(
                                f"<p>{html.escape(p.strip())}</p>" for p in raw_body.split("\n") if p.strip()
                            )
                save_articles(articles)
                append_audit_log(ADMIN_EMAIL, "UPDATE_ARTICLE", "articles", aid, "Memperbarui konten & SEO artikel")
            elif action == "toggle":
                aid = str(body.get("id", ""))
                for a in articles:
                    if a.get("id") == aid:
                        a["status"] = "draft" if body.get("status") == "draft" else "published"
                save_articles(articles)
                append_audit_log(ADMIN_EMAIL, "TOGGLE_ARTICLE_STATUS", "articles", aid, f"Mengubah status publikasi ke {body.get('status')}")
            elif action == "delete":
                aid = str(body.get("id", ""))
                articles = [a for a in articles if a.get("id") != aid]
                save_articles(articles)
                append_audit_log(ADMIN_EMAIL, "DELETE_ARTICLE", "articles", aid, "Menghapus artikel")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        if self.path == "/api/admin/inquiry-status":
            if not self.is_admin_authenticated():
                self.send_response(401)
                self.end_headers()
                return
            from scripts.admin_cms import append_audit_log

            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(min(length, 32768)).decode("utf-8"))
            inquiries = load_inquiries()
            action = body.get("action", "update")
            iid = str(body.get("id", ""))
            if action == "delete":
                inquiries = [i for i in inquiries if i.get("id") != iid]
                save_inquiries(inquiries)
                append_audit_log(ADMIN_EMAIL, "DELETE_INQUIRY_PDP", "inquiries", iid, "Menghapus data permohonan sesuai hak subjek data UU PDP")
            else:
                for inq in inquiries:
                    if inq.get("id") == iid:
                        if body.get("status"):
                            inq["status"] = str(body.get("status"))
                        if "internalNotes" in body and body["internalNotes"] is not None:
                            inq["internalNotes"] = str(body["internalNotes"]).strip()
                save_inquiries(inquiries)
                append_audit_log(ADMIN_EMAIL, "UPDATE_INQUIRY", "inquiries", iid, "Memperbarui status / catatan internal permohonan janji temu")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        if self.path in (
            "/api/admin/settings",
            "/api/admin/category",
            "/api/admin/team",
            "/api/admin/practice",
            "/api/admin/cases",
            "/api/admin/media",
            "/api/admin/users",
            "/api/admin/instagram",
            "/api/admin/chat-sessions",
        ):
            if not self.is_admin_authenticated():
                self.send_response(401)
                self.end_headers()
                return
            from scripts.admin_cms import handle_admin_api

            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(min(length, 8 * 1024 * 1024)).decode("utf-8"))
            status_code, resp_dict = handle_admin_api(
                self.path,
                body,
                ADMIN_EMAIL,
                clean_ui_team_member,
                PRACTICE_PRESENTATION_BY_SLUG,
            )
            encoded = json.dumps(resp_dict, ensure_ascii=False).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(encoded)
            return

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

            if (
                not isinstance(body, dict)
                or not body.get("consent")
                or len(str(body.get("name", "")).strip()) < 2
            ):
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Data tidak valid."}')
                return

            inquiries = load_inquiries()
            inquiries.append(
                {
                    "id": f"inq-{int(time.time() * 1000)}",
                    "name": str(body.get("name", "")).strip(),
                    "email": str(body.get("email", "")).strip(),
                    "phone": str(body.get("phone", "")).strip(),
                    "practiceAreaId": str(body.get("practiceAreaId", "")).strip(),
                    "preferredDate": str(body.get("preferredDate", "")).strip(),
                    "sessionSlot": str(body.get("sessionSlot", "pagi")).strip(),
                    "method": str(body.get("method", "tatap-muka")).strip(),
                    "summary": str(body.get("summary", "")).strip(),
                    "consentAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "status": "baru",
                }
            )
            save_inquiries(inquiries)

            resp = b'{"ok":true}'
            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(resp)
            return

        if self.path == "/api/chat":
            ctype = self.headers.get("Content-Type", "")
            if "application/json" not in ctype:
                self.send_response(415)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Format permintaan tidak didukung."}')
                return

            client_ip = self.client_address[0]
            now = time.time()
            recent_chats = [t for t in CHAT_ATTEMPTS.get(client_ip, []) if now - t < 600]
            if len(recent_chats) >= 10:
                self.send_response(429)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Batas pengiriman pesan tercapai. Silakan coba lagi beberapa saat lagi."}')
                return

            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = -1

            if length <= 0 or length > 64 * 1024:
                self.send_response(413 if length > 64 * 1024 else 400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Ukuran data tidak valid."}')
                return

            raw = self.rfile.read(length).decode("utf-8", "ignore")
            try:
                body = json.loads(raw)
            except Exception:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Format data tidak valid."}')
                return

            visitor_name = str(body.get("visitorName", "")).strip()
            visitor_phone = str(body.get("visitorPhone", "")).strip()
            practice_area = str(body.get("practiceArea", "")).strip()
            preferred_schedule = str(body.get("preferredSchedule", "")).strip()
            notes = str(body.get("notes", "")).strip()
            consent = bool(body.get("consent", False))

            if not consent or len(visitor_name) < 2:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Nama dan persetujuan pemrosesan data (UU PDP) wajib diisi."}')
                return

            digits = "".join(ch for ch in visitor_phone if ch.isdigit())
            if len(digits) < 9:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error":"Nomor WhatsApp tidak valid."}')
                return

            recent_chats.append(now)
            CHAT_ATTEMPTS[client_ip] = recent_chats

            from scripts.admin_cms import load_cms_state, save_cms_state, append_audit_log

            state = load_cms_state()
            sessions = state.setdefault("chatSessions", [])
            session_id = f"chat-{secrets.token_hex(6)}"
            cookie_sid = secrets.token_hex(16)  # 128-bit random session token (SEC-008)
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

            new_session = {
                "id": session_id,
                "visitorName": visitor_name,
                "visitorPhone": visitor_phone,
                "practiceArea": practice_area,
                "preferredSchedule": preferred_schedule,
                "notes": notes,
                "consentAt": now_iso,
                "status": "baru",
                "createdAt": now_iso,
            }
            sessions.append(new_session)
            state["chatSessions"] = sessions
            save_cms_state(state)
            append_audit_log("visitor", "CREATE_CHAT_SESSION", "chatSessions", session_id, f"Sesi konsultasi baru ({practice_area})")

            # Generate pre-filled WhatsApp link for user click
            wa_num = state.get("siteSettings", {}).get("whatsappNumber", WHATSAPP_NUMBER)
            msg_text = (
                f"Halo {SHORT_BRAND_NAME},\n"
                f"Saya ingin berkonsultasi mengenai:\n"
                f"- Nama: {visitor_name}\n"
                f"- Bidang Layanan: {practice_area}\n"
                f"- Preferensi Jadwal: {preferred_schedule}\n"
                f"- Catatan Kebutuhan: {notes or '-'}\n"
                f"(Sesi ID: {session_id})"
            )
            wa_url = f"https://wa.me/{wa_num}?text={urllib.parse.quote(msg_text)}"

            resp_data = json.dumps({"ok": True, "sessionId": session_id, "waUrl": wa_url}).encode("utf-8")
            self.send_response(201)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp_data)))
            self.send_header(
                "Set-Cookie",
                f"fs_chat_sid={cookie_sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400",
            )
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(resp_data)
            return

        self.send_response(404)
        self.end_headers()


def main() -> None:
    mimetypes.add_type("image/webp", ".webp")
    server = HTTPServer(("127.0.0.1", 3000), PreviewRequestHandler)
    print("Preview server running at http://localhost:3000 (Admin CMS: http://localhost:3000/admin)")
    server.serve_forever()


if __name__ == "__main__":
    main()
