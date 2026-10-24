#!/usr/bin/env python3
"""
Comprehensive verification suite for Milestones M0–M5 (PRD.md, DESIGN.md, TECH_STACK.md, SECURITY.md, SKILLS.md).
Runs deterministically via `python -m unittest` to verify all code, tokens, security controls, and assets.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

from scripts.generate_admin_pdf import PDF_PATH, generate_pdf

ROOT_DIR = Path(__file__).resolve().parent.parent


class TestArchitectureAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        generate_pdf()

    def test_m0_design_tokens_extracted_and_documented(self) -> None:
        tokens_css = (ROOT_DIR / "src" / "styles" / "tokens.css").read_text(encoding="utf-8")
        required_tokens = [
            "--bg-base: #08090c",
            "--bg-surface: #10121a",
            "--bg-surface-elevated: #181b26",
            "--gold-primary: #c5a880",
            "--gold-light: #dfceb8",
            "--text-primary: #f0f2f5",
            "--text-secondary: #d8dce6",
            "--color-bg:",
            "--color-surface:",
            "--color-gold:",
            "--color-navy:",
            "--font-heading:",
            "--font-body:",
            "--container-max: 1320px",
            "prefers-reduced-motion: reduce",
        ]
        for token in required_tokens:
            self.assertIn(token, tokens_css, f"Missing token '{token}' in tokens.css")

        design_md = (ROOT_DIR / "DESIGN.md").read_text(encoding="utf-8")
        # Section 3 table must have final extracted values (no EXTRACT left in Section 3)
        sec3 = design_md.split("## 3. Token")[1].split("## 3A.")[0]
        self.assertNotIn("EXTRACT", sec3)
        self.assertIn("#08090C", sec3)
        self.assertIn("Cormorant Garamond", sec3)
        self.assertIn("Manrope", sec3)

    def test_m0_visual_assets_and_logo_exist(self) -> None:
        expected_public_files = [
            "logo-seal-transparent.png",
            "logo-seal.webp",
            "favicon.ico",
            "icon.png",
            "og-default.webp",
            "images/hero-bg.webp",
            "images/practice-corporate.webp",
            "images/gavel-banner.webp",
        ]
        for rel in expected_public_files:
            path = ROOT_DIR / "public" / rel
            self.assertTrue(path.exists(), f"Missing processed public asset: {path}")

    def test_sec003_no_secrets_or_public_secret_vars(self) -> None:
        env_ts = (ROOT_DIR / "src" / "lib" / "env.ts").read_text(encoding="utf-8")
        self.assertIn("import 'server-only'", env_ts)

        env_example = (ROOT_DIR / ".env.example").read_text(encoding="utf-8")
        for line in env_example.splitlines():
            line_s = line.strip()
            if not line_s or line_s.startswith("#"):
                continue
            key, _, val = line_s.partition("=")
            self.assertEqual(val, "", f".env.example key '{key}' must have empty value")

        # Scan all source files for NEXT_PUBLIC_*(KEY|SECRET|TOKEN|PASSWORD) except TURNSTILE_SITE_KEY
        secret_pattern = re.compile(r"NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE_KEY)")
        for src_file in (ROOT_DIR / "src").rglob("*"):
            if src_file.is_file():
                content = src_file.read_text(encoding="utf-8")
                self.assertIsNone(
                    secret_pattern.search(content),
                    f"Exposed public secret variable in {src_file}",
                )

    def test_sec001_and_sec002_cms_auth_and_access_controls(self) -> None:
        users_ts = (ROOT_DIR / "src" / "collections" / "Users.ts").read_text(encoding="utf-8")
        self.assertIn("maxLoginAttempts: 5", users_ts)
        self.assertIn("useAPIKey: false", users_ts)
        self.assertIn("mfaEnabled", users_ts)

        inquiries_ts = (ROOT_DIR / "src" / "collections" / "Inquiries.ts").read_text(
            encoding="utf-8"
        )
        self.assertIn("create: denyAll", inquiries_ts)
        self.assertIn("read: isAdmin", inquiries_ts)
        self.assertIn("update: isAdmin", inquiries_ts)
        self.assertIn("delete: isAdmin", inquiries_ts)
        self.assertIn("collection: 'audit-logs'", inquiries_ts)

        media_ts = (ROOT_DIR / "src" / "collections" / "Media.ts").read_text(encoding="utf-8")
        self.assertIn("'image/jpeg', 'image/png', 'image/webp'", media_ts)
        self.assertNotIn("image/svg", media_ts)

    def test_sec004_and_sec009_no_unsafe_patterns_and_headers_configured(self) -> None:
        forbidden_code_patterns = [
            r"\beval\s*\(",
            r"new\s+Function\s*\(",
            r"child_process",
            r"queryRawUnsafe",
        ]
        for src_file in (ROOT_DIR / "src").rglob("*.ts*"):
            text = src_file.read_text(encoding="utf-8")
            for pat in forbidden_code_patterns:
                self.assertIsNone(
                    re.search(pat, text),
                    f"Forbidden pattern '{pat}' found in {src_file}",
                )

        next_cfg = (ROOT_DIR / "next.config.ts").read_text(encoding="utf-8")
        for header in [
            "Strict-Transport-Security",
            "X-Content-Type-Options",
            "Referrer-Policy",
            "Permissions-Policy",
            "X-Frame-Options",
            "Content-Security-Policy",
            "frame-ancestors 'none'",
            "poweredByHeader: false",
        ]:
            self.assertIn(header, next_cfg)

    def test_sec005_and_sec011_api_routes_protected(self) -> None:
        inquiry_route = (
            ROOT_DIR / "src" / "app" / "api" / "inquiry" / "route.ts"
        ).read_text(encoding="utf-8")
        # Verify order: assertSameOrigin -> limitByIp -> content-type -> safeParse -> verifyTurnstile -> createInquiry
        idx_origin = inquiry_route.index("assertSameOrigin(")
        idx_limit = inquiry_route.index("limitByIp(")
        idx_ctype = inquiry_route.index("content-type")
        idx_parse = inquiry_route.index("InquiryBodySchema.safeParse(")
        idx_turnstile = inquiry_route.index("verifyTurnstile(")
        idx_create = inquiry_route.index("createInquiry(")
        self.assertTrue(
            idx_origin < idx_limit < idx_ctype < idx_parse < idx_turnstile < idx_create,
            "POST /api/inquiry security check order does not match SK-04 / SEC-005",
        )

        wa_route = (
            ROOT_DIR / "src" / "app" / "api" / "webhooks" / "whatsapp" / "route.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("req.text()", wa_route)
        self.assertIn("verifyMetaSignature(", wa_route)
        self.assertLess(wa_route.index("verifyMetaSignature("), wa_route.index("JSON.parse("))

    def test_no_legacy_fhsp_or_superlatives_in_src(self) -> None:
        forbidden_strings = [
            "FHSP",
            "Ferdinan Hasiholan Silalahi & Partners",
            "98.4%",
            "Tingkat Keberhasilan",
            "terkemuka di Jakarta",
        ]
        for src_file in (ROOT_DIR / "src").rglob("*.ts*"):
            text = src_file.read_text(encoding="utf-8")
            for term in forbidden_strings:
                self.assertNotIn(
                    term.lower(),
                    text.lower(),
                    f"Forbidden legacy/claim string '{term}' found in {src_file}",
                )

    def test_m5_handover_docs_and_pdf_exist(self) -> None:
        self.assertTrue(PDF_PATH.exists(), "Admin guide PDF was not generated")
        self.assertGreater(PDF_PATH.stat().st_size, 1000)
        self.assertTrue((ROOT_DIR / "docs" / "LAUNCH_AND_DNS_CHECKLIST.md").exists())

    def test_ui_has_no_todo_client_or_duplicate_ferdinan_or_fake_stats(self) -> None:
        from scripts.preview_server import (
            render_admin_dashboard,
            render_admin_login,
            render_article_detail,
            render_home_page,
        )

        html = render_home_page()
        self.assertNotIn("TODO(client)", html)
        self.assertNotIn("3 Bahasa", html)
        self.assertNotIn("2 Metode", html)
        self.assertEqual(html.count('class="team-card"'), 4)
        self.assertIn("Ferdinan Hasiholan Silalahi, S.H.", html)
        # Verify scroll-reveal & luxury motion classes
        self.assertIn('data-reveal="up"', html)
        self.assertIn('class="scroll-progress-bar"', html)
        self.assertIn('class="hero-bg-slide is-visible"', html)
        # Verify Admin CMS panel & draft article protection (FR-5.3 / SEC-008)
        self.assertIn("Login Panel Admin CMS", render_admin_login())
        admin_html = render_admin_dashboard()
        self.assertIn("Dasbor Pengelolaan Website", admin_html)
        for tab_id in (
            "tab-dashboard",
            "tab-articles",
            "tab-categories",
            "tab-inquiries",
            "tab-chat",
            "tab-team",
            "tab-practices",
            "tab-cases",
            "tab-instagram",
            "tab-media",
            "tab-settings",
            "tab-security",
        ):
            self.assertIn(tab_id, admin_html, f"Missing Admin CMS module {tab_id}")

        self.assertIn("galeri-instagram", html)
        self.assertIn("guidedChatWidgetRoot", html)

        # Phase 2: Dedicated practice & team detail renderers
        from scripts.preview_server import render_practice_detail, render_team_detail, render_articles_index
        practice_html = render_practice_detail("litigasi-korporasi-dan-komersial")
        self.assertIsNotNone(practice_html)
        self.assertIn("Litigasi Korporasi", practice_html)
        self.assertIsNone(render_practice_detail("non-existent-area"))

        team_html = render_team_detail("ferdinan-hasiholan-silalahi")
        self.assertIsNotNone(team_html)
        self.assertIn("Ferdinan Hasiholan Silalahi, S.H.", team_html)
        self.assertIsNone(render_team_detail("non-existent-member"))

        # Phase 2: Keyword search filtering on articles
        search_html = render_articles_index("litigasi")
        self.assertIn("Litigasi", search_html)

        self.assertIsNone(render_article_detail("draf-internal-belum-terbit", is_admin_preview=False))
        self.assertIsNotNone(render_article_detail("draf-internal-belum-terbit", is_admin_preview=True))

        # Verify Admin API security guards (SEC-001, SEC-013, SK-14)
        from scripts.admin_cms import handle_admin_api
        from scripts.preview_server import PRACTICE_PRESENTATION_BY_SLUG, clean_ui_team_member

        # SEC-013: Reject SVG upload
        code_svg, _ = handle_admin_api(
            "/api/admin/media",
            {"filename": "xss.svg", "mimeType": "image/svg+xml", "dataBase64": "PHN2Zz48L3N2Zz4="},
            "admin@fsdanrekan.id",
            clean_ui_team_member,
            PRACTICE_PRESENTATION_BY_SLUG,
        )
        self.assertEqual(code_svg, 400)

        # SK-14: Reject named case record without consentRef
        code_case, _ = handle_admin_api(
            "/api/admin/cases",
            {"action": "create", "caseType": "Perdata", "region": "Jakarta", "displayMode": "named"},
            "admin@fsdanrekan.id",
            clean_ui_team_member,
            PRACTICE_PRESENTATION_BY_SLUG,
        )
        self.assertEqual(code_case, 400)

        # SEC-001: Reject user creation with password < 12 chars
        code_pw, _ = handle_admin_api(
            "/api/admin/users",
            {"action": "create", "name": "Test", "email": "test@fsdanrekan.id", "password": "short"},
            "admin@fsdanrekan.id",
            clean_ui_team_member,
            PRACTICE_PRESENTATION_BY_SLUG,
        )
        self.assertEqual(code_pw, 400)


if __name__ == "__main__":
    unittest.main()
