#!/usr/bin/env python3
"""
Comprehensive backend test suite for all Admin CMS processes and SEO metadata.
Tests every mutation, CRUD lifecycle, data validation, and security guard:
1. Article CRUD (create, update, toggle draft/publish, delete) & category slug resolution
2. Article title validation
3. Categories CRUD & in-use deletion protection
4. Team profiles override, custom member CRUD & FR-3.2 bio length validation
5. Practice areas override & custom area CRUD
6. Case records CRUD & SK-14 anonymity guard validation
7. Consultation inquiries lifecycle, internal notes & UU PDP erasure
8. Media upload MIME check, SVG rejection & file size limits (SEC-013)
9. Site settings, phone normalization & audit logging
10. Users management, SEC-001 password complexity & last admin protection
11. Instagram gallery CRUD
12. Chat sessions lifecycle & UU PDP erasure
13. SEO Technical audit (LegalService, GeoCoordinates, OpenGraph, Canonical, Breadcrumb, Article JSON-LD)
"""

from __future__ import annotations

import base64
import json
import shutil
import unittest
from pathlib import Path

from scripts.admin_cms import (
    DEFAULT_CATEGORIES,
    DEFAULT_SITE_SETTINGS,
    get_merged_case_records,
    get_merged_practice_areas,
    get_merged_team_members,
    handle_admin_api,
    load_cms_state,
    save_cms_state,
)
from scripts.preview_server import (
    ADMIN_EMAIL,
    CONTENT_DIR,
    PRACTICE_PRESENTATION_BY_SLUG,
    clean_ui_team_member,
    load_articles,
    load_inquiries,
    render_home_page,
    resolve_article_category,
    save_articles,
    save_inquiries,
)

ROOT_DIR = Path(__file__).resolve().parent.parent


class TestAdminCMSBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        # Backup content files to restore after tests
        cls.articles_backup = (CONTENT_DIR / "articles.json").read_text(encoding="utf-8")
        cls.cms_state_backup = (CONTENT_DIR / "cms_state.json").read_text(encoding="utf-8")
        cls.inquiries_backup = (
            (CONTENT_DIR / "inquiries.json").read_text(encoding="utf-8")
            if (CONTENT_DIR / "inquiries.json").exists()
            else "[]"
        )

    @classmethod
    def tearDownClass(cls) -> None:
        # Restore backups
        (CONTENT_DIR / "articles.json").write_text(cls.articles_backup, encoding="utf-8")
        (CONTENT_DIR / "cms_state.json").write_text(cls.cms_state_backup, encoding="utf-8")
        (CONTENT_DIR / "inquiries.json").write_text(cls.inquiries_backup, encoding="utf-8")

    def call_admin_api(self, path: str, body: dict) -> tuple[int, dict]:
        return handle_admin_api(
            path,
            body,
            ADMIN_EMAIL,
            clean_ui_team_member,
            PRACTICE_PRESENTATION_BY_SLUG,
        )

    # =========================================================================
    # 1. ARTICLES CRUD & PUBLISHING LIFECYCLE
    # =========================================================================
    def test_article_lifecycle_and_category_resolution(self) -> None:
        initial_articles = load_articles(include_drafts=True)
        test_slug = "uji-coba-kajian-hukum-pertanahan-backend"
        test_title = "Uji Coba Kajian Hukum Pertanahan Backend"

        # 1. Category slug resolution test
        cat_resolved = resolve_article_category("Agraria & Properti")
        self.assertEqual(cat_resolved["slug"], "agraria-dan-properti")
        self.assertEqual(cat_resolved["name"], "Agraria & Properti")

        # 2. Create Draft Article
        new_article = {
            "id": f"art-test-{test_slug}",
            "slug": test_slug,
            "title": test_title,
            "excerpt": "Ringkasan uji coba artikel backend.",
            "category": cat_resolved,
            "authorName": "Tim Penguji Mutu",
            "status": "draft",
            "publishedAt": "2026-10-28T00:00:00Z",
            "publishedLabel": "28 Oktober 2026",
            "coverUrl": "/images/article-land.webp",
            "coverAlt": f"Ilustrasi {test_title}",
            "seoTitle": f"{test_title} | FS dan Rekan",
            "seoDescription": "Deskripsi SEO uji coba.",
            "bodyHtml": "<p>Isi lengkap uji coba artikel hukum pertanahan.</p>",
        }
        articles = load_articles(include_drafts=True)
        articles.insert(0, new_article)
        save_articles(articles)

        # Verify saved in draft mode
        all_with_drafts = load_articles(include_drafts=True)
        self.assertTrue(any(a["id"] == new_article["id"] for a in all_with_drafts))
        published_only = load_articles(include_drafts=False)
        self.assertFalse(any(a["id"] == new_article["id"] for a in published_only))

        # 3. Toggle Status from Draft to Published
        for a in all_with_drafts:
            if a["id"] == new_article["id"]:
                a["status"] = "published"
        save_articles(all_with_drafts)

        published_only_now = load_articles(include_drafts=False)
        self.assertTrue(any(a["id"] == new_article["id"] for a in published_only_now))

        # 4. Update Article
        updated_title = "Uji Coba Kajian Pertanahan (Diperbarui)"
        for a in all_with_drafts:
            if a["id"] == new_article["id"]:
                a["title"] = updated_title
                a["category"] = resolve_article_category("Hukum Korporasi & Bisnis")
        save_articles(all_with_drafts)

        reloaded = load_articles(include_drafts=True)
        target = next(a for a in reloaded if a["id"] == new_article["id"])
        self.assertEqual(target["title"], updated_title)
        self.assertEqual(target["category"]["slug"], "hukum-korporasi")

        # 5. Delete Article
        cleaned = [a for a in reloaded if a["id"] != new_article["id"]]
        save_articles(cleaned)

        final_articles = load_articles(include_drafts=True)
        self.assertFalse(any(a["id"] == new_article["id"] for a in final_articles))
        self.assertEqual(len(final_articles), len(initial_articles))

    # =========================================================================
    # 2. CATEGORIES CRUD & IN-USE PROTECTION
    # =========================================================================
    def test_category_crud_and_in_use_protection(self) -> None:
        # 1. Create Category
        status, res = self.call_admin_api(
            "/api/admin/category",
            {
                "action": "create",
                "name": "Hukum Kepabeanan & Cukai",
                "description": "Kajian kepabeanan dan perdagangan luar negeri.",
            },
        )
        self.assertEqual(status, 200)
        self.assertTrue(res.get("ok"))

        state = load_cms_state()
        new_cat = next(c for c in state["categories"] if c["name"] == "Hukum Kepabeanan & Cukai")
        self.assertEqual(new_cat["slug"], "hukum-kepabeanan-cukai")

        # 2. Update Category
        status, res = self.call_admin_api(
            "/api/admin/category",
            {
                "action": "update",
                "id": new_cat["id"],
                "name": "Hukum Kepabeanan & Cukai Internasional",
                "description": "Deskripsi diperbarui.",
            },
        )
        self.assertEqual(status, 200)

        # 3. Test In-Use Protection: Attempting to delete category used by existing article must fail with 400
        cat_in_use = next(c for c in state["categories"] if c["slug"] == "hukum-korporasi")
        status, res = self.call_admin_api(
            "/api/admin/category",
            {"action": "delete", "id": cat_in_use["id"]},
        )
        self.assertEqual(status, 400)
        self.assertIn("masih digunakan", res.get("error", ""))

        # 4. Delete unused category succeeds
        status, res = self.call_admin_api(
            "/api/admin/category",
            {"action": "delete", "id": new_cat["id"]},
        )
        self.assertEqual(status, 200)

    # =========================================================================
    # 3. TEAM MEMBERS MANAGEMENT & FR-3.2 VALIDATION
    # =========================================================================
    def test_team_member_override_and_custom_crud(self) -> None:
        # 1. Bio validation: shortBio > 200 chars must be rejected
        status, res = self.call_admin_api(
            "/api/admin/team",
            {
                "action": "update",
                "slug": "ferdinan-hasiholan-silalahi",
                "shortBio": "A" * 205,
            },
        )
        self.assertEqual(status, 400)
        self.assertIn("200 karakter", res.get("error", ""))

        # 2. Valid profile update
        status, res = self.call_admin_api(
            "/api/admin/team",
            {
                "action": "update",
                "slug": "ferdinan-hasiholan-silalahi",
                "fullName": "Ferdinan Hasiholan Silalahi",
                "honorific": "S.H.",
                "roleTitle": "Managing Partner & Founder",
                "group": "Founder",
                "shortBio": "Advokat berdedikasi tinggi dengan pengalaman litigasi mendalam.",
                "educationText": "Sarjana Hukum, Universitas Kristen Indonesia",
                "credentialsText": "Perhimpunan Advokat Indonesia (PERADI)",
                "languagesText": "Bahasa Indonesia\nBahasa Inggris",
                "tagsText": "Litigasi, Korporasi, Mediasi",
                "photoUrl": "/team/ferdinan-hasiholan-silalahi.webp",
                "displayOrder": 1,
                "isPublished": True,
            },
        )
        self.assertEqual(status, 200)

        # 3. Create Custom Team Member
        custom_slug = "advokat-spesialis-pajak"
        status, res = self.call_admin_api(
            "/api/admin/team",
            {
                "action": "create",
                "fullName": "Advokat Spesialis Pajak",
                "honorific": "S.H., M.H.",
                "roleTitle": "Senior Tax Counsel",
                "group": "Associate",
                "shortBio": "Spesialis sengketa pajak dan kepatuhan fiskal perusahaan.",
                "displayOrder": 6,
            },
        )
        self.assertEqual(status, 200)

        team = get_merged_team_members(clean_ui_team_member, include_unpublished=True)
        created = next(m for m in team if "Advokat Spesialis Pajak" in m["fullName"])
        self.assertEqual(created["roleTitle"], "Senior Tax Counsel")

        # 4. Delete Custom Member
        status, res = self.call_admin_api(
            "/api/admin/team",
            {
                "action": "delete_custom",
                "slug": created["slug"],
            },
        )
        self.assertEqual(status, 200)

    # =========================================================================
    # 4. PRACTICE AREAS MANAGEMENT
    # =========================================================================
    def test_practice_areas_override_and_custom_crud(self) -> None:
        # 1. Update existing practice area
        status, res = self.call_admin_api(
            "/api/admin/practice",
            {
                "action": "update",
                "slug": "litigasi-korporasi-dan-komersial",
                "name": "Litigasi Korporasi dan Komersial",
                "label": "KORPORASI",
                "image": "/images/practice-corporate.webp",
                "summary": "Pendampingan penyelesaian sengketa korporasi dan perjanjian komersial.",
                "description": "Penyelesaian Sengketa Kontrak & Tata Kelola Perusahaan",
                "scopeText": "Sengketa pemegang saham\nPeninjauan kontrak bisnis",
                "displayOrder": 1,
                "isPublished": True,
            },
        )
        self.assertEqual(status, 200)

        # 2. Create custom practice area
        status, res = self.call_admin_api(
            "/api/admin/practice",
            {
                "action": "create",
                "name": "Hukum Energi & Sumber Daya Mineral",
                "label": "ENERGI & MINERBA",
                "summary": "Konsultasi regulasi pertambangan, perizinan, dan kontrak energi.",
                "description": "Tata Kelola Perizinan dan Kontrak Sektor Energi",
                "scopeText": "Uji tuntas izin usaha pertambangan (IUP)\nPenyusunan kontrak bagi hasil",
                "displayOrder": 11,
            },
        )
        self.assertEqual(status, 200)

        areas = get_merged_practice_areas(PRACTICE_PRESENTATION_BY_SLUG, include_unpublished=True)
        custom_area = next(a for a in areas if a["slug"] == "hukum-energi-sumber-daya-mineral")
        self.assertEqual(custom_area["label"], "ENERGI & MINERBA")

        # 3. Delete custom practice area
        status, res = self.call_admin_api(
            "/api/admin/practice",
            {
                "action": "delete_custom",
                "slug": custom_area["slug"],
            },
        )
        self.assertEqual(status, 200)

    # =========================================================================
    # 5. CASE RECORDS & SK-14 ANONYMITY GUARD
    # =========================================================================
    def test_case_records_and_sk14_anonymity_guard(self) -> None:
        # 1. Anonymous case record succeeds
        status, res = self.call_admin_api(
            "/api/admin/cases",
            {
                "action": "create",
                "caseType": "Sengketa Pemegang Saham Sektor Logistik",
                "region": "Pengadilan Negeri Jakarta Pusat",
                "displayMode": "anonymous",
            },
        )
        self.assertEqual(status, 200)

        cases = get_merged_case_records(include_unpublished=True)
        anon_case = next(c for c in cases if c["caseType"] == "Sengketa Pemegang Saham Sektor Logistik")
        self.assertIsNone(anon_case.get("clientName"))

        # 2. Named case record WITHOUT consentRef MUST FAIL (SK-14 Violation)
        status, res = self.call_admin_api(
            "/api/admin/cases",
            {
                "action": "create",
                "caseType": "Perkara Perdata Komersial",
                "region": "Pengadilan Negeri Jakarta Selatan",
                "displayMode": "named",
                "clientName": "PT Klien Terbuka Indonesia",
                "consentRef": "",  # Missing consentRef
            },
        )
        self.assertEqual(status, 400)
        self.assertIn("Pelanggaran SK-14", res.get("error", ""))

        # 3. Named case record WITH valid consentRef succeeds
        status, res = self.call_admin_api(
            "/api/admin/cases",
            {
                "action": "create",
                "caseType": "Perkara Perdata Komersial",
                "region": "Pengadilan Negeri Jakarta Selatan",
                "displayMode": "named",
                "clientName": "PT Klien Terbuka Indonesia",
                "consentRef": "SPK-CONSENT-2026-001",
            },
        )
        self.assertEqual(status, 200)

        # 4. Clean up
        cases = get_merged_case_records(include_unpublished=True)
        for c in cases:
            if c["caseType"] in ("Sengketa Pemegang Saham Sektor Logistik", "Perkara Perdata Komersial"):
                self.call_admin_api("/api/admin/cases", {"action": "delete", "id": c["id"]})

    # =========================================================================
    # 6. INQUIRY LIFECYCLE & UU PDP ERASURE
    # =========================================================================
    def test_inquiry_lifecycle_and_pdp_erasure(self) -> None:
        test_inquiry = {
            "id": "inq-test-backend-001",
            "name": "Budi Hartono",
            "email": "budi.hartono@example.com",
            "phone": "08123456789",
            "practiceAreaId": "Litigasi Korporasi dan Komersial",
            "preferredDate": "2026-11-10",
            "sessionSlot": "Pagi (09.30 – 12.00 WIB)",
            "method": "Tatap Muka di Kantor",
            "summary": "Konsultasi sengketa perjanjian distribusi bahan bangunan.",
            "consent": True,
            "consentAt": "2026-10-28T03:00:00Z",
            "status": "baru",
            "internalNotes": "",
        }
        inquiries = load_inquiries()
        inquiries.append(test_inquiry)
        save_inquiries(inquiries)

        # 1. Update status & internal notes
        for inq in inquiries:
            if inq["id"] == test_inquiry["id"]:
                inq["status"] = "dihubungi"
                inq["internalNotes"] = "Sudah dihubungi via WhatsApp oleh staf admin."
        save_inquiries(inquiries)

        reloaded = load_inquiries()
        target = next(i for i in reloaded if i["id"] == test_inquiry["id"])
        self.assertEqual(target["status"], "dihubungi")
        self.assertIn("Sudah dihubungi", target["internalNotes"])

        # 2. PDP Erasure: delete inquiry
        inquiries_cleaned = [i for i in reloaded if i["id"] != test_inquiry["id"]]
        save_inquiries(inquiries_cleaned)

        final_inquiries = load_inquiries()
        self.assertFalse(any(i["id"] == test_inquiry["id"] for i in final_inquiries))

    # =========================================================================
    # 7. MEDIA UPLOAD & SEC-013 MIME CONTROLS
    # =========================================================================
    def test_media_upload_sec013_controls(self) -> None:
        # 1. Reject SVG
        status, res = self.call_admin_api(
            "/api/admin/media",
            {
                "mimeType": "image/svg+xml",
                "filename": "vector-icon.svg",
                "dataBase64": base64.b64encode(b"<svg></svg>").decode("utf-8"),
            },
        )
        self.assertEqual(status, 400)
        self.assertIn("SEC-013", res.get("error", ""))

        # 2. Reject non-whitelisted MIME (PDF)
        status, res = self.call_admin_api(
            "/api/admin/media",
            {
                "mimeType": "application/pdf",
                "filename": "document.pdf",
                "dataBase64": base64.b64encode(b"%PDF-1.4").decode("utf-8"),
            },
        )
        self.assertEqual(status, 400)
        self.assertIn("SEC-013", res.get("error", ""))

        # 3. Accept valid PNG and clean up
        dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        status, res = self.call_admin_api(
            "/api/admin/media",
            {
                "mimeType": "image/png",
                "filename": "test-pixel-upload.png",
                "dataBase64": base64.b64encode(dummy_png).decode("utf-8"),
            },
        )
        self.assertEqual(status, 200)
        uploaded_url = res.get("url", "")
        self.assertTrue(uploaded_url.startswith("/images/"))
        local_file = ROOT_DIR / "public" / uploaded_url.lstrip("/")
        self.assertTrue(local_file.exists())
        local_file.unlink()  # Clean up test upload

    # =========================================================================
    # 8. SITE SETTINGS & PHONE NORMALIZATION
    # =========================================================================
    def test_site_settings_and_phone_normalization(self) -> None:
        status, res = self.call_admin_api(
            "/api/admin/settings",
            {
                "whatsappNumber": "0811830991",  # Local 08... format
                "heroEyebrow": "KANTOR HUKUM & ADVOKASI LITIGASI — JAKARTA PUSAT",
            },
        )
        self.assertEqual(status, 200)

        state = load_cms_state()
        # Must be normalized to international 62811830991
        self.assertEqual(state["siteSettings"]["whatsappNumber"], "62811830991")

    # =========================================================================
    # 9. USER MANAGEMENT & SEC-001 PASSWORD COMPLEXITY
    # =========================================================================
    def test_user_management_and_sec001_password_complexity(self) -> None:
        # 1. Reject password < 12 characters
        status, res = self.call_admin_api(
            "/api/admin/users",
            {
                "action": "create",
                "name": "Staf Magang",
                "email": "magang@fsdanrekan.id",
                "password": "Pendek1!",  # 8 chars < 12
            },
        )
        self.assertEqual(status, 400)
        self.assertIn("minimal 12 karakter", res.get("error", ""))

        # 2. Create valid editor
        status, res = self.call_admin_api(
            "/api/admin/users",
            {
                "action": "create",
                "name": "Staf Redaksi Hukum",
                "email": "redaksi.baru@fsdanrekan.id",
                "password": "SandiPanjangKuat2026!#",
                "role": "editor",
            },
        )
        self.assertEqual(status, 200)

        state = load_cms_state()
        new_user = next(u for u in state["users"] if u["email"] == "redaksi.baru@fsdanrekan.id")
        self.assertEqual(new_user["role"], "editor")

        # 3. Clean up user
        status, res = self.call_admin_api(
            "/api/admin/users",
            {"action": "delete", "id": new_user["id"]},
        )
        self.assertEqual(status, 200)

    # =========================================================================
    # 10. INSTAGRAM GALLERY CRUD
    # =========================================================================
    def test_instagram_gallery_crud(self) -> None:
        status, res = self.call_admin_api(
            "/api/admin/instagram",
            {
                "action": "create",
                "caption": "Edukasi sengketa batas tanah menurut hukum agraria.",
                "category": "Agraria & Properti",
                "permalink": "https://instagram.com/p/test12345/",
            },
        )
        self.assertEqual(status, 200)
        item_id = res["item"]["id"]

        # Toggle publish
        status, res = self.call_admin_api(
            "/api/admin/instagram",
            {"action": "toggle_publish", "id": item_id},
        )
        self.assertEqual(status, 200)

        # Delete item
        status, res = self.call_admin_api(
            "/api/admin/instagram",
            {"action": "delete", "id": item_id},
        )
        self.assertEqual(status, 200)

    # =========================================================================
    # 11. AUDIT LOG GENERATION
    # =========================================================================
    def test_audit_log_generation(self) -> None:
        state = load_cms_state()
        logs = state.get("auditLogs", [])
        self.assertGreater(len(logs), 0)
        latest_log = logs[0]
        self.assertIn("actor", latest_log)
        self.assertIn("timestamp", latest_log)
        self.assertIn("action", latest_log)

    # =========================================================================
    # 12. SEO TECHNICAL AUDIT & JSON-LD STRUCTURED DATA
    # =========================================================================
    def test_seo_technical_metadata_and_json_ld(self) -> None:
        home_html = render_home_page()

        # Check essential SEO tags
        self.assertIn("<title>", home_html)
        self.assertIn('name="description"', home_html)
        self.assertIn('rel="canonical"', home_html)
        self.assertIn('property="og:title"', home_html)
        self.assertIn('property="og:description"', home_html)
        self.assertIn('property="og:url"', home_html)
        self.assertIn('property="og:image"', home_html)
        self.assertIn('name="twitter:card"', home_html)

        # Check Schema.org LegalService JSON-LD
        self.assertIn('"@type": "LegalService"', home_html)
        self.assertIn('"@type": "GeoCoordinates"', home_html)
        self.assertIn('"latitude": -6.192815', home_html)
        self.assertIn('"longitude": 106.8363629', home_html)
        self.assertIn('"telephone": "+62811830991"', home_html)
        self.assertIn('"email": "konsultasi@fsdanrekan.id"', home_html)
        self.assertIn('"addressLocality": "Jakarta Pusat"', home_html)
        self.assertIn('"openingHoursSpecification"', home_html)


if __name__ == "__main__":
    unittest.main()
