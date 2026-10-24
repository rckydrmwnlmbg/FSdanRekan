#!/usr/bin/env python3
"""
Unit tests for SK-01 content seed (content/team.json, content/practice_areas.json, public/team/*.webp).
Covers:
1. Profile count (5)
2. Profile order and slugs
3. Absence of forbidden legacy names ("FHSP", "Ferdinan Hasiholan Silalahi & Partners", etc.)
4. shortBio <= 200 characters and verbatim match of shortBio & fullBio with CONTENT_PROFILES.md
5. All photos mapped to public/team/<slug>.webp, uniform 4:5 aspect ratio, EXIF stripped, alt format
6. Idempotency of seed_team.py and preservation of original /images files
7. Practice areas (10 items from DESIGN.md Section 8 with TODO(client) placeholders)
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from PIL import Image

from scripts.seed_team import (
    CASE_RECORDS_JSON_PATH,
    CONTENT_PROFILES_MD,
    FILENAME_TO_SLUG,
    IMAGES_DIR,
    PRACTICE_AREAS_JSON_PATH,
    PUBLIC_TEAM_DIR,
    TEAM_JSON_PATH,
    extract_bios_from_markdown,
    main as run_seed,
    serialize_public_case_record,
)


class TestContentSeed(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        run_seed()
        cls.team_raw = TEAM_JSON_PATH.read_text(encoding="utf-8")
        cls.team = json.loads(cls.team_raw)
        cls.practice_raw = PRACTICE_AREAS_JSON_PATH.read_text(encoding="utf-8")
        cls.practice_areas = json.loads(cls.practice_raw)
        cls.cases_raw = CASE_RECORDS_JSON_PATH.read_text(encoding="utf-8")
        cls.case_records = json.loads(cls.cases_raw)
        cls.md_text = CONTENT_PROFILES_MD.read_text(encoding="utf-8")

    def test_profile_count_is_five(self) -> None:
        self.assertEqual(len(self.team), 5)

    def test_profile_order_and_slugs(self) -> None:
        expected_order = [
            (1, "ferdinan-hasiholan-silalahi"),
            (2, "adina-ilmania-ayu"),
            (3, "basit-rezki"),
            (4, "delia-zaizafun"),
            (5, "farhah-tri-febriani"),
        ]
        actual_order = [(p["displayOrder"], p["slug"]) for p in self.team]
        self.assertEqual(actual_order, expected_order)

    def test_no_forbidden_legacy_names(self) -> None:
        forbidden_terms = [
            "FHSP",
            "FHSP Law Office",
            "Ferdinan Hasiholan Silalahi & Partners",
            "Ferdinan Silalahi & Rekan",
            "& Partners",
        ]
        for term in forbidden_terms:
            self.assertNotIn(
                term.lower(),
                self.team_raw.lower(),
                f"Forbidden term '{term}' found in content/team.json",
            )
            self.assertNotIn(
                term.lower(),
                self.practice_raw.lower(),
                f"Forbidden term '{term}' found in content/practice_areas.json",
            )

    def test_short_bio_length_and_verbatim_bios(self) -> None:
        for profile in self.team:
            slug = profile["slug"]
            short_bio = profile["shortBio"]
            full_bio = profile["fullBio"]

            self.assertLessEqual(
                len(short_bio),
                200,
                f"shortBio for {slug} exceeds 200 characters ({len(short_bio)})",
            )

            expected_short, expected_full = extract_bios_from_markdown(
                self.md_text, slug
            )
            self.assertEqual(
                short_bio,
                expected_short,
                f"shortBio for {slug} does not match CONTENT_PROFILES.md verbatim",
            )
            self.assertEqual(
                full_bio,
                expected_full,
                f"fullBio for {slug} does not match CONTENT_PROFILES.md verbatim",
            )

    def test_todo_placeholders_and_no_invented_titles(self) -> None:
        by_slug = {p["slug"]: p for p in self.team}
        self.assertTrue(
            by_slug["adina-ilmania-ayu"]["honorific"].startswith("TODO(client)")
        )
        self.assertTrue(
            by_slug["delia-zaizafun"]["honorific"].startswith("TODO(client)")
        )
        self.assertTrue(
            by_slug["farhah-tri-febriani"]["roleTitle"].startswith("TODO(client)")
        )
        self.assertEqual(by_slug["ferdinan-hasiholan-silalahi"]["honorific"], "S.H.")
        self.assertEqual(by_slug["basit-rezki"]["honorific"], "S.H.")
        self.assertEqual(by_slug["farhah-tri-febriani"]["honorific"], "S.H.")

    def test_all_photos_mapped_4_by_5_and_exif_stripped(self) -> None:
        self.assertEqual(len(FILENAME_TO_SLUG), 5)
        for src_name in FILENAME_TO_SLUG:
            self.assertTrue(
                (IMAGES_DIR / src_name).exists(),
                f"Original photo {src_name} missing in /images",
            )

        for profile in self.team:
            slug = profile["slug"]
            photo = profile["photo"]
            self.assertEqual(photo["url"], f"/team/{slug}.webp")
            self.assertTrue(photo["alt"].startswith(f"Foto {profile['fullName']}"))

            webp_path = PUBLIC_TEAM_DIR / f"{slug}.webp"
            self.assertTrue(webp_path.exists(), f"Missing processed photo: {webp_path}")

            with Image.open(webp_path) as img:
                w, h = img.size
                self.assertEqual(
                    w * 5,
                    h * 4,
                    f"Photo {webp_path} is not 4:5 aspect ratio ({w}x{h})",
                )
                exif = img.getexif()
                self.assertEqual(
                    len(exif), 0, f"EXIF metadata not stripped from {webp_path}"
                )
                self.assertNotIn("exif", img.info)

            # Verify responsive variants also exist and have 4:5 aspect ratio + no EXIF
            for width_px in (400, 600, 800):
                variant_path = PUBLIC_TEAM_DIR / f"{slug}-{width_px}w.webp"
                self.assertTrue(
                    variant_path.exists(), f"Missing variant {variant_path}"
                )
                with Image.open(variant_path) as v_img:
                    vw, vh = v_img.size
                    self.assertEqual(vw * 5, vh * 4)
                    self.assertEqual(len(v_img.getexif()), 0)

    def test_seed_is_idempotent(self) -> None:
        before = TEAM_JSON_PATH.read_text(encoding="utf-8")
        run_seed()
        after = TEAM_JSON_PATH.read_text(encoding="utf-8")
        self.assertEqual(before, after, "Seed script is not idempotent")

    def test_practice_areas_structure(self) -> None:
        self.assertEqual(len(self.practice_areas), 10)
        for idx, area in enumerate(self.practice_areas, start=1):
            self.assertEqual(area["displayOrder"], idx)
            self.assertIn("TODO(client)", area["summary"])
            self.assertIn("TODO(client)", area["description"])
            self.assertTrue(
                all("TODO(client)" in item for item in area["advocacyScope"])
            )

    def test_case_records_sk14_anonymous_and_no_client_name_in_public_output(self) -> None:
        self.assertEqual(len(self.case_records), 7)
        internal_parties = [
            "Sekolah Tinggi Teologi Baptis Kalvari",
            "PT Baja Trikarsa Persada",
            "PT Pendekar Konstruksi Persada",
            "PT Inti Darma Globalindo",
        ]
        for party in internal_parties:
            self.assertNotIn(
                party.lower(),
                self.cases_raw.lower(),
                f"Confidential party '{party}' must not appear in content/case_records.json",
            )

        for record in self.case_records:
            self.assertEqual(record["displayMode"], "anonymous")
            self.assertIsNone(record["clientName"])
            self.assertIsNone(record["consentRef"])
            self.assertNotIn("status", record)
            self.assertNotIn("year", record)
            self.assertNotIn("caseValue", record)

            public_out = serialize_public_case_record(record)
            self.assertNotIn("clientName", public_out)
            self.assertNotIn("consentRef", public_out)

        # Verify SK-14 rule: even if an internal record has clientName and displayMode='named',
        # without consentRef it is forced to anonymous and clientName is stripped.
        unconsented_record = {
            "id": "case-test-1",
            "caseType": "Tindak Pidana Korupsi",
            "region": "Semarang, Jawa Tengah",
            "displayMode": "named",
            "clientName": "PT Contoh Internal",
            "consentRef": None,
            "displayOrder": 1,
        }
        pub_unconsented = serialize_public_case_record(unconsented_record)
        self.assertEqual(pub_unconsented["displayMode"], "anonymous")
        self.assertNotIn("clientName", pub_unconsented)


if __name__ == "__main__":
    unittest.main()
