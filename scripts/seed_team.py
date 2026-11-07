#!/usr/bin/env python3
"""
SK-01 Idempotent seed script for team profiles, practice areas, and team photo processing.
Strictly extracts shortBio and fullBio verbatim from CONTENT_PROFILES.md and maps photos
solely by filename from /images to public/team/<slug>.webp (4:5 aspect ratio, EXIF stripped).
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageOps

ROOT_DIR = Path(__file__).resolve().parent.parent
CONTENT_PROFILES_MD = ROOT_DIR / "CONTENT_PROFILES.md"
IMAGES_DIR = ROOT_DIR / "Images" if (ROOT_DIR / "Images").exists() else ROOT_DIR / "images"
PUBLIC_TEAM_DIR = ROOT_DIR / "public" / "team"
CONTENT_DIR = ROOT_DIR / "content"
TEAM_JSON_PATH = CONTENT_DIR / "team.json"
PRACTICE_AREAS_JSON_PATH = CONTENT_DIR / "practice_areas.json"
CASE_RECORDS_JSON_PATH = CONTENT_DIR / "case_records.json"

# Filename-only mapping from /images to team member slug (Rule 2: by filename only, no face recognition)
FILENAME_TO_SLUG: dict[str, str] = {
    "Ferdinan.png": "ferdinan-hasiholan-silalahi",
    "Basit.png": "basit-rezki",
    "Haddy.png": "haddy-siswanto",
    "Benny.png": "benny",
    "Delia.png": "delia-zaizafun",
    "Farhah.png": "farhah-tri-febriani",
    "Kahlil.png": "kahlil-mawardi-savana",
}

RESPONSIVE_SIZES: dict[str, tuple[int, int]] = {
    "sm": (400, 500),
    "md": (600, 750),
    "lg": (800, 1000),
}


def extract_bios_from_markdown(md_text: str, slug: str) -> tuple[str, str]:
    """Extract shortBio and fullBio verbatim from CONTENT_PROFILES.md for a given slug."""
    pattern = rf"- \*\*slug:\*\* `{re.escape(slug)}`(.*?)(?=\n---\n|\n## 4\.)"
    match = re.search(pattern, md_text, flags=re.DOTALL)
    if not match:
        raise ValueError(f"Could not find profile section for slug: {slug}")

    block = match.group(1)

    short_match = re.search(
        r"\*\*shortBio \(≤ 200 karakter\):\*\*\n> ([^\n]+)", block
    )
    if not short_match:
        raise ValueError(f"Could not find shortBio for slug: {slug}")
    short_bio = short_match.group(1)

    full_match = re.search(r"\*\*fullBio:\*\*\n\n(.*)", block, flags=re.DOTALL)
    if not full_match:
        raise ValueError(f"Could not find fullBio for slug: {slug}")

    raw_full = full_match.group(1).strip()
    # Exclude markdown editorial callout blockquotes (e.g. "> **Catatan sensitivitas:** ...")
    paragraphs = [
        p.strip()
        for p in raw_full.split("\n\n")
        if p.strip() and not p.strip().startswith(">")
    ]
    full_bio = "\n\n".join(paragraphs)
    return short_bio, full_bio


def process_team_photo(src_path: Path, slug: str) -> dict[str, object]:
    """
    Process team photo to public/team/<slug>.webp and responsive variants:
    - Strip all EXIF / location / metadata
    - Uniform 4:5 aspect ratio
    - Do not modify original file
    """
    if not src_path.exists():
        raise FileNotFoundError(f"Source image missing: {src_path}")

    PUBLIC_TEAM_DIR.mkdir(parents=True, exist_ok=True)

    with Image.open(src_path) as src_img:
        rgb_img = src_img.convert("RGB")

        variant_urls: dict[str, str] = {}
        for label, (target_w, target_h) in RESPONSIVE_SIZES.items():
            # Crop to 4:5 aspect ratio with upper-center framing (0.5, 0.2) for portraits
            fitted = ImageOps.fit(
                rgb_img,
                (target_w, target_h),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.2),
            )
            # Create a brand-new Image buffer to guarantee zero EXIF/GPS/metadata carryover
            clean_img = Image.frombytes("RGB", (target_w, target_h), fitted.tobytes())

            variant_filename = f"{slug}-{target_w}w.webp"
            variant_path = PUBLIC_TEAM_DIR / variant_filename
            clean_img.save(variant_path, format="WEBP", quality=85, method=6)
            variant_urls[label] = f"/team/{variant_filename}"

            if label == "lg":
                main_path = PUBLIC_TEAM_DIR / f"{slug}.webp"
                clean_img.save(main_path, format="WEBP", quality=85, method=6)

    main_file = PUBLIC_TEAM_DIR / f"{slug}.webp"
    return {
        "filename": f"{slug}.webp",
        "sourceFilename": src_path.name,
        "mimeType": "image/webp",
        "size": main_file.stat().st_size,
        "width": RESPONSIVE_SIZES["lg"][0],
        "height": RESPONSIVE_SIZES["lg"][1],
        "aspectRatio": "4:5",
        "url": f"/team/{slug}.webp",
        "sizes": variant_urls,
        "srcSet": (
            f"/team/{slug}-400w.webp 400w, "
            f"/team/{slug}-600w.webp 600w, "
            f"/team/{slug}-800w.webp 800w"
        ),
    }


def build_team_seed() -> list[dict[str, object]]:
    md_text = CONTENT_PROFILES_MD.read_text(encoding="utf-8")

    # Verify all expected filenames in /images exist and no unknown team photos exist
    slug_to_filename = {slug: fname for fname, slug in FILENAME_TO_SLUG.items()}

    profiles_meta: list[dict[str, object]] = [
        {
            "id": "team-1",
            "slug": "ferdinan-hasiholan-silalahi",
            "fullName": "Ferdinan Hasiholan Silalahi",
            "honorific": "S.H.",
            "displayName": "Ferdinan Hasiholan Silalahi, S.H.",
            "roleTitle": "Pendiri dan Managing Partner",
            "group": "Pendiri dan Managing Partner",
            "motto": "Life has to be meaningful",
            "education": ["S.H., Fakultas Hukum Universitas Tanjungpura"],
            "credentials": [],
            "languages": [],
            "tags": [],
            "displayOrder": 1,
            "isPublished": True,
        },
        {
            "id": "team-2",
            "slug": "basit-rezki",
            "fullName": "Basit Rezki",
            "honorific": "S.H.",
            "displayName": "Basit Rezki, S.H.",
            "roleTitle": "Associate",
            "group": "Associate",
            "motto": None,
            "education": [
                "S.H., Fakultas Hukum Universitas Dirgantara Marsekal Suryadarma"
            ],
            "credentials": [
                "Advokat berlisensi, terakreditasi Perhimpunan Advokat Indonesia (PERADI)"
            ],
            "languages": ["Indonesia", "Inggris", "Jepang (JFT A2)"],
            "tags": [
                "Riset Hukum",
                "Penyusunan Dokumen Hukum",
                "Pidana",
                "Kontrak",
            ],
            "displayOrder": 2,
            "isPublished": True,
        },
        {
            "id": "team-3",
            "slug": "haddy-siswanto",
            "fullName": "Haddy Siswanto",
            "honorific": "S.H., CLCP",
            "displayName": "Haddy Siswanto, S.H., CLCP",
            "roleTitle": "Associate",
            "group": "Associate",
            "motto": None,
            "education": [
                "S.H., Fakultas Hukum Universitas Airlangga (Konsentrasi Hukum Peradilan)"
            ],
            "credentials": [
                "Advokat",
                "Certified Legal Compliance Professional (CLCP)",
            ],
            "languages": [],
            "tags": [
                "Hukum Perdata",
                "Pertanahan",
                "Perjanjian",
                "Hak Kekayaan Intelektual",
                "Legal Compliance",
            ],
            "displayOrder": 3,
            "isPublished": True,
        },
        {
            "id": "team-4",
            "slug": "benny",
            "fullName": "Benny",
            "honorific": "S.H., M.H.",
            "displayName": "Benny, S.H., M.H.",
            "roleTitle": "Associate",
            "group": "Associate",
            "motto": None,
            "education": [
                "Sarjana Hukum, Universitas Kristen Indonesia",
                "Magister Hukum Bisnis, Universitas Pelita Harapan",
            ],
            "credentials": [],
            "languages": [],
            "tags": [
                "Hukum Litigasi",
                "Manajemen Litigasi",
                "Penyelesaian Sengketa",
                "Hukum Bisnis",
            ],
            "displayOrder": 4,
            "isPublished": True,
        },
        {
            "id": "team-5",
            "slug": "delia-zaizafun",
            "fullName": "Delia Zaizafun",
            "honorific": "S.H., M.H.",
            "displayName": "Delia Zaizafun, S.H., M.H.",
            "roleTitle": "Legal Administrator",
            "group": "Legal Administrator",
            "motto": None,
            "education": [
                "Magister Hukum, Universitas Gadjah Mada (Cumlaude); penerima Beasiswa LPDP RI"
            ],
            "credentials": [],
            "languages": [],
            "tags": [
                "Litigasi Pajak dan Kepabeanan",
                "Hukum Pidana",
                "Administrasi Perkara",
                "Legal Opinion",
            ],
            "displayOrder": 5,
            "isPublished": True,
        },
        {
            "id": "team-6",
            "slug": "farhah-tri-febriani",
            "fullName": "Farhah Tri Febriani",
            "honorific": "S.H.",
            "displayName": "Farhah Tri Febriani, S.H.",
            "roleTitle": "Legal Administrator",
            "group": "Legal Administrator",
            "motto": None,
            "education": [
                "S.H., Universitas Islam Negeri Syarif Hidayatullah Jakarta"
            ],
            "credentials": [],
            "languages": [],
            "tags": [
                "Legal Drafting",
                "Legal Research",
                "Administrasi Hukum",
                "Legal Opinion",
            ],
            "displayOrder": 6,
            "isPublished": True,
        },
        {
            "id": "team-7",
            "slug": "kahlil-mawardi-savana",
            "fullName": "Kahlil Mawardi Savana",
            "honorific": "S.H.",
            "displayName": "Kahlil Mawardi Savana, S.H.",
            "roleTitle": "Legal Administrator",
            "group": "Legal Administrator",
            "motto": None,
            "education": [
                "S.H., Fakultas Hukum Universitas Jenderal Soedirman (Konsentrasi Hukum Internasional)"
            ],
            "credentials": [],
            "languages": ["Indonesia", "Inggris"],
            "tags": [
                "Hukum Korporasi",
                "Ketenagakerjaan",
                "Hubungan Industrial",
                "Administrasi Hukum",
            ],
            "displayOrder": 7,
            "isPublished": True,
        },
    ]

    result: list[dict[str, object]] = []
    for meta in profiles_meta:
        slug = str(meta["slug"])
        short_bio, full_bio = extract_bios_from_markdown(md_text, slug)
        src_filename = slug_to_filename[slug]
        photo_info = process_team_photo(IMAGES_DIR / src_filename, slug)

        # Build alt = "Foto <nama lengkap dan gelar>"
        honorific = str(meta["honorific"])
        if honorific.startswith("TODO(client)"):
            name_and_title = f"{meta['fullName']} ({honorific})"
        else:
            name_and_title = f"{meta['fullName']}, {honorific}"
        alt_text = f"Foto {name_and_title}"

        photo_obj = {
            "id": f"media-{slug}",
            **photo_info,
            "alt": alt_text,
        }

        entry: dict[str, object] = {
            "id": meta["id"],
            "slug": slug,
            "fullName": meta["fullName"],
            "honorific": meta["honorific"],
            "displayName": meta["displayName"],
            "roleTitle": meta["roleTitle"],
            "group": meta["group"],
            "motto": meta["motto"],
            "shortBio": short_bio,
            "fullBio": full_bio,
            "education": meta["education"],
            "credentials": meta["credentials"],
            "languages": meta["languages"],
            "tags": meta["tags"],
            "photo": photo_obj,
            "displayOrder": meta["displayOrder"],
            "isPublished": meta["isPublished"],
        }
        result.append(entry)

    return result


def serialize_public_case_record(record: dict[str, object]) -> dict[str, object]:
    """
    SK-14 public serializer for CaseRecord.
    Guarantees clientName is never exposed in public output unless displayMode == 'named'
    AND a non-empty written consentRef is present. Never outputs year, win/loss status, or case value.
    """
    display_mode = record.get("displayMode", "anonymous")
    consent_ref = record.get("consentRef")
    allow_named = (
        display_mode == "named"
        and isinstance(consent_ref, str)
        and len(consent_ref.strip()) > 0
    )

    photos = record.get("photos")
    if not photos or not isinstance(photos, list):
        photos = [
            {
                "url": record.get("imageUrl") or "/images/hero-slide-courtroom.webp",
                "caption": f"Dokumentasi penanganan perkara {record.get('caseType', '')} di {record.get('region', '')}",
                "alt": record.get("imageAlt") or f"Dokumentasi perkara {record.get('caseType', '')}",
            }
        ]

    public_record: dict[str, object] = {
        "id": record["id"],
        "caseType": record["caseType"],
        "region": record["region"],
        "displayMode": "named" if allow_named else "anonymous",
        "displayOrder": record["displayOrder"],
        "imageUrl": record.get("imageUrl") or photos[0]["url"],
        "imageAlt": record.get("imageAlt") or photos[0].get("alt") or f"Dokumentasi {record['caseType']}",
        "photos": photos,
    }
    if allow_named and record.get("clientName"):
        public_record["clientName"] = record["clientName"]
    return public_record


def build_case_records_seed() -> list[dict[str, object]]:
    """
    SK-14 seed for 7 case records from CONTENT_PROFILES.md Section 4.2.
    Default mode is 'anonymous' with clientName=None and consentRef=None so real client names
    are never exposed in public seed files.
    Each case includes multi-photo documentation gallery for rich modal view.
    """
    cases = [
        (
            "Perselisihan Hubungan Industrial",
            "Jakarta",
            "/images/cases/perselisihan-hubungan-industrial/perselisihan-hubungan-industrial-1.webp",
            "Dokumentasi persidangan sengketa hubungan industrial di Jakarta",
            [
                {
                    "url": "/images/cases/perselisihan-hubungan-industrial/perselisihan-hubungan-industrial-1.webp",
                    "caption": "Pemeriksaan berkas dan penelaahan materi perkara perselisihan hubungan industrial",
                    "alt": "Pemeriksaan berkas perkara perselisihan hubungan industrial di Jakarta",
                },
                {
                    "url": "/images/cases/perselisihan-hubungan-industrial/perselisihan-hubungan-industrial-2.webp",
                    "caption": "Proses mediasi dan perundingan penyelesaian perselisihan hubungan industrial",
                    "alt": "Mediasi perundingan sengketa hubungan industrial",
                },
                {
                    "url": "/images/cases/perselisihan-hubungan-industrial/perselisihan-hubungan-industrial-3.webp",
                    "caption": "Persiapan dokumen administrasi dan pembuktian perkara ketenagakerjaan",
                    "alt": "Penyiapan dokumen pembuktian hubungan kerja",
                },
                {
                    "url": "/images/cases/perselisihan-hubungan-industrial/perselisihan-hubungan-industrial-4.webp",
                    "caption": "Pendampingan advokasi pada tahapan persidangan Pengadilan Hubungan Industrial (PHI)",
                    "alt": "Pendampingan sidang perkara perselisihan hubungan industrial",
                },
                {
                    "url": "/images/cases/perselisihan-hubungan-industrial/perselisihan-hubungan-industrial-5.webp",
                    "caption": "Pemeriksaan dan koordinasi dokumen pembelaan hak-hak ketenagakerjaan para pihak",
                    "alt": "Koordinasi dokumen pembelaan hak ketenagakerjaan",
                },
                {
                    "url": "/images/cases/perselisihan-hubungan-industrial/perselisihan-hubungan-industrial-6.webp",
                    "caption": "Tahapan tindak lanjut dan penutupan risalah perkara hubungan industrial",
                    "alt": "Penutupan risalah penanganan perkara hubungan industrial",
                },
            ],
        ),
        (
            "Tindak Pidana Korupsi",
            "Semarang, Jawa Tengah",
            "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-1.webp",
            "Dokumentasi pendampingan hukum perkara tindak pidana korupsi",
            [
                {
                    "url": "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-1.webp",
                    "caption": "Pendampingan hukum oleh tim advokat pada tahapan proses hukum perkara tindak pidana korupsi di kejaksaan",
                    "alt": "Dokumentasi pendampingan hukum perkara tindak pidana korupsi",
                },
                {
                    "url": "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-2.webp",
                    "caption": "Pengurusan administrasi perkara dan penyerahan berkas hukum melalui Pelayanan Terpadu Satu Pintu (PTSP) Kejaksaan",
                    "alt": "Koordinasi administrasi perkara pada Pelayanan Terpadu Satu Pintu Kejaksaan",
                },
                {
                    "url": "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-3.webp",
                    "caption": "Registrasi kunjungan dan koordinasi pemeriksaan pada lingkungan instansi kejaksaan",
                    "alt": "Registrasi dan koordinasi pendampingan hukum di kejaksaan",
                },
            ],
        ),
        (
            "Tindak Pidana Korupsi",
            "Semarang, Jawa Tengah",
            "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-1.webp",
            "Dokumentasi pendampingan hukum perkara tindak pidana korupsi",
            [
                {
                    "url": "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-1.webp",
                    "caption": "Pendampingan hukum oleh tim advokat pada tahapan proses hukum perkara tindak pidana korupsi di kejaksaan",
                    "alt": "Dokumentasi pendampingan hukum perkara tindak pidana korupsi",
                },
                {
                    "url": "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-2.webp",
                    "caption": "Pengurusan administrasi perkara dan penyerahan berkas hukum melalui Pelayanan Terpadu Satu Pintu (PTSP) Kejaksaan",
                    "alt": "Koordinasi administrasi perkara pada Pelayanan Terpadu Satu Pintu Kejaksaan",
                },
                {
                    "url": "/images/cases/tindak-pidana-korupsi/tindak-pidana-korupsi-3.webp",
                    "caption": "Registrasi kunjungan dan koordinasi pemeriksaan pada lingkungan instansi kejaksaan",
                    "alt": "Registrasi dan koordinasi pendampingan hukum di kejaksaan",
                },
            ],
        ),
        (
            "Tindak pidana penggelapan terkait hubungan kerja",
            "Surabaya, Jawa Timur",
            "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-1.webp",
            "Dokumentasi penanganan perkara pidana penggelapan terkait hubungan kerja di Surabaya",
            [
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-1.webp",
                    "caption": "Pemeriksaan berkas bukti dan audit dokumen awal terkait tindak pidana penggelapan",
                    "alt": "Pemeriksaan bukti perkara pidana penggelapan dalam jabatan",
                },
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-2.webp",
                    "caption": "Pendampingan hukum dalam proses klarifikasi dan pemeriksaan di tingkat penyidikan",
                    "alt": "Pendampingan pemeriksaan klarifikasi di kepolisian",
                },
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-3.webp",
                    "caption": "Penyusunan telaah yuridis dan analisis unsur-unsur pasal penggelapan dalam hubungan kerja",
                    "alt": "Penyusunan telaah yuridis perkara pidana penggelapan",
                },
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-4.webp",
                    "caption": "Koordinasi berkas administrasi perkara pidana di wilayah Jawa Timur",
                    "alt": "Koordinasi berkas administrasi perkara pidana Surabaya",
                },
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-5.webp",
                    "caption": "Pendampingan pada tahapan pemeriksaan saksi dan verifikasi fakta hukum",
                    "alt": "Verifikasi fakta dan bukti saksi perkara pidana",
                },
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-6.webp",
                    "caption": "Proses penyerahan berkas dan koordinasi penegakan hukum",
                    "alt": "Penyerahan berkas perkara pidana",
                },
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-7.webp",
                    "caption": "Pendampingan advokasi persidangan perkara pidana khusus di pengadilan",
                    "alt": "Pendampingan sidang advokasi perkara pidana",
                },
                {
                    "url": "/images/cases/tindak-pidana-penggelapan/tindak-pidana-penggelapan-8.webp",
                    "caption": "Penyusunan risalah dan pengawalan proses hukum hingga penetapan akhir",
                    "alt": "Pengawalan putusan dan penetapan akhir perkara pidana",
                },
            ],
        ),
        (
            "Kecelakaan lalu lintas",
            "Bandung, Jawa Barat",
            "/images/cases/kecelakaan-lalu-lintas/kecelakaan-lalu-lintas-1.webp",
            "Dokumentasi penanganan perkara kecelakaan lalu lintas di Bandung",
            [
                {
                    "url": "/images/cases/kecelakaan-lalu-lintas/kecelakaan-lalu-lintas-1.webp",
                    "caption": "Pemeriksaan berkas kronologi kejadian dan verifikasi dampak kecelakaan lalu lintas",
                    "alt": "Pemeriksaan kronologi perkara kecelakaan lalu lintas di Bandung",
                },
                {
                    "url": "/images/cases/kecelakaan-lalu-lintas/kecelakaan-lalu-lintas-2.webp",
                    "caption": "Pendampingan proses mediasi ganti rugi dan penyelesaian hukum para pihak",
                    "alt": "Mediasi penyelesaian ganti rugi perkara kecelakaan lalu lintas",
                },
            ],
        ),
        (
            "Sengketa hak atas tanah",
            "Gunung Putri, Bogor, Jawa Barat",
            "/images/cases/sengketa-hak-atas-tanah/sengketa-hak-atas-tanah-1.webp",
            "Dokumentasi penanganan sengketa hak atas tanah di Gunung Putri, Bogor",
            [
                {
                    "url": "/images/cases/sengketa-hak-atas-tanah/sengketa-hak-atas-tanah-1.webp",
                    "caption": "Koordinasi dan verifikasi administrasi pertanahan bersama aparat Pemerintah Desa Gunung Putri, Kabupaten Bogor",
                    "alt": "Koordinasi verifikasi pertanahan di kantor Pemerintah Desa Gunung Putri, Bogor",
                },
                {
                    "url": "/images/cases/sengketa-hak-atas-tanah/sengketa-hak-atas-tanah-2.webp",
                    "caption": "Peninjauan fisik lokasi objek tanah dan pemeriksaan batas sempadan lahan di lapangan",
                    "alt": "Peninjauan fisik lokasi objek sengketa tanah di Gunung Putri",
                },
                {
                    "url": "/images/cases/sengketa-hak-atas-tanah/sengketa-hak-atas-tanah-3.webp",
                    "caption": "Pemeriksaan kondisi penguasaan fisik dan verifikasi fakta lapangan di sekitar area objek sengketa",
                    "alt": "Pemeriksaan kondisi lapangan objek tanah sengketa",
                },
                {
                    "url": "/images/cases/sengketa-hak-atas-tanah/sengketa-hak-atas-tanah-4.webp",
                    "caption": "Pertemuan konsultasi, klarifikasi riwayat kepemilikan, dan penelaahan dokumen alas hak atas tanah",
                    "alt": "Diskusi dan klarifikasi dokumen kepemilikan hak atas tanah",
                },
            ],
        ),
        (
            "Tindak Pidana Asuransi",
            "Jakarta",
            "/images/hero-slide-courtroom.webp",
            "Dokumentasi penanganan perkara tindak pidana asuransi di Jakarta",
            [
                {
                    "url": "/images/hero-slide-courtroom.webp",
                    "caption": "Pendampingan proses pemeriksaan dan pembuktian perkara tindak pidana asuransi di persidangan",
                    "alt": "Persidangan pembuktian perkara tindak pidana asuransi di Jakarta",
                },
                {
                    "url": "/images/lady-justice.webp",
                    "caption": "Telaah yuridis polis, klaim pertanggungan, dan ketentuan regulasi tindak pidana di sektor perasuransian",
                    "alt": "Analisis yuridis dokumen perkara tindak pidana asuransi",
                },
                {
                    "url": "/images/gavel-banner.webp",
                    "caption": "Pendampingan advokasi hukum dan pengawalan hak hukum para pihak dalam sengketa pidana asuransi",
                    "alt": "Palu sidang penanganan perkara tindak pidana asuransi",
                },
            ],
        ),
    ]
    records: list[dict[str, object]] = []
    for idx, (case_type, region, image_url, image_alt, photos) in enumerate(cases, start=1):
        records.append(
            {
                "id": f"case-record-{idx}",
                "caseType": case_type,
                "region": region,
                "imageUrl": image_url,
                "imageAlt": image_alt,
                "photos": photos,
                "displayMode": "anonymous",
                "clientName": None,
                "consentRef": None,
                "scope": "v2",
                "displayOrder": idx,
                "isPublished": True,
            }
        )
    return records


def main() -> None:
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    team_data = build_team_seed()
    TEAM_JSON_PATH.write_text(
        json.dumps(team_data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    case_records_data = build_case_records_seed()
    CASE_RECORDS_JSON_PATH.write_text(
        json.dumps(case_records_data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Seeded {len(team_data)} profiles to {TEAM_JSON_PATH}")
    print(f"Seeded {len(case_records_data)} case records to {CASE_RECORDS_JSON_PATH}")


if __name__ == "__main__":
    main()
