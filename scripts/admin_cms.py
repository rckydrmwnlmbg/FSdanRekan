"""
Enterprise 10-Module CMS Admin Panel for Ferdinan Silalahi dan Rekan Law Firm (FS dan Rekan).
Provides full CRUD management for:
1. Dashboard Overview & KPIs (#tab-dashboard)
2. Articles & Publications (#tab-articles) - Create, Edit, Draft/Publish, SEO Counter, Delete
3. Article Categories (#tab-categories) - Add, Edit, Delete categories
4. Consultation Inquiries (#tab-inquiries) - Filter status, Internal Notes, Direct WA, CSV Export, PDP Delete
5. Team & Partner Profiles (#tab-team) - Full edit of Founder & Associates (Name, Honorific, Role, Bio, Education, Credentials, Languages, Tags, Photo, Order, Visibility) + Add Member
6. 10 Practice Areas (#tab-practices) - Full edit of Name, Badge Label, Stage Image, Summary, Scope Title & Bullet Points + Add Area
7. Case Records (#tab-cases) - Add, Edit, Delete Case Records with SK-14 Anonymity Guard
8. Media Library (#tab-media) - Browse all WebP/PNG assets, Copy URL, Upload new image (SEC-013 MIME check)
9. Site, Homepage & SEO Settings (#tab-settings) - Edit Hero, About, CTA Banner, WhatsApp, Email, Address, Office Hours, Disclaimer, Default SEO
10. Users, Security & Audit Logs (#tab-security) - Manage Admin/Editor accounts, MFA, Password change, and immutable AuditLog table
"""

from __future__ import annotations

import base64
import datetime
import hashlib
import html
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT_DIR / "content"
PUBLIC_DIR = ROOT_DIR / "public"
CMS_STATE_FILE = CONTENT_DIR / "cms_state.json"

DEFAULT_SITE_SETTINGS = {
    "officialFirmName": "Ferdinan Silalahi dan Rekan Law Firm",
    "shortBrandName": "FS dan Rekan",
    "address": "Gedung Mandira Lt. 4, Jl. RP Soeroso No. 33, RT 002 RW 002, Gondangdia, Menteng, Jakarta Pusat 10350",
    "whatsappNumber": "62811830991",
    "whatsappDisplay": "+62 811-830-991",
    "defaultWaMessage": "Halo FS dan Rekan, saya ingin konsultasi hukum.",
    "inquiryRecipientEmail": "konsultasi@fsdanrekan.id",
    "instagramUrl": "https://instagram.com/fhspartners",
    "instagramAccessToken": "",
    "mapsDirectUrl": "https://www.google.com/maps/search/?api=1&query=Gedung+Mandira+Jl.+RP+Soeroso+No.+33+Menteng+Jakarta+Pusat",
    "mapEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.5292868019124!2d106.83606777579133!3d-6.193674693793977!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f43b67eb123b%3A0x6b4fbfe311e92067!2sGedung%20Mandira!5e0!3m2!1sid!2sid!4v1715000000000!5m2!1sid!2sid",
    "officeHoursPagi": "Pagi (09.30 – 12.00 WIB)",
    "officeHoursSiang": "Siang (13.30 – 15.30 WIB)",
    "officeHoursSore": "Sore (16.00 – 18.00 WIB)",
    "heroEyebrow": "KANTOR HUKUM & ADVOKASI LITIGASI — JAKARTA PUSAT",
    "heroTitleLine1": "Pendampingan Hukum Tepercaya.",
    "heroTitleGold": "Integritas Tanpa Kompromi.",
    "heroLead": "Ferdinan Silalahi dan Rekan Law Firm mengombinasikan analisis yuridis mendalam dengan strategi persidangan dan pendampingan hukum yang presisi untuk melindungi kepentingan klien individu maupun korporasi.",
    "aboutEyebrow": "TENTANG FIRMA & PENDIRI",
    "aboutHeading": "Dedikasi Advokasi Berintegritas.",
    "founderMotto": "Life must have meaning",
    "aboutParagraph": "Berangkat dari kepedulian terhadap akses masyarakat Indonesia terhadap layanan hukum yang berkualitas, Ferdinan Silalahi dan Rekan Law Firm didirikan dengan visi menghadirkan pendampingan hukum yang tepercaya, mudah diakses, dan profesional bagi individu, pelaku usaha, maupun masyarakat yang membutuhkan.",
    "cred1Title": "Pendekatan Berorientasi Solusi",
    "cred1Desc": "Menjunjung tinggi nilai integritas, profesionalisme, dan keadilan dalam setiap tahapan pendampingan hukum.",
    "cred2Title": "Komitmen Kerahasiaan Klien",
    "cred2Desc": "Menghormati kerahasiaan informasi klien sesuai Kode Etik Advokat dan ketentuan pelindungan data pribadi yang berlaku.",
    "ctaEyebrow": "PENDAMPINGAN HUKUM PROFESIONAL",
    "ctaTitle": "Solusi Hukum Efektif & Berorientasi pada Kebutuhan Klien.",
    "ctaSubtitle": "Setiap klien berhak memperoleh pendampingan hukum yang kompeten disertai dedikasi, kepedulian, dan penghormatan dalam setiap tahapan proses hukum.",
    "seoDefaultTitle": "Ferdinan Silalahi dan Rekan Law Firm | Kantor Hukum & Advokat Jakarta Pusat",
    "seoDefaultDescription": "Website resmi Ferdinan Silalahi dan Rekan Law Firm (FS dan Rekan), Gedung Mandira Lt. 4, Menteng, Jakarta Pusat.",
    "disclaimerText": "Seluruh konten pada situs ini disediakan semata-mata untuk tujuan informasi dan edukasi umum, serta bukan merupakan nasihat hukum (legal advice). Hubungan advokat dan klien baru berlaku secara sah setelah adanya penandatanganan Surat Kuasa Khusus dan Perjanjian Jasa Hukum.",
}

DEFAULT_CATEGORIES = [
    {"id": "cat-1", "slug": "hukum-korporasi", "name": "Hukum Korporasi & Bisnis", "description": "Kajian kontrak komersial, RUPS, dan tata kelola perusahaan."},
    {"id": "cat-2", "slug": "agraria-dan-properti", "name": "Agraria & Properti", "description": "Uji tuntas pertanahan, sertifikat hak atas tanah, dan properti."},
    {"id": "cat-3", "slug": "pidana-dan-tipikor", "name": "Pidana & Tipikor", "description": "Hukum acara pidana, pembelaan persidangan, dan tindak pidana khusus."},
    {"id": "cat-4", "slug": "perdata-keluarga", "name": "Perdata Keluarga", "description": "Perjanjian perkawinan, waris, dan keperdataan keluarga."},
    {"id": "cat-5", "slug": "kepailitan-dan-pkpu", "name": "Kepailitan & PKPU", "description": "Restrukturisasi utang dan beracara di Pengadilan Niaga."},
    {"id": "cat-6", "slug": "ketenagakerjaan-phi", "name": "Ketenagakerjaan & PHI", "description": "Hubungan industrial, perundingan bipartit/tripartit, dan PHI."},
]

DEFAULT_USERS = [
    {
        "id": "user-1",
        "name": "Administrator Utama",
        "email": "admin@fsdanrekan.id",
        "role": "admin",
        "mfaEnabled": True,
        "credDigest": hashlib.sha256(b"AdminFS2026!#").hexdigest(),
        "createdAt": "2026-10-01T08:00:00Z",
    },
    {
        "id": "user-2",
        "name": "Tim Redaksi Hukum (Editor)",
        "email": "editor@fsdanrekan.id",
        "role": "editor",
        "mfaEnabled": True,
        "credDigest": hashlib.sha256(b"EditorFS2026!#").hexdigest(),
        "createdAt": "2026-10-05T09:00:00Z",
    },
]

DEFAULT_INSTAGRAM_GALLERY = [
    {
        "id": "ig-1",
        "imageUrl": "/images/practice-corporate.webp",
        "alt": "Edukasi Hukum Korporasi & Kontrak Komersial – Ferdinan Silalahi dan Rekan Law Firm",
        "category": "Edukasi Korporasi",
        "caption": "Pentingnya perumusan klausul penyelesaian sengketa dan keadaan kahar (force majeure) dalam perjanjian kerja sama komersial.",
        "publishedDate": "14 Okt 2026",
        "permalink": "https://instagram.com/fhspartners",
        "displayOrder": 1,
        "isPublished": True,
    },
    {
        "id": "ig-2",
        "imageUrl": "/images/article-land.webp",
        "alt": "Edukasi Uji Tuntas Pertanahan & Agraria – Ferdinan Silalahi dan Rekan Law Firm",
        "category": "Agraria & Properti",
        "caption": "Tahapan uji tuntas hukum (legal due diligence) sebelum transaksi aset properti guna memitigasi risiko sengketa alas hak.",
        "publishedDate": "10 Okt 2026",
        "permalink": "https://instagram.com/fhspartners",
        "displayOrder": 2,
        "isPublished": True,
    },
    {
        "id": "ig-3",
        "imageUrl": "/images/hero-slide-courtroom.webp",
        "alt": "Pendampingan Litigasi & Persidangan – Ferdinan Silalahi dan Rekan Law Firm",
        "category": "Litigasi & Advokasi",
        "caption": "Komitmen pendampingan hukum yang berintegritas pada setiap tahapan pemeriksaan hingga persidangan.",
        "publishedDate": "05 Okt 2026",
        "permalink": "https://instagram.com/fhspartners",
        "displayOrder": 3,
        "isPublished": True,
    },
    {
        "id": "ig-4",
        "imageUrl": "/images/practice-bankruptcy.webp",
        "alt": "Kajian Hukum Kepailitan & PKPU – Ferdinan Silalahi dan Rekan Law Firm",
        "category": "Kepailitan & PKPU",
        "caption": "Memahami mekanisme restrukturisasi utang dan proposal perdamaian melalui proses PKPU di Pengadilan Niaga.",
        "publishedDate": "29 Sep 2026",
        "permalink": "https://instagram.com/fhspartners",
        "displayOrder": 4,
        "isPublished": True,
    },
    {
        "id": "ig-5",
        "imageUrl": "/images/practice-ip.webp",
        "alt": "Pelindungan Hak Kekayaan Intelektual – Ferdinan Silalahi dan Rekan Law Firm",
        "category": "Kekayaan Intelektual",
        "caption": "Langkah strategis pelindungan merek dagang, hak cipta, dan penyusunan perjanjian lisensi bagi pelaku usaha.",
        "publishedDate": "22 Sep 2026",
        "permalink": "https://instagram.com/fhspartners",
        "displayOrder": 5,
        "isPublished": True,
    },
    {
        "id": "ig-6",
        "imageUrl": "/images/article-family.webp",
        "alt": "Edukasi Hukum Perdata & Keluarga – Ferdinan Silalahi dan Rekan Law Firm",
        "category": "Hukum Perdata",
        "caption": "Penataan dokumen kepemilikan aset dan perjanjian perkawinan sesuai ketentuan peraturan perundang-undangan.",
        "publishedDate": "15 Sep 2026",
        "permalink": "https://instagram.com/fhspartners",
        "displayOrder": 6,
        "isPublished": True,
    },
]


def load_cms_state() -> dict:
    if CMS_STATE_FILE.exists():
        try:
            state = json.loads(CMS_STATE_FILE.read_text(encoding="utf-8"))
            merged_settings = dict(DEFAULT_SITE_SETTINGS)
            merged_settings.update(state.get("siteSettings", {}))
            state["siteSettings"] = merged_settings
            state.setdefault("categories", list(DEFAULT_CATEGORIES))
            state.setdefault("teamOverrides", {})
            state.setdefault("customTeamMembers", [])
            state.setdefault("practiceOverrides", {})
            state.setdefault("customPracticeAreas", [])
            state.setdefault("caseRecords", None)
            state.setdefault("users", list(DEFAULT_USERS))
            state.setdefault("auditLogs", [])
            state.setdefault("instagramGallery", list(DEFAULT_INSTAGRAM_GALLERY))
            state.setdefault("chatSessions", [])
            return state
        except Exception:
            pass

    initial = {
        "siteSettings": dict(DEFAULT_SITE_SETTINGS),
        "categories": list(DEFAULT_CATEGORIES),
        "teamOverrides": {},
        "customTeamMembers": [],
        "practiceOverrides": {},
        "customPracticeAreas": [],
        "caseRecords": None,
        "users": list(DEFAULT_USERS),
        "instagramGallery": list(DEFAULT_INSTAGRAM_GALLERY),
        "chatSessions": [],
        "auditLogs": [
            {
                "id": "audit-init",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                "actor": "system",
                "action": "INIT_CMS",
                "collection": "site-settings",
                "targetId": "global",
                "detail": "Inisialisasi awal konfigurasi CMS Ferdinan Silalahi dan Rekan Law Firm",
            }
        ],
    }
    save_cms_state(initial)
    return initial


def save_cms_state(state: dict) -> None:
    CMS_STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def append_audit_log(actor: str, action: str, collection: str, target_id: str, detail: str) -> None:
    state = load_cms_state()
    logs = state.get("auditLogs", [])
    logs.insert(
        0,
        {
            "id": f"audit-{int(time.time() * 1000)}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "actor": actor,
            "action": action,
            "collection": collection,
            "targetId": target_id,
            "detail": detail,
        },
    )
    state["auditLogs"] = logs[:150]
    save_cms_state(state)


def list_public_media_files() -> list[dict]:
    items: list[dict] = []
    for folder, category in [(PUBLIC_DIR / "team", "Potret Tim (4:5)"), (PUBLIC_DIR / "images", "Ilustrasi & Latar")]:
        if folder.exists():
            for f in sorted(folder.glob("*.webp")) + sorted(folder.glob("*.png")) + sorted(folder.glob("*.jpg")):
                if "-400w" in f.name or "-600w" in f.name or "-800w" in f.name:
                    continue
                rel_url = "/" + f.relative_to(PUBLIC_DIR).as_posix()
                items.append(
                    {
                        "filename": f.name,
                        "url": rel_url,
                        "category": category,
                        "sizeKb": round(f.stat().st_size / 1024, 1),
                    }
                )
    return items


def get_merged_team_members(clean_ui_fn, include_unpublished: bool = False) -> list[dict]:
    raw_seed = json.loads((CONTENT_DIR / "team.json").read_text(encoding="utf-8"))
    state = load_cms_state()
    overrides = state.get("teamOverrides", {})
    custom_members = state.get("customTeamMembers", [])

    result: list[dict] = []
    for m in raw_seed:
        cleaned = clean_ui_fn(m)
        ov = overrides.get(cleaned["slug"])
        if ov:
            cleaned.update(ov)
            honor = str(cleaned.get("honorific", "")).strip()
            cleaned["displayName"] = f"{cleaned['fullName']}, {honor}" if honor else str(cleaned["fullName"])
            cleaned["photo"] = dict(cleaned.get("photo", {}))
            if ov.get("photoUrl"):
                cleaned["photo"]["url"] = ov["photoUrl"]
                cleaned["photo"]["srcSet"] = f"{ov['photoUrl']} 800w"
            cleaned["photo"]["alt"] = f"Foto {cleaned['displayName']}"
        result.append(cleaned)

    for cm in custom_members:
        result.append(cm)

    result.sort(key=lambda x: int(x.get("displayOrder", 99)))
    if not include_unpublished:
        result = [m for m in result if m.get("isPublished", True)]
    return result


def get_merged_practice_areas(default_pres_by_slug: dict, include_unpublished: bool = False) -> list[dict]:
    raw_seed = json.loads((CONTENT_DIR / "practice_areas.json").read_text(encoding="utf-8"))
    state = load_cms_state()
    overrides = state.get("practiceOverrides", {})
    custom_areas = state.get("customPracticeAreas", [])

    result: list[dict] = []
    for area in raw_seed:
        area = dict(area)
        pres = default_pres_by_slug.get(area["slug"])
        if pres:
            area["image"] = pres["image"]
            if str(area.get("icon", "")).startswith("TODO(client)"):
                area["icon"] = ""
            if str(area.get("summary", "")).startswith("TODO(client)"):
                area["summary"] = pres["summary"]
            if str(area.get("description", "")).startswith("TODO(client)"):
                area["description"] = pres["description"]
            if any(str(s).startswith("TODO(client)") for s in area.get("advocacyScope", [])):
                area["advocacyScope"] = list(pres["advocacyScope"])
        ov = overrides.get(area["slug"])
        if ov:
            area.update(ov)
        result.append(area)

    for ca in custom_areas:
        result.append(ca)

    result.sort(key=lambda x: int(x.get("displayOrder", 99)))
    if not include_unpublished:
        result = [a for a in result if a.get("isPublished", True)]
    return result


def get_merged_case_records(include_unpublished: bool = False) -> list[dict]:
    state = load_cms_state()
    records = state.get("caseRecords")
    if records is None:
        records = json.loads((CONTENT_DIR / "case_records.json").read_text(encoding="utf-8"))
    records = [dict(r) for r in records]
    records.sort(key=lambda x: int(x.get("displayOrder", 99)))
    if not include_unpublished:
        records = [r for r in records if r.get("isPublished", True)]
    return records


def get_merged_instagram_gallery(include_unpublished: bool = False) -> list[dict]:
    state = load_cms_state()
    items = state.get("instagramGallery") or list(DEFAULT_INSTAGRAM_GALLERY)
    if not include_unpublished:
        items = [i for i in items if i.get("isPublished", True)]
    return sorted(items, key=lambda x: int(x.get("displayOrder", 999)))


def sync_instagram_media(access_token: str = "") -> tuple[bool, str, list[dict]]:
    """
    Fetch live posts from Meta Instagram Graph API (SK-13).
    Returns (success, message, items).
    """
    state = load_cms_state()
    settings = state.get("siteSettings", {})
    token = access_token.strip() or settings.get("instagramAccessToken", "").strip() or os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()

    if not token:
        return False, "Token Instagram belum dimasukkan. Masukkan User Access Token dari Meta for Developers terlebih dahulu.", []

    url = f"https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=6&access_token={urllib.parse.quote(token)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "FSDanRekan-CMS/2.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
            data = payload.get("data", [])
            if not data:
                return True, "Akun Instagram terhubung, namun belum memiliki postingan media.", []

            new_items = []
            for idx, item in enumerate(data):
                full_caption = (item.get("caption") or "").strip() or "Publikasi resmi Ferdinan Silalahi dan Rekan Law Firm."
                mtype = item.get("media_type")
                image_url = item.get("thumbnail_url") if mtype == "VIDEO" else item.get("media_url")
                if not image_url:
                    image_url = "/images/hero-slide-courtroom.webp"

                lower = full_caption.lower()
                category = "Publikasi Resmi"
                if any(w in lower for w in ("korporasi", "kontrak", "bisnis", "pt", "rups")):
                    category = "Hukum Korporasi"
                elif any(w in lower for w in ("tanah", "lahan", "properti", "agraria", "sertifikat")):
                    category = "Agraria & Properti"
                elif any(w in lower for w in ("litigasi", "sidang", "pengadilan", "gugatan")):
                    category = "Litigasi & Advokasi"
                elif any(w in lower for w in ("pailit", "pkpu", "utang", "piutang")):
                    category = "Kepailitan & PKPU"
                elif any(w in lower for w in ("merek", "hki", "hak cipta", "paten")):
                    category = "Kekayaan Intelektual"
                elif any(w in lower for w in ("keluarga", "waris", "perdata", "cerai")):
                    category = "Hukum Perdata"
                elif any(w in lower for w in ("pidana", "polisi", "kejaksaan", "tipikor")):
                    category = "Pidana & Tipikor"

                ts = item.get("timestamp")
                formatted_date = "Baru saja"
                if ts:
                    try:
                        clean_ts = ts.replace("Z", "+00:00")
                        dt = datetime.datetime.fromisoformat(clean_ts)
                        months_id = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
                        formatted_date = f"{dt.day} {months_id[dt.month - 1]} {dt.year}"
                    except Exception:
                        pass

                new_items.append({
                    "id": f"ig-live-{item.get('id', idx+1)}",
                    "imageUrl": image_url,
                    "alt": f"Postingan Instagram: {full_caption[:60]} – Ferdinan Silalahi dan Rekan Law Firm",
                    "category": category,
                    "caption": full_caption[:180] + ("..." if len(full_caption) > 180 else ""),
                    "publishedDate": formatted_date,
                    "permalink": item.get("permalink") or "https://instagram.com/",
                    "displayOrder": idx + 1,
                    "isPublished": True,
                })

            state["instagramGallery"] = new_items
            save_cms_state(state)
            return True, f"Berhasil sinkronisasi {len(new_items)} postingan langsung dari Meta Instagram API.", new_items
    except urllib.error.HTTPError as he:
        try:
            err_body = json.loads(he.read().decode("utf-8"))
            err_msg = err_body.get("error", {}).get("message", str(he))
        except Exception:
            err_msg = str(he)
        return False, f"Meta API Error ({he.code}): {err_msg}", []
    except Exception as exc:
        return False, f"Gagal menghubungi server Instagram: {exc}", []



def get_chat_sessions() -> list[dict]:
    state = load_cms_state()
    sessions = state.get("chatSessions") or []
    return sorted(sessions, key=lambda x: x.get("createdAt", ""), reverse=True)


def handle_admin_api(path: str, body: dict, actor_email: str, clean_ui_fn, default_pres_by_slug: dict) -> tuple[int, dict]:
    state = load_cms_state()

    # 1. Save Site, Hero, About, CTA, Contact & SEO Settings
    if path == "/api/admin/settings":
        settings = state["siteSettings"]
        for key in DEFAULT_SITE_SETTINGS:
            if key in body:
                val = str(body[key]).strip()
                if key == "whatsappNumber":
                    digits = "".join(ch for ch in val if ch.isdigit())
                    if digits.startswith("0"):
                        digits = "62" + digits[1:]
                    val = digits or settings["whatsappNumber"]
                settings[key] = val
        state["siteSettings"] = settings
        save_cms_state(state)
        append_audit_log(actor_email, "UPDATE_SETTINGS", "site-settings", "global", "Memperbarui pengaturan situs, beranda, kontak & SEO")
        return 200, {"ok": True, "message": "Pengaturan situs berhasil disimpan."}

    # 2. Manage Categories
    if path == "/api/admin/category":
        action = body.get("action")
        cats = state.get("categories", [])
        if action == "create":
            name = str(body.get("name", "")).strip()
            if not name:
                return 400, {"error": "Nama kategori wajib diisi."}
            slug = "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in name).split())
            new_cat = {
                "id": f"cat-{int(time.time() * 1000)}",
                "slug": slug,
                "name": name,
                "description": str(body.get("description", "")).strip(),
            }
            cats.append(new_cat)
            state["categories"] = cats
            save_cms_state(state)
            append_audit_log(actor_email, "CREATE_CATEGORY", "categories", new_cat["id"], f"Menambah kategori: {name}")
            return 200, {"ok": True}
        if action == "update":
            cid = body.get("id")
            for c in cats:
                if c.get("id") == cid:
                    c["name"] = str(body.get("name", c["name"])).strip()
                    c["description"] = str(body.get("description", c.get("description", ""))).strip()
            state["categories"] = cats
            save_cms_state(state)
            append_audit_log(actor_email, "UPDATE_CATEGORY", "categories", str(cid), "Memperbarui kategori artikel")
            return 200, {"ok": True}
        if action == "delete":
            cid = body.get("id")
            state["categories"] = [c for c in cats if c.get("id") != cid]
            save_cms_state(state)
            append_audit_log(actor_email, "DELETE_CATEGORY", "categories", str(cid), "Menghapus kategori artikel")
            return 200, {"ok": True}

    # 3. Manage Team Members (Edit existing 5 or Add/Delete custom member)
    if path == "/api/admin/team":
        action = body.get("action")
        if action == "update":
            slug = str(body.get("slug", "")).strip()
            if not slug:
                return 400, {"error": "Slug anggota tim tidak valid."}
            short_bio = str(body.get("shortBio", "")).strip()
            if len(short_bio) > 200:
                return 400, {"error": "Bio singkat maksimal 200 karakter sesuai PRD FR-3.2."}

            ov_data = {
                "fullName": str(body.get("fullName", "")).strip(),
                "honorific": str(body.get("honorific", "")).strip(),
                "roleTitle": str(body.get("roleTitle", "")).strip(),
                "group": str(body.get("group", "Associate")).strip(),
                "motto": str(body.get("motto", "")).strip() or None,
                "shortBio": short_bio,
                "fullBio": str(body.get("fullBio", "")).strip(),
                "education": [x.strip() for x in str(body.get("educationText", "")).split("\n") if x.strip()],
                "credentials": [x.strip() for x in str(body.get("credentialsText", "")).split("\n") if x.strip()],
                "languages": [x.strip() for x in str(body.get("languagesText", "")).split("\n") if x.strip()],
                "tags": [x.strip() for x in str(body.get("tagsText", "")).split(",") if x.strip()],
                "photoUrl": str(body.get("photoUrl", "")).strip(),
                "displayOrder": int(body.get("displayOrder", 1)),
                "isPublished": bool(body.get("isPublished", True)),
            }

            # Check if it's a custom member
            custom_list = state.get("customTeamMembers", [])
            updated_custom = False
            for cm in custom_list:
                if cm.get("slug") == slug:
                    cm.update(ov_data)
                    honor = ov_data["honorific"]
                    cm["displayName"] = f"{ov_data['fullName']}, {honor}" if honor else ov_data["fullName"]
                    cm["photo"] = {
                        "url": ov_data["photoUrl"] or "/team/ferdinan-hasiholan-silalahi.webp",
                        "srcSet": f"{ov_data['photoUrl'] or '/team/ferdinan-hasiholan-silalahi.webp'} 800w",
                        "width": 800,
                        "height": 1000,
                        "alt": f"Foto {cm['displayName']}",
                    }
                    updated_custom = True
                    break

            if not updated_custom:
                state.setdefault("teamOverrides", {})[slug] = ov_data
            else:
                state["customTeamMembers"] = custom_list

            save_cms_state(state)
            append_audit_log(actor_email, "UPDATE_TEAM_MEMBER", "team-members", slug, f"Memperbarui profil tim: {ov_data['fullName']}")
            return 200, {"ok": True}

        if action == "create":
            full_name = str(body.get("fullName", "")).strip()
            if not full_name:
                return 400, {"error": "Nama lengkap wajib diisi."}
            slug = "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in full_name).split()) or f"tim-{int(time.time())}"
            honor = str(body.get("honorific", "")).strip()
            display_name = f"{full_name}, {honor}" if honor else full_name
            photo_url = str(body.get("photoUrl", "")).strip() or "/team/basit-rezki.webp"
            short_bio = str(body.get("shortBio", "")).strip()[:200]
            new_member = {
                "id": f"team-{int(time.time() * 1000)}",
                "slug": slug,
                "fullName": full_name,
                "honorific": honor,
                "displayName": display_name,
                "roleTitle": str(body.get("roleTitle", "Associate")).strip(),
                "group": str(body.get("group", "Associate")).strip(),
                "motto": None,
                "shortBio": short_bio,
                "fullBio": str(body.get("fullBio", short_bio)).strip(),
                "education": [x.strip() for x in str(body.get("educationText", "")).split("\n") if x.strip()],
                "credentials": [x.strip() for x in str(body.get("credentialsText", "")).split("\n") if x.strip()],
                "languages": [x.strip() for x in str(body.get("languagesText", "")).split("\n") if x.strip()],
                "tags": [x.strip() for x in str(body.get("tagsText", "")).split(",") if x.strip()],
                "photo": {
                    "url": photo_url,
                    "srcSet": f"{photo_url} 800w",
                    "width": 800,
                    "height": 1000,
                    "alt": f"Foto {display_name}",
                },
                "displayOrder": int(body.get("displayOrder", 6)),
                "isPublished": True,
                "isCustom": True,
            }
            state.setdefault("customTeamMembers", []).append(new_member)
            save_cms_state(state)
            append_audit_log(actor_email, "CREATE_TEAM_MEMBER", "team-members", slug, f"Menambah anggota tim baru: {display_name}")
            return 200, {"ok": True}

        if action == "delete_custom":
            slug = str(body.get("slug", ""))
            state["customTeamMembers"] = [m for m in state.get("customTeamMembers", []) if m.get("slug") != slug]
            save_cms_state(state)
            append_audit_log(actor_email, "DELETE_TEAM_MEMBER", "team-members", slug, "Menghapus anggota tim tambahan")
            return 200, {"ok": True}

    # 4. Manage Practice Areas (Edit 10 areas or Add custom area)
    if path == "/api/admin/practice":
        action = body.get("action")
        if action == "update":
            slug = str(body.get("slug", "")).strip()
            ov_data = {
                "name": str(body.get("name", "")).strip(),
                "label": str(body.get("label", "")).strip().upper(),
                "image": str(body.get("image", "/images/practice-corporate.webp")).strip(),
                "summary": str(body.get("summary", "")).strip(),
                "description": str(body.get("description", "")).strip(),
                "advocacyScope": [x.strip() for x in str(body.get("scopeText", "")).split("\n") if x.strip()],
                "displayOrder": int(body.get("displayOrder", 1)),
                "isPublished": bool(body.get("isPublished", True)),
            }
            custom_areas = state.get("customPracticeAreas", [])
            updated_custom = False
            for ca in custom_areas:
                if ca.get("slug") == slug:
                    ca.update(ov_data)
                    updated_custom = True
                    break
            if not updated_custom:
                state.setdefault("practiceOverrides", {})[slug] = ov_data
            else:
                state["customPracticeAreas"] = custom_areas
            save_cms_state(state)
            append_audit_log(actor_email, "UPDATE_PRACTICE_AREA", "practice-areas", slug, f"Memperbarui bidang praktik: {ov_data['name']}")
            return 200, {"ok": True}

        if action == "create":
            name = str(body.get("name", "")).strip()
            if not name:
                return 400, {"error": "Nama bidang praktik wajib diisi."}
            slug = "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in name).split())
            new_area = {
                "id": f"practice-{int(time.time() * 1000)}",
                "slug": slug,
                "name": name,
                "label": str(body.get("label", "LAYANAN")).strip().upper(),
                "image": str(body.get("image", "/images/practice-corporate.webp")).strip(),
                "summary": str(body.get("summary", "")).strip(),
                "description": str(body.get("description", "")).strip(),
                "advocacyScope": [x.strip() for x in str(body.get("scopeText", "")).split("\n") if x.strip()],
                "icon": "",
                "displayOrder": int(body.get("displayOrder", 11)),
                "isPublished": True,
                "isCustom": True,
            }
            state.setdefault("customPracticeAreas", []).append(new_area)
            save_cms_state(state)
            append_audit_log(actor_email, "CREATE_PRACTICE_AREA", "practice-areas", slug, f"Menambah bidang praktik: {name}")
            return 200, {"ok": True}

    # 5. Manage Case Records (SK-14 Anonymity Guard enforced)
    if path == "/api/admin/cases":
        action = body.get("action")
        records = get_merged_case_records(include_unpublished=True)

        if action in ("create", "update"):
            display_mode = str(body.get("displayMode", "anonymous")).strip()
            client_name = str(body.get("clientName", "")).strip() or None
            consent_ref = str(body.get("consentRef", "")).strip() or None
            if display_mode == "named" and (not client_name or not consent_ref):
                return 400, {
                    "error": "Pelanggaran SK-14: Mode 'named' (bernama) wajib menyertakan Nama Klien dan Nomor Referensi Persetujuan Tertulis (consentRef). Gunakan mode 'anonymous'."
                }
            if display_mode == "anonymous":
                client_name = None
                consent_ref = None

            if action == "create":
                new_rec = {
                    "id": f"case-record-{int(time.time() * 1000)}",
                    "caseType": str(body.get("caseType", "")).strip(),
                    "region": str(body.get("region", "")).strip(),
                    "displayMode": display_mode,
                    "clientName": client_name,
                    "consentRef": consent_ref,
                    "displayOrder": int(body.get("displayOrder", len(records) + 1)),
                    "isPublished": bool(body.get("isPublished", True)),
                }
                records.append(new_rec)
                state["caseRecords"] = records
                save_cms_state(state)
                append_audit_log(actor_email, "CREATE_CASE_RECORD", "case-records", new_rec["id"], f"Menambah rekam jejak perkara ({display_mode})")
                return 200, {"ok": True}

            if action == "update":
                cid = str(body.get("id", ""))
                for r in records:
                    if r.get("id") == cid:
                        r["caseType"] = str(body.get("caseType", r["caseType"])).strip()
                        r["region"] = str(body.get("region", r["region"])).strip()
                        r["displayMode"] = display_mode
                        r["clientName"] = client_name
                        r["consentRef"] = consent_ref
                        r["displayOrder"] = int(body.get("displayOrder", r.get("displayOrder", 1)))
                        r["isPublished"] = bool(body.get("isPublished", True))
                state["caseRecords"] = records
                save_cms_state(state)
                append_audit_log(actor_email, "UPDATE_CASE_RECORD", "case-records", cid, "Memperbarui rekam jejak perkara")
                return 200, {"ok": True}

        if action == "delete":
            cid = str(body.get("id", ""))
            state["caseRecords"] = [r for r in records if r.get("id") != cid]
            save_cms_state(state)
            append_audit_log(actor_email, "DELETE_CASE_RECORD", "case-records", cid, "Menghapus rekam jejak perkara")
            return 200, {"ok": True}

    # 6. Media Upload (SEC-013: only image/jpeg, image/png, image/webp; SVG strictly rejected)
    if path == "/api/admin/media":
        mime_type = str(body.get("mimeType", "")).lower()
        filename = str(body.get("filename", "")).strip()
        data_b64 = str(body.get("dataBase64", "")).strip()

        if mime_type not in ("image/jpeg", "image/png", "image/webp") or filename.lower().endswith(".svg"):
            return 400, {"error": "SEC-013: Format file ditolak. Hanya JPEG, PNG, dan WebP yang diizinkan (SVG dilarang)."}

        raw_bytes = base64.b64decode(data_b64)
        if len(raw_bytes) > 5 * 1024 * 1024:
            return 400, {"error": "SEC-013: Ukuran file melebihi batas maksimal 5 MB."}

        ext = ".webp" if "webp" in mime_type else (".png" if "png" in mime_type else ".jpg")
        safe_stem = "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in Path(filename).stem).split()) or "media"
        new_name = f"{safe_stem}-{int(time.time())}{ext}"
        target_path = PUBLIC_DIR / "images" / new_name
        target_path.write_bytes(raw_bytes)
        append_audit_log(actor_email, "UPLOAD_MEDIA", "media", new_name, f"Mengunggah media baru ({mime_type}, {round(len(raw_bytes)/1024, 1)} KB)")
        return 200, {"ok": True, "url": f"/images/{new_name}"}

    # 7. Manage Users & Security (SEC-001)
    if path == "/api/admin/users":
        action = body.get("action")
        users = state.get("users", [])
        if action == "create":
            email = str(body.get("email", "")).strip().lower()
            password = str(body.get("password", ""))
            if len(password) < 12:
                return 400, {"error": "SEC-001: Kata sandi wajib minimal 12 karakter."}
            if any(u["email"].lower() == email for u in users):
                return 400, {"error": "Email pengguna sudah terdaftar."}
            new_user = {
                "id": f"user-{int(time.time() * 1000)}",
                "name": str(body.get("name", "")).strip(),
                "email": email,
                "role": "admin" if body.get("role") == "admin" else "editor",
                "mfaEnabled": bool(body.get("mfaEnabled", True)),
                "credDigest": hashlib.sha256(password.encode("utf-8")).hexdigest(),
                "createdAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
            users.append(new_user)
            state["users"] = users
            save_cms_state(state)
            append_audit_log(actor_email, "CREATE_USER", "users", new_user["id"], f"Menambah akun {new_user['role']}: {email}")
            return 200, {"ok": True}

        if action == "change_password":
            uid = str(body.get("id", ""))
            new_pw = str(body.get("newPassword", ""))
            if len(new_pw) < 12:
                return 400, {"error": "SEC-001: Kata sandi baru wajib minimal 12 karakter."}
            for u in users:
                if u.get("id") == uid:
                    u["credDigest"] = hashlib.sha256(new_pw.encode("utf-8")).hexdigest()
            state["users"] = users
            save_cms_state(state)
            append_audit_log(actor_email, "CHANGE_PASSWORD", "users", uid, "Mengubah kata sandi akun pengguna")
            return 200, {"ok": True}

        if action == "toggle_mfa":
            uid = str(body.get("id", ""))
            for u in users:
                if u.get("id") == uid:
                    u["mfaEnabled"] = not bool(u.get("mfaEnabled", True))
            state["users"] = users
            save_cms_state(state)
            append_audit_log(actor_email, "TOGGLE_MFA", "users", uid, "Mengubah status MFA pengguna")
            return 200, {"ok": True}

        if action == "delete":
            uid = str(body.get("id", ""))
            if len(users) <= 1:
                return 400, {"error": "Tidak dapat menghapus satu-satunya akun administrator."}
            state["users"] = [u for u in users if u.get("id") != uid]
            save_cms_state(state)
            append_audit_log(actor_email, "DELETE_USER", "users", uid, "Menghapus akun pengguna")
            return 200, {"ok": True}

    # 8. Manage Curated & Live Instagram Gallery (SK-13 / PRD V3)
    if path == "/api/admin/instagram/sync":
        token = str(body.get("accessToken", "")).strip()
        profile_url = str(body.get("profileUrl", "")).strip()
        settings = state.get("siteSettings", {})
        if profile_url:
            settings["instagramUrl"] = profile_url
        if token:
            settings["instagramAccessToken"] = token
        state["siteSettings"] = settings
        save_cms_state(state)

        ok, msg, items = sync_instagram_media(token)
        if ok:
            append_audit_log(actor_email, "SYNC_INSTAGRAM", "instagramGallery", "meta-api", f"Sinkronisasi live Meta Instagram Graph API ({len(items)} post)")
            return 200, {"ok": True, "message": msg, "count": len(items), "items": items}
        else:
            return 400, {"ok": False, "error": msg}

    if path == "/api/admin/instagram":
        action = body.get("action")
        gallery = state.get("instagramGallery") or list(DEFAULT_INSTAGRAM_GALLERY)

        if action == "create":
            new_id = f"ig-{int(time.time() * 1000)}"
            new_item = {
                "id": new_id,
                "imageUrl": str(body.get("imageUrl", "/images/hero-slide-courtroom.webp")).strip(),
                "alt": str(body.get("alt", "Edukasi Hukum FS dan Rekan")).strip(),
                "category": str(body.get("category", "Edukasi Hukum")).strip(),
                "caption": str(body.get("caption", "")).strip(),
                "publishedDate": str(body.get("publishedDate", "Baru saja")).strip(),
                "permalink": str(body.get("permalink", "https://instagram.com/")).strip(),
                "displayOrder": int(body.get("displayOrder", len(gallery) + 1)),
                "isPublished": bool(body.get("isPublished", True)),
            }
            gallery.append(new_item)
            state["instagramGallery"] = gallery
            save_cms_state(state)
            append_audit_log(actor_email, "CREATE_INSTAGRAM", "instagramGallery", new_id, f"Menambah postingan edukasi Instagram: {new_item['caption'][:40]}")
            return 200, {"ok": True, "item": new_item}

        if action == "update":
            target_id = str(body.get("id", "")).strip()
            found = False
            for it in gallery:
                if it.get("id") == target_id:
                    it["imageUrl"] = str(body.get("imageUrl", it.get("imageUrl"))).strip()
                    it["alt"] = str(body.get("alt", it.get("alt"))).strip()
                    it["category"] = str(body.get("category", it.get("category"))).strip()
                    it["caption"] = str(body.get("caption", it.get("caption"))).strip()
                    it["publishedDate"] = str(body.get("publishedDate", it.get("publishedDate"))).strip()
                    it["permalink"] = str(body.get("permalink", it.get("permalink"))).strip()
                    it["displayOrder"] = int(body.get("displayOrder", it.get("displayOrder", 1)))
                    it["isPublished"] = bool(body.get("isPublished", it.get("isPublished", True)))
                    found = True
                    break
            if not found:
                return 404, {"error": "Item Instagram tidak ditemukan."}
            state["instagramGallery"] = gallery
            save_cms_state(state)
            append_audit_log(actor_email, "UPDATE_INSTAGRAM", "instagramGallery", target_id, "Memperbarui postingan Instagram")
            return 200, {"ok": True}

        if action == "toggle_publish":
            target_id = str(body.get("id", "")).strip()
            for it in gallery:
                if it.get("id") == target_id:
                    it["isPublished"] = not it.get("isPublished", True)
                    break
            state["instagramGallery"] = gallery
            save_cms_state(state)
            append_audit_log(actor_email, "TOGGLE_INSTAGRAM_PUBLISH", "instagramGallery", target_id, "Mengubah status publikasi Instagram")
            return 200, {"ok": True}

        if action == "delete":
            target_id = str(body.get("id", "")).strip()
            state["instagramGallery"] = [it for it in gallery if it.get("id") != target_id]
            save_cms_state(state)
            append_audit_log(actor_email, "DELETE_INSTAGRAM", "instagramGallery", target_id, "Menghapus postingan Instagram")
            return 200, {"ok": True}

    # 9. Manage Guided Chat Sessions (SK-11 / UU PDP Erasure)
    if path == "/api/admin/chat-sessions":
        action = body.get("action")
        sessions = state.get("chatSessions") or []

        if action == "update_status":
            target_id = str(body.get("id", "")).strip()
            new_status = str(body.get("status", "baru")).strip()
            for s in sessions:
                if s.get("id") == target_id:
                    s["status"] = new_status
                    break
            state["chatSessions"] = sessions
            save_cms_state(state)
            append_audit_log(actor_email, "UPDATE_CHAT_STATUS", "chatSessions", target_id, f"Status chat diubah menjadi {new_status}")
            return 200, {"ok": True}

        if action == "delete":
            target_id = str(body.get("id", "")).strip()
            state["chatSessions"] = [s for s in sessions if s.get("id") != target_id]
            save_cms_state(state)
            append_audit_log(actor_email, "DELETE_CHAT_PDP", "chatSessions", target_id, "Penghapusan data transkrip chat pemandu sesuai hak penghapusan UU PDP")
            return 200, {"ok": True}

    return 404, {"error": "Endpoint admin tidak ditemukan."}


def render_enterprise_admin_dashboard(
    css: str,
    actor_email: str,
    all_articles: list[dict],
    inquiries: list[dict],
    clean_ui_fn,
    default_pres_by_slug: dict,
    instagram_items: list[dict] | None = None,
    chat_sessions: list[dict] | None = None,
) -> str:
    state = load_cms_state()
    settings = state["siteSettings"]
    categories = state.get("categories", [])
    team = get_merged_team_members(clean_ui_fn, include_unpublished=True)
    practices = get_merged_practice_areas(default_pres_by_slug, include_unpublished=True)
    cases = get_merged_case_records(include_unpublished=True)
    if instagram_items is None:
        instagram_items = get_merged_instagram_gallery(include_unpublished=True)
    if chat_sessions is None:
        chat_sessions = get_chat_sessions()
    media_files = list_public_media_files()
    users = state.get("users", [])
    audit_logs = state.get("auditLogs", [])

    pub_count = sum(1 for a in all_articles if a.get("status") == "published")
    draft_count = sum(1 for a in all_articles if a.get("status") == "draft")
    new_inq_count = sum(1 for i in inquiries if i.get("status", "baru") == "baru")

    cat_options_html = "".join(
        f'<option value="{html.escape(c["name"])}">{html.escape(c["name"])}</option>'
        for c in categories
    )
    media_options_html = "".join(
        f'<option value="{html.escape(m["url"])}">{html.escape(m["filename"])} ({html.escape(m["category"])})</option>'
        for m in media_files
    )

    # 1. Articles Table Rows
    article_rows_html = ""
    for art in all_articles:
        status = art.get("status", "published")
        badge_bg = "rgba(52, 211, 153, 0.16)" if status == "published" else "rgba(197, 168, 128, 0.2)"
        badge_color = "#34d399" if status == "published" else "var(--color-gold-strong)"
        badge_label = "TERBIT" if status == "published" else "DRAF"
        toggle_label = "Jadikan Draf" if status == "published" else "Terbitkan"
        toggle_next = "draft" if status == "published" else "published"
        view_url = f"/artikel/{art['slug']}?preview=1" if status == "draft" else f"/artikel/{art['slug']}"

        article_rows_html += f"""
        <div class="cms-item-card" data-status="{status}">
          <div style="display:flex;gap:16px;align-items:flex-start;">
            <img src="{html.escape(art.get('coverUrl', '/images/practice-corporate.webp'))}" alt="" width="96" height="60" style="object-fit:cover;border:1px solid var(--color-border-subtle);flex-shrink:0;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                <span class="cms-badge" style="background:{badge_bg};color:{badge_color};">{badge_label}</span>
                <span style="font-size:12px;color:var(--color-gold);">{html.escape(art.get('category', {}).get('name', 'Umum'))}</span>
                <span style="font-size:12px;color:var(--color-text-muted);">&middot; /{html.escape(art['slug'])}</span>
              </div>
              <h4 style="font-size:1.1rem;margin-bottom:4px;">{html.escape(art['title'])}</h4>
              <p style="font-size:13px;color:var(--color-text-muted);">{html.escape(art.get('excerpt', ''))}</p>
            </div>
          </div>
          <div class="cms-item-actions">
            <button type="button" class="btn-outline cms-btn-sm" onclick="openEditArticleModal('{art['id']}')">Edit Lengkap</button>
            <a href="{view_url}" target="_blank" class="btn-outline cms-btn-sm">Pratinjau &nearr;</a>
            <button type="button" class="btn-gold cms-btn-sm" onclick="toggleArticleStatus('{art['id']}', '{toggle_next}')">{toggle_label}</button>
            <button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteArticle('{art['id']}')">Hapus</button>
          </div>
        </div>"""

    # 2. Categories Rows
    category_rows_html = ""
    for c in categories:
        category_rows_html += f"""
        <div class="cms-item-card">
          <div>
            <div style="font-weight:700;color:var(--color-text);font-size:1rem;">{html.escape(c['name'])} <span style="font-size:12px;color:var(--color-gold);font-weight:400;">(/{html.escape(c['slug'])})</span></div>
            <div style="font-size:13px;color:var(--color-text-muted);">{html.escape(c.get('description', ''))}</div>
          </div>
          <div class="cms-item-actions">
            <button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteCategory('{c['id']}')">Hapus Kategori</button>
          </div>
        </div>"""

    # 3. Inquiries Rows
    inquiry_rows_html = ""
    if not inquiries:
        inquiry_rows_html = '<div class="cms-empty-box">Belum ada permohonan janji temu yang masuk. Pengunjung yang mengisi formulir di <a href="/#janji-temu" target="_blank" class="link-gold">Beranda (#janji-temu)</a> akan langsung tampil di sini.</div>'
    else:
        for inq in reversed(inquiries):
            st = inq.get("status", "baru")
            phone_digits = "".join(ch for ch in str(inq.get("phone", "")) if ch.isdigit())
            if phone_digits.startswith("0"):
                phone_digits = "62" + phone_digits[1:]
            wa_reply_msg = urllib.parse.quote(
                f"Halo Bapak/Ibu {inq.get('name', '')}, kami dari {settings['officialFirmName']} menindaklanjuti permohonan janji temu Anda untuk bidang {inq.get('practiceAreaId', '')} pada tanggal {inq.get('preferredDate', '')}."
            )
            wa_reply_url = f"https://wa.me/{phone_digits}?text={wa_reply_msg}"
            notes_val = html.escape(inq.get("internalNotes", ""))

            inquiry_rows_html += f"""
            <div class="cms-item-card cms-inquiry-item" data-inq-status="{st}" style="flex-direction:column;align-items:stretch;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <strong style="font-size:1.1rem;color:var(--color-text);">{html.escape(inq.get('name', ''))}</strong>
                    <span class="cms-badge" style="background:rgba(197,168,128,0.18);color:var(--color-gold-strong);">{html.escape(inq.get('practiceAreaId', ''))}</span>
                    <span style="font-size:12px;color:var(--color-text-muted);">ID: {html.escape(inq.get('id', ''))} &middot; Persetujuan PDP: {html.escape(str(inq.get('consentAt', ''))[:19])}</span>
                  </div>
                  <div style="font-size:13px;color:var(--color-text-secondary);margin-top:6px;">
                    Email: <strong>{html.escape(inq.get('email', ''))}</strong> &middot;
                    WhatsApp: <strong>{html.escape(inq.get('phone', ''))}</strong> &middot;
                    Jadwal: <strong>{html.escape(inq.get('preferredDate', ''))}</strong> ({html.escape(inq.get('sessionSlot', ''))} / {html.escape(inq.get('method', ''))})
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <select class="form-select" style="min-height:36px;padding:4px 10px;width:auto;font-size:12.5px;" onchange="updateInquiry('{inq.get('id', '')}', this.value, document.getElementById('note-{inq.get('id', '')}').value)">
                    <option value="baru" {"selected" if st=="baru" else ""}>Status: Baru</option>
                    <option value="dihubungi" {"selected" if st=="dihubungi" else ""}>Status: Dihubungi</option>
                    <option value="dijadwalkan" {"selected" if st=="dijadwalkan" else ""}>Status: Dijadwalkan</option>
                    <option value="selesai" {"selected" if st=="selesai" else ""}>Status: Selesai</option>
                    <option value="ditolak" {"selected" if st=="ditolak" else ""}>Status: Ditolak</option>
                  </select>
                  <a href="{wa_reply_url}" target="_blank" rel="noopener noreferrer" class="btn-gold cms-btn-sm">Balas via WA &nearr;</a>
                  <button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteInquiry('{inq.get('id', '')}')">Hapus (UU PDP)</button>
                </div>
              </div>
              <p style="font-size:13.5px;color:var(--color-text-secondary);background:var(--color-surface);padding:12px;border-left:2px solid var(--color-gold);margin:10px 0;">{html.escape(inq.get('summary', ''))}</p>
              <div style="display:flex;gap:8px;align-items:center;">
                <input id="note-{inq.get('id', '')}" type="text" class="form-input" style="min-height:36px;padding:6px 10px;font-size:12.5px;" placeholder="Catatan internal admin (mis. Advokat pendamping, hasil verifikasi konflik kepentingan)..." value="{notes_val}">
                <button type="button" class="btn-outline cms-btn-sm" onclick="updateInquiry('{inq.get('id', '')}', null, document.getElementById('note-{inq.get('id', '')}').value)">Simpan Catatan</button>
              </div>
            </div>"""

    # 4. Team Members Rows
    team_rows_html = ""
    for m in team:
        vis_badge = "TAMPIL" if m.get("isPublished", True) else "DISEMBUNYIKAN"
        vis_color = "#34d399" if m.get("isPublished", True) else "var(--color-danger)"
        del_btn = (
            f'<button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteCustomTeamMember(\'{m["slug"]}\')">Hapus</button>'
            if m.get("isCustom")
            else ""
        )
        team_rows_html += f"""
        <div class="cms-item-card">
          <div style="display:flex;gap:16px;align-items:center;">
            <img src="{html.escape(m['photo']['url'])}" alt="{html.escape(m['displayName'])}" width="64" height="80" style="object-fit:cover;border:1px solid var(--color-gold);">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span class="cms-badge" style="background:rgba(52,211,153,0.14);color:{vis_color};">#{m.get('displayOrder', 1)} &middot; {vis_badge}</span>
                <span style="font-size:12px;color:var(--color-gold-strong);font-weight:700;">{html.escape(m['roleTitle'])}</span>
              </div>
              <h4 style="font-size:1.15rem;margin-bottom:4px;">{html.escape(m['displayName'])}</h4>
              <p style="font-size:13px;color:var(--color-text-muted);">{html.escape(m['shortBio'])}</p>
            </div>
          </div>
          <div class="cms-item-actions">
            <button type="button" class="btn-gold cms-btn-sm" onclick="openEditTeamModal('{m['slug']}')">Edit Profil Lengkap</button>
            {del_btn}
          </div>
        </div>"""

    # 5. Practice Areas Rows
    practice_rows_html = ""
    for a in practices:
        vis_badge = "AKTIF" if a.get("isPublished", True) else "NONAKTIF"
        scope_preview = " &bull; ".join(html.escape(s) for s in a.get("advocacyScope", [])[:3])
        practice_rows_html += f"""
        <div class="cms-item-card">
          <div style="display:flex;gap:16px;align-items:center;">
            <img src="{html.escape(a.get('image', '/images/practice-corporate.webp'))}" alt="" width="88" height="60" style="object-fit:cover;border:1px solid var(--color-border-subtle);">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span class="cms-badge" style="background:rgba(197,168,128,0.2);color:var(--color-gold-strong);">#{a.get('displayOrder', 1)} &middot; {html.escape(a.get('label', ''))}</span>
                <span style="font-size:11px;color:#34d399;font-weight:700;">{vis_badge}</span>
              </div>
              <h4 style="font-size:1.1rem;margin-bottom:3px;">{html.escape(a['name'])}</h4>
              <p style="font-size:12.5px;color:var(--color-text-muted);">{html.escape(a.get('summary', ''))}</p>
              <div style="font-size:11.5px;color:var(--color-gold);margin-top:4px;">{scope_preview}</div>
            </div>
          </div>
          <div class="cms-item-actions">
            <button type="button" class="btn-gold cms-btn-sm" onclick="openEditPracticeModal('{a['slug']}')">Edit Bidang &amp; Cakupan</button>
          </div>
        </div>"""

    # 6. Case Records Rows (SK-14)
    case_rows_html = ""
    for r in cases:
        mode = r.get("displayMode", "anonymous")
        mode_badge = "ANONIM (SK-14)" if mode == "anonymous" else f"BERNAMA (Ref: {html.escape(str(r.get('consentRef', '')))})"
        case_rows_html += f"""
        <div class="cms-item-card">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span class="cms-badge" style="background:rgba(197,168,128,0.18);color:var(--color-gold-strong);">#{r.get('displayOrder', 1)} &middot; {html.escape(r.get('region', ''))}</span>
              <span class="cms-badge" style="background:rgba(52,211,153,0.14);color:#34d399;">{mode_badge}</span>
            </div>
            <h4 style="font-size:1.05rem;">{html.escape(r.get('caseType', ''))}</h4>
          </div>
          <div class="cms-item-actions">
            <button type="button" class="btn-outline cms-btn-sm" onclick="openEditCaseModal('{r['id']}')">Edit</button>
            <button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteCaseRecord('{r['id']}')">Hapus</button>
          </div>
        </div>"""

    # 7. Media Library Grid
    media_cards_html = ""
    for mf in media_files:
        media_cards_html += f"""
        <div style="background:var(--color-bg);border:1px solid var(--color-border-subtle);padding:12px;display:flex;flex-direction:column;gap:8px;">
          <div style="aspect-ratio:16/10;background:var(--bg-photo-well);overflow:hidden;">
            <img src="{html.escape(mf['url'])}" alt="{html.escape(mf['filename'])}" style="width:100%;height:100%;object-fit:cover;">
          </div>
          <div style="font-size:12.5px;font-weight:700;color:var(--color-text);word-break:break-all;">{html.escape(mf['filename'])}</div>
          <div style="font-size:11.5px;color:var(--color-text-muted);">{html.escape(mf['category'])} &middot; {mf['sizeKb']} KB</div>
          <button type="button" class="btn-outline cms-btn-sm" onclick="navigator.clipboard.writeText('{mf['url']}');showToast('URL disalin: {mf['url']}')">Salin Path URL</button>
        </div>"""

    # 8. Users & Security Rows
    user_rows_html = ""
    for u in users:
        mfa_label = "MFA Aktif" if u.get("mfaEnabled") else "MFA Nonaktif"
        mfa_color = "#34d399" if u.get("mfaEnabled") else "var(--color-danger)"
        user_rows_html += f"""
        <div class="cms-item-card">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <strong style="color:var(--color-text);">{html.escape(u['name'])}</strong>
              <span class="cms-badge" style="background:rgba(197,168,128,0.2);color:var(--color-gold-strong);">{html.escape(u['role'].upper())}</span>
              <span class="cms-badge" style="background:rgba(52,211,153,0.14);color:{mfa_color};">{mfa_label}</span>
            </div>
            <div style="font-size:13px;color:var(--color-text-muted);">{html.escape(u['email'])} &middot; Dibuat: {html.escape(u.get('createdAt', '')[:10])}</div>
          </div>
          <div class="cms-item-actions">
            <button type="button" class="btn-outline cms-btn-sm" onclick="toggleUserMfa('{u['id']}')">Ubah Status MFA</button>
            <button type="button" class="btn-outline cms-btn-sm" onclick="promptChangePassword('{u['id']}', '{html.escape(u['email'])}')">Ganti Sandi</button>
            <button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteUserAccount('{u['id']}')">Hapus</button>
          </div>
        </div>"""

    # 9. Audit Logs Table
    audit_rows_html = ""
    for log in audit_logs[:40]:
        audit_rows_html += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid var(--color-border-subtle);font-size:12px;color:var(--color-text-muted);white-space:nowrap;">{html.escape(log.get('timestamp', ''))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid var(--color-border-subtle);font-size:12.5px;color:var(--color-gold-strong);font-weight:600;">{html.escape(log.get('actor', ''))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid var(--color-border-subtle);font-size:12px;"><span class="cms-badge" style="background:var(--color-surface-2);color:var(--color-text);">{html.escape(log.get('action', ''))}</span></td>
          <td style="padding:10px 12px;border-bottom:1px solid var(--color-border-subtle);font-size:12.5px;color:var(--color-text-secondary);">{html.escape(log.get('collection', ''))} ({html.escape(log.get('targetId', ''))})</td>
          <td style="padding:10px 12px;border-bottom:1px solid var(--color-border-subtle);font-size:12.5px;color:var(--color-text);">{html.escape(log.get('detail', ''))}</td>
        </tr>"""

    # 10. Guided Chat Sessions Rows (SK-11 / UU PDP)
    chat_rows_html = ""
    if not chat_sessions:
        chat_rows_html = '<div class="cms-empty-box" style="padding:28px;text-align:center;background:var(--color-bg);border:1px dashed var(--color-border-subtle);color:var(--color-text-muted);">Belum ada transkrip sesi chat pemandu yang tersimpan. Pengunjung yang menyelesaikan formulir pada widget chat pemandu di beranda akan tercatat di sini.</div>'
    else:
        for s in chat_sessions:
            st = s.get("status", "baru")
            phone_digits = "".join(ch for ch in str(s.get("visitorPhone", "")) if ch.isdigit())
            if phone_digits.startswith("0"):
                phone_digits = "62" + phone_digits[1:]
            sid = html.escape(s.get("id", ""))
            created_label = html.escape(s.get("createdAt", "")[:19].replace("T", " "))
            wa_text = urllib.parse.quote(
                f"Halo Bapak/Ibu {s.get('visitorName', '')}, kami dari {settings['officialFirmName']} menindaklanjuti konsultasi chat terpandu Anda terkait bidang {s.get('practiceArea', '')}."
            )
            direct_wa_client = f"https://wa.me/{phone_digits}?text={wa_text}"
            chat_rows_html += f"""
            <div class="cms-item-card cms-chat-item" data-chat-status="{st}" style="flex-direction:column;align-items:stretch;background:var(--color-bg);padding:18px;border:1px solid var(--color-border-subtle);margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <strong style="font-size:1.1rem;color:var(--color-text);">{html.escape(s.get('visitorName', ''))}</strong>
                    <span class="cms-badge" style="background:rgba(197,168,128,0.18);color:var(--color-gold-strong);">{html.escape(s.get('practiceArea', ''))}</span>
                    <span style="font-size:12px;color:var(--color-text-muted);">ID: {sid} &middot; {created_label}</span>
                  </div>
                  <div style="font-size:13px;color:var(--color-text-secondary);margin-top:6px;">
                    Nomor WhatsApp: <strong>{html.escape(s.get('visitorPhone', ''))}</strong> &middot; Jadwal Pilihan: <strong>{html.escape(s.get('preferredSchedule', ''))}</strong>
                  </div>
                  <div style="font-size:12px;color:var(--color-gold-strong);margin-top:4px;">
                    Persetujuan Pemrosesan Data (UU PDP): Disetujui ({html.escape(s.get('consentAt', '')[:19].replace('T', ' '))})
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <select class="form-select cms-btn-sm" style="width:auto;min-height:34px;padding:4px 8px;font-size:12px;" onchange="updateChatSessionStatus('{sid}', this.value)">
                    <option value="baru" {'selected' if st == 'baru' else ''}>Status: Baru</option>
                    <option value="dihubungi" {'selected' if st == 'dihubungi' else ''}>Status: Dihubungi</option>
                    <option value="selesai" {'selected' if st == 'selesai' else ''}>Status: Selesai</option>
                  </select>
                  <a href="{direct_wa_client}" target="_blank" rel="noopener noreferrer" class="btn-gold cms-btn-sm">Hubungi WA &rarr;</a>
                  <button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteChatSessionPdp('{sid}')">Hapus (UU PDP)</button>
                </div>
              </div>
              <div style="margin-top:12px;padding:12px 14px;background:var(--color-surface);border-left:3px solid var(--color-gold);font-size:13.5px;color:var(--color-text-secondary);line-height:1.6;">
                <strong>Ringkasan Kebutuhan Hukum:</strong><br>
                {html.escape(s.get('notes', ''))}
              </div>
            </div>"""

    # 11. Instagram Gallery Cards (SK-13 / PRD V3)
    has_ig_token = bool(settings.get("instagramAccessToken"))
    ig_status_badge = (
        '<span class="cms-badge" style="background:#14532d;color:#86efac;font-size:12px;padding:3px 10px;">🟢 Terhubung ke Meta Instagram Graph API</span>'
        if has_ig_token
        else '<span class="cms-badge" style="background:#451a03;color:#fdba74;font-size:12px;padding:3px 10px;">🟡 Mode Kurasi / Menunggu Token Instagram</span>'
    )
    instagram_cards_html = ""
    for item in instagram_items:
        iid = html.escape(item.get("id", ""))
        status_badge = (
            '<span class="cms-badge" style="background:#14532d;color:#86efac;">Terbit</span>'
            if item.get("isPublished", True)
            else '<span class="cms-badge" style="background:#451a03;color:#fdba74;">Draf</span>'
        )
        instagram_cards_html += f"""
        <div class="cms-item-card" style="flex-direction:column;align-items:stretch;background:var(--color-bg);padding:14px;border:1px solid var(--color-border-subtle);">
          <div style="position:relative;width:100%;height:180px;background:var(--bg-photo-well);overflow:hidden;margin-bottom:12px;">
            <img src="{item.get('imageUrl', '')}" alt="{html.escape(item.get('alt', ''))}" style="width:100%;height:100%;object-fit:cover;">
            <div style="position:absolute;top:8px;right:8px;">{status_badge}</div>
            <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.75);padding:2px 8px;border-radius:2px;font-size:11px;color:var(--color-gold-strong);">{html.escape(item.get('category', ''))}</div>
          </div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">
            Urutan: #{item.get('displayOrder', 1)} &middot; {html.escape(item.get('publishedDate', ''))}
          </div>
          <p style="font-size:13.5px;color:var(--color-text);line-height:1.5;margin-bottom:14px;min-height:58px;">
            {html.escape(item.get('caption', ''))}
          </p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:auto;">
            <button type="button" class="btn-outline cms-btn-sm" onclick="openEditInstagramModal('{iid}')">Edit Post</button>
            <button type="button" class="btn-outline cms-btn-sm" onclick="toggleInstagramPublish('{iid}')">{'Sembunyikan' if item.get('isPublished', True) else 'Terbitkan'}</button>
            <button type="button" class="btn-outline cms-btn-sm cms-btn-danger" onclick="deleteInstagramItem('{iid}')">Hapus</button>
          </div>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dasbor Pengelolaan Website &mdash; Panel Admin CMS | {html.escape(settings['officialFirmName'])}</title>
  <link rel="icon" href="/favicon.ico">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    {css}
    .cms-layout {{
      display: grid;
      grid-template-columns: 270px 1fr;
      min-height: calc(100vh - 73px);
    }}
    .cms-sidebar {{
      background-color: var(--color-bg-darker);
      border-right: 1px solid var(--color-border-subtle);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: sticky;
      top: 73px;
      height: calc(100vh - 73px);
      overflow-y: auto;
    }}
    .cms-nav-group-label {{
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      padding: 12px 12px 4px;
    }}
    .cms-nav-btn {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 11px 14px;
      background: transparent;
      border: 1px solid transparent;
      border-left: 3px solid transparent;
      color: var(--color-text-secondary);
      font-size: 13.5px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
    }}
    .cms-nav-btn:hover {{
      background-color: var(--color-surface);
      color: var(--color-gold-strong);
    }}
    .cms-nav-btn.is-active {{
      background-color: var(--color-surface-2);
      color: var(--color-gold-strong);
      border-left-color: var(--color-gold);
      border-color: var(--color-border-subtle);
    }}
    .cms-nav-count {{
      font-size: 11px;
      padding: 2px 7px;
      background: var(--color-bg);
      color: var(--color-gold);
      border: 1px solid var(--color-border-subtle);
    }}
    .cms-main {{
      padding: 36px 44px;
      background-color: var(--color-bg);
      overflow-x: hidden;
    }}
    .cms-tab-pane {{
      display: none;
    }}
    .cms-tab-pane.is-active {{
      display: block;
      animation: modalDialogEnter 0.28s var(--ease) forwards;
    }}
    .cms-panel-box {{
      background-color: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-top: 2px solid var(--color-gold);
      padding: 28px;
      margin-bottom: 28px;
    }}
    .cms-item-card {{
      padding: 18px 20px;
      background-color: var(--color-bg);
      border: 1px solid var(--color-border-subtle);
      border-left: 3px solid var(--color-gold);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }}
    .cms-item-card:hover {{
      border-color: var(--color-gold-dark);
    }}
    .cms-item-actions {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }}
    .cms-btn-sm {{
      min-height: 36px;
      padding: 7px 14px;
      font-size: 12.5px;
    }}
    .cms-btn-danger {{
      border-color: var(--color-danger) !important;
      color: var(--color-danger) !important;
    }}
    .cms-badge {{
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      letter-spacing: 0.04em;
    }}
    .cms-empty-box {{
      padding: 24px;
      background: var(--color-bg);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-muted);
    }}
    .cms-toast {{
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 3000;
      background: var(--color-surface-2);
      border: 1px solid var(--color-gold);
      border-left: 4px solid var(--color-gold);
      color: var(--color-text);
      padding: 14px 22px;
      box-shadow: var(--shadow-lg);
      font-size: 13.5px;
      font-weight: 600;
      display: none;
    }}
    @media (max-width: 1024px) {{
      .cms-layout {{
        grid-template-columns: 1fr;
      }}
      .cms-sidebar {{
        position: static;
        height: auto;
        flex-direction: row;
        flex-wrap: wrap;
      }}
      .cms-nav-btn {{
        width: auto;
      }}
      .cms-main {{
        padding: 24px 20px;
      }}
    }}
  </style>
</head>
<body>
  <header class="site-header" style="position:sticky;top:0;z-index:1200;">
    <div class="container nav-wrapper" style="max-width:100%;padding:0 28px;">
      <div class="brand-link">
        <img src="/logo-seal-transparent.png" alt="Logo" class="brand-logo-img" width="42" height="42">
        <div>
          <div class="brand-text-name">PAYLOAD CMS &mdash; {html.escape(settings['shortBrandName'])}</div>
          <div class="brand-text-sub">Sesi Aktif: {html.escape(actor_email)} (Role: Administrator)</div>
        </div>
      </div>
      <div class="header-cta-group">
        <a href="/" target="_blank" class="btn-outline cms-btn-sm">Buka Website Publik &nearr;</a>
        <a href="/artikel" target="_blank" class="btn-outline cms-btn-sm">Halaman Artikel &nearr;</a>
        <a href="/admin/logout" class="btn-gold cms-btn-sm">Keluar (Logout)</a>
      </div>
    </div>
  </header>

  <div class="cms-layout">
    <!-- Left Sidebar Navigation (12 Enterprise Modules) -->
    <aside class="cms-sidebar" aria-label="Menu Navigasi CMS">
      <div class="cms-nav-group-label">Ikhtisar &amp; Publikasi</div>
      <button type="button" class="cms-nav-btn is-active" data-tab="tab-dashboard" onclick="switchCmsTab('tab-dashboard')">
        <span>1. Dasbor Utama</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-articles" onclick="switchCmsTab('tab-articles')">
        <span>2. Artikel &amp; Wawasan</span>
        <span class="cms-nav-count">{len(all_articles)}</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-categories" onclick="switchCmsTab('tab-categories')">
        <span>3. Kategori Artikel</span>
        <span class="cms-nav-count">{len(categories)}</span>
      </button>

      <div class="cms-nav-group-label">Layanan Klien</div>
      <button type="button" class="cms-nav-btn" data-tab="tab-inquiries" onclick="switchCmsTab('tab-inquiries')">
        <span>4. Permohonan Janji Temu</span>
        <span class="cms-nav-count">{len(inquiries)}</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-chat" onclick="switchCmsTab('tab-chat')">
        <span>5. Chat Pemandu (SK-11)</span>
        <span class="cms-nav-count">{len(chat_sessions)}</span>
      </button>

      <div class="cms-nav-group-label">Konten Firma &amp; Portofolio</div>
      <button type="button" class="cms-nav-btn" data-tab="tab-team" onclick="switchCmsTab('tab-team')">
        <span>6. Profil Tim &amp; Partner</span>
        <span class="cms-nav-count">{len(team)}</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-practices" onclick="switchCmsTab('tab-practices')">
        <span>7. 10 Bidang Praktik</span>
        <span class="cms-nav-count">{len(practices)}</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-cases" onclick="switchCmsTab('tab-cases')">
        <span>8. Rekam Jejak Perkara</span>
        <span class="cms-nav-count">{len(cases)}</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-instagram" onclick="switchCmsTab('tab-instagram')">
        <span>9. Galeri Instagram (SK-13)</span>
        <span class="cms-nav-count">{len(instagram_items)}</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-media" onclick="switchCmsTab('tab-media')">
        <span>10. Pustaka Media</span>
        <span class="cms-nav-count">{len(media_files)}</span>
      </button>

      <div class="cms-nav-group-label">Konfigurasi &amp; Keamanan</div>
      <button type="button" class="cms-nav-btn" data-tab="tab-settings" onclick="switchCmsTab('tab-settings')">
        <span>11. Pengaturan Situs &amp; SEO</span>
      </button>
      <button type="button" class="cms-nav-btn" data-tab="tab-security" onclick="switchCmsTab('tab-security')">
        <span>12. Pengguna &amp; Log Audit</span>
        <span class="cms-nav-count">{len(audit_logs)}</span>
      </button>
    </aside>

    <!-- Main Content Area -->
    <main class="cms-main">
      <div class="eyebrow-tag">SISTEM MANAJEMEN KONTEN &amp; KONFIGURASI FIRMA</div>
      <h1 style="margin-bottom:24px;font-size:2.1rem;">Dasbor Pengelolaan Website</h1>

      <!-- TAB 1: DASHBOARD OVERVIEW -->
      <section id="tab-dashboard" class="cms-tab-pane is-active">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:32px;">
          <div class="cred-box" style="cursor:pointer;" onclick="switchCmsTab('tab-articles')">
            <div class="trust-stat-num">{pub_count} Terbit / {draft_count} Draf</div>
            <div class="cred-title">Artikel &amp; Publikasi</div>
            <div class="cred-desc">Klik untuk menulis atau mengedit kajian hukum</div>
          </div>
          <div class="cred-box" style="cursor:pointer;" onclick="switchCmsTab('tab-inquiries')">
            <div class="trust-stat-num">{len(inquiries)} ({new_inq_count} Baru)</div>
            <div class="cred-title">Permohonan Janji Temu</div>
            <div class="cred-desc">Klik untuk menindaklanjuti jadwal klien</div>
          </div>
          <div class="cred-box" style="cursor:pointer;" onclick="switchCmsTab('tab-chat')">
            <div class="trust-stat-num">{len(chat_sessions)} Sesi</div>
            <div class="cred-title">Chat Pemandu (SK-11)</div>
            <div class="cred-desc">Transkrip konsultasi &amp; kepatuhan UU PDP</div>
          </div>
          <div class="cred-box" style="cursor:pointer;" onclick="switchCmsTab('tab-team')">
            <div class="trust-stat-num">{len(team)} Profil</div>
            <div class="cred-title">Founder &amp; Tim Advokat</div>
            <div class="cred-desc">Kelola gelar, jabatan, bio &amp; foto 4:5</div>
          </div>
          <div class="cred-box" style="cursor:pointer;" onclick="switchCmsTab('tab-practices')">
            <div class="trust-stat-num">{len(practices)} Bidang</div>
            <div class="cred-title">Bidang Praktik Layanan</div>
            <div class="cred-desc">Kelola deskripsi &amp; cakupan advokasi</div>
          </div>
          <div class="cred-box" style="cursor:pointer;" onclick="switchCmsTab('tab-cases')">
            <div class="trust-stat-num">{len(cases)} Perkara</div>
            <div class="cred-title">Rekam Jejak (SK-14)</div>
            <div class="cred-desc">Portofolio penanganan perkara anonim</div>
          </div>
          <div class="cred-box" style="cursor:pointer;" onclick="switchCmsTab('tab-instagram')">
            <div class="trust-stat-num">{len(instagram_items)} Post</div>
            <div class="cred-title">Galeri Instagram (SK-13)</div>
            <div class="cred-desc">Edukasi hukum &amp; publikasi media sosial</div>
          </div>
        </div>

        <div class="docket-booking-grid" style="margin-top:0;">
          <div class="cms-panel-box">
            <h3 style="margin-bottom:14px;">Pintasan Pengelolaan Cepat</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <button type="button" class="btn-gold cms-btn-sm" onclick="switchCmsTab('tab-articles');openNewArticleModal()">+ Tulis Artikel Baru</button>
              <button type="button" class="btn-outline cms-btn-sm" onclick="switchCmsTab('tab-chat')">Lihat Sesi Chat Pemandu</button>
              <button type="button" class="btn-outline cms-btn-sm" onclick="switchCmsTab('tab-team')">Edit Profil Tim &amp; Gelar</button>
              <button type="button" class="btn-outline cms-btn-sm" onclick="switchCmsTab('tab-practices')">Edit 10 Bidang Praktik</button>
              <button type="button" class="btn-outline cms-btn-sm" onclick="switchCmsTab('tab-instagram')">Kelola Galeri Instagram</button>
              <button type="button" class="btn-outline cms-btn-sm" onclick="switchCmsTab('tab-settings')">Ubah Teks Beranda &amp; Kontak WA</button>
              <button type="button" class="btn-outline cms-btn-sm" onclick="switchCmsTab('tab-cases')">Kelola Rekam Jejak Perkara</button>
              <button type="button" class="btn-outline cms-btn-sm" onclick="switchCmsTab('tab-media')">Buka Pustaka Media &amp; Upload</button>
            </div>
          </div>

          <div class="cms-panel-box">
            <h3 style="margin-bottom:12px;">Aktivitas Audit Terakhir (SEC-002 / SEC-014)</h3>
            <div style="font-size:13px;color:var(--color-text-secondary);display:flex;flex-direction:column;gap:8px;">
              {"".join(f'<div style="padding:8px 10px;background:var(--color-bg);border-left:2px solid var(--color-gold);"><strong>{html.escape(l["action"])}</strong> &mdash; {html.escape(l["detail"])} <span style="color:var(--color-text-muted);font-size:11.5px;">({html.escape(l["timestamp"])})</span></div>' for l in audit_logs[:5])}
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 2: ARTICLES MANAGEMENT -->
      <section id="tab-articles" class="cms-tab-pane">
        <div class="cms-panel-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <h2>Manajemen Artikel &amp; Kajian Hukum ({len(all_articles)})</h2>
              <p style="font-size:13.5px;color:var(--color-text-muted);">Kelola publikasi edukasi hukum, draf internal, gambar sampul, dan metadata SEO.</p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <select class="form-select cms-btn-sm" style="width:auto;" onchange="filterArticlesByStatus(this.value)">
                <option value="all">Semua Status ({len(all_articles)})</option>
                <option value="published">Terbit ({pub_count})</option>
                <option value="draft">Draf ({draft_count})</option>
              </select>
              <button type="button" class="btn-gold cms-btn-sm" onclick="openNewArticleModal()">+ Tulis Artikel Baru</button>
            </div>
          </div>
          <div id="cmsArticleList">
            {article_rows_html}
          </div>
        </div>
      </section>

      <!-- TAB 3: CATEGORIES MANAGEMENT -->
      <section id="tab-categories" class="cms-tab-pane">
        <div class="docket-booking-grid" style="margin-top:0;">
          <div class="cms-panel-box">
            <h3 style="margin-bottom:14px;">Tambah Kategori Artikel Baru</h3>
            <form onsubmit="submitCategoryForm(event)">
              <div class="form-group">
                <label class="form-label">Nama Kategori</label>
                <input id="catNameInput" type="text" class="form-input" required placeholder="Contoh: Hukum Persaingan Usaha">
              </div>
              <div class="form-group">
                <label class="form-label">Deskripsi Kategori</label>
                <textarea id="catDescInput" class="form-textarea" rows="3" placeholder="Penjelasan singkat ruang lingkup topik kategori..."></textarea>
              </div>
              <button type="submit" class="btn-gold full-width-btn">Tambah Kategori &rarr;</button>
            </form>
          </div>
          <div class="cms-panel-box">
            <h3 style="margin-bottom:14px;">Daftar Kategori Aktif ({len(categories)})</h3>
            {category_rows_html}
          </div>
        </div>
      </section>

      <!-- TAB 4: CONSULTATION INQUIRIES -->
      <section id="tab-inquiries" class="cms-tab-pane">
        <div class="cms-panel-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <h2>Daftar Permohonan Janji Temu ({len(inquiries)})</h2>
              <p style="font-size:13.5px;color:var(--color-text-muted);">Seluruh permohonan dari formulir konsultasi beserta catatan tindak lanjut advokat dan kepatuhan UU PDP.</p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <select class="form-select cms-btn-sm" style="width:auto;" onchange="filterInquiriesByStatus(this.value)">
                <option value="all">Semua Status ({len(inquiries)})</option>
                <option value="baru">Baru</option>
                <option value="dihubungi">Dihubungi</option>
                <option value="dijadwalkan">Dijadwalkan</option>
                <option value="selesai">Selesai</option>
                <option value="ditolak">Ditolak</option>
              </select>
              <button type="button" class="btn-outline cms-btn-sm" onclick="exportInquiriesCsv()">Ekspor CSV &darr;</button>
            </div>
          </div>
          <div id="cmsInquiryList">
            {inquiry_rows_html}
          </div>
        </div>
      </section>

      <!-- TAB 5: GUIDED CHAT SESSIONS (SK-11 / UU PDP) -->
      <section id="tab-chat" class="cms-tab-pane">
        <div class="cms-panel-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <h2>Sesi Chat Pemandu Konsultasi ({len(chat_sessions)})</h2>
              <p style="font-size:13.5px;color:var(--color-text-muted);">Transkrip kebutuhan awal klien dari widget chat terpandu di beranda publik. Hak penghapusan data pribadi (right to erasure) dijamin sesuai UU PDP.</p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <select class="form-select cms-btn-sm" style="width:auto;" onchange="filterChatSessionsByStatus(this.value)">
                <option value="all">Semua Status ({len(chat_sessions)})</option>
                <option value="baru">Baru</option>
                <option value="dihubungi">Dihubungi</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
          </div>
          <div id="cmsChatList">
            {chat_rows_html}
          </div>
        </div>
      </section>

      <!-- TAB 5: TEAM PROFILES MANAGEMENT -->
      <section id="tab-team" class="cms-tab-pane">
        <div class="cms-panel-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <h2>Manajemen Profil Pendiri &amp; Tim ({len(team)} Profil)</h2>
              <p style="font-size:13.5px;color:var(--color-text-muted);">Edit nama, gelar akademik (mis. S.H., M.H.), jabatan, urutan tampil, bio singkat (&le; 200 karakter), bio lengkap, pendidikan, kredensial, dan foto.</p>
            </div>
            <button type="button" class="btn-gold cms-btn-sm" onclick="openNewTeamModal()">+ Tambah Anggota Tim</button>
          </div>
          {team_rows_html}
        </div>
      </section>

      <!-- TAB 6: 10 PRACTICE AREAS MANAGEMENT -->
      <section id="tab-practices" class="cms-tab-pane">
        <div class="cms-panel-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <h2>Manajemen Bidang Praktik Layanan ({len(practices)} Bidang)</h2>
              <p style="font-size:13.5px;color:var(--color-text-muted);">Kelola judul layanan, label badge, ilustrasi panggung, ringkasan, dan daftar butir Cakupan Advokasi.</p>
            </div>
            <button type="button" class="btn-gold cms-btn-sm" onclick="openNewPracticeModal()">+ Tambah Bidang Praktik</button>
          </div>
          {practice_rows_html}
        </div>
      </section>

      <!-- TAB 7: CASE RECORDS MANAGEMENT (SK-14) -->
      <section id="tab-cases" class="cms-tab-pane">
        <div class="docket-booking-grid" style="margin-top:0;">
          <div class="cms-panel-box">
            <h3 style="margin-bottom:10px;">Tambah / Edit Rekam Jejak Perkara (SK-14)</h3>
            <p style="font-size:12.5px;color:var(--color-text-muted);margin-bottom:16px;">
              Sesuai aturan keras #4 (<code>AGENTS.md</code> &amp; <code>SK-14</code>), identitas klien wajib default <strong>Anonim</strong>. Mode Bernama hanya diizinkan bila Nomor Referensi Persetujuan Tertulis diisi.
            </p>
            <form onsubmit="submitCaseForm(event)">
              <input id="caseIdInput" type="hidden" value="">
              <div class="form-group">
                <label class="form-label">Jenis / Pokok Perkara</label>
                <input id="caseTypeInput" type="text" class="form-input" required placeholder="Contoh: Sengketa Kepemilikan Lahan Komersial">
              </div>
              <div class="form-row-duo">
                <div class="form-group">
                  <label class="form-label">Wilayah Yurisdiksi</label>
                  <input id="caseRegionInput" type="text" class="form-input" required placeholder="Contoh: Jakarta Pusat">
                </div>
                <div class="form-group">
                  <label class="form-label">Urutan Tampil</label>
                  <input id="caseOrderInput" type="number" class="form-input" value="{len(cases) + 1}" min="1">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Mode Tampilan Publik (SK-14)</label>
                <select id="caseModeInput" class="form-select" onchange="document.getElementById('namedConsentFields').style.display = this.value==='named' ? 'block' : 'none'">
                  <option value="anonymous">Anonim (Rekomendasi Default Kode Etik)</option>
                  <option value="named">Bernama (Wajib Bukti Persetujuan Tertulis Klien)</option>
                </select>
              </div>
              <div id="namedConsentFields" style="display:none;padding:12px;background:var(--color-bg);border-left:2px solid var(--color-gold);margin-bottom:16px;">
                <div class="form-group">
                  <label class="form-label">Nama Klien (Hanya bila ada izin tertulis)</label>
                  <input id="caseClientInput" type="text" class="form-input" placeholder="Nama Klien / Korporasi">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Nomor Referensi Surat Persetujuan (consentRef)</label>
                  <input id="caseConsentRefInput" type="text" class="form-input" placeholder="Contoh: SK-CONSENT/2026/014">
                </div>
              </div>
              <div style="display:flex;gap:10px;">
                <button type="submit" class="btn-gold full-width-btn">Simpan Perkara &rarr;</button>
                <button type="button" class="btn-outline" onclick="resetCaseForm()">Reset</button>
              </div>
            </form>
          </div>
          <div class="cms-panel-box">
            <h3 style="margin-bottom:16px;">Daftar Rekam Jejak Perkara ({len(cases)})</h3>
            {case_rows_html}
          </div>
        </div>
      </section>

      <!-- TAB 9: CURATED & LIVE INSTAGRAM GALLERY (SK-13 / PRD V3) -->
      <section id="tab-instagram" class="cms-tab-pane">
        <!-- Live Meta Graph API Connection Box -->
        <div class="cms-panel-box" style="margin-bottom:24px;border:1px solid var(--color-border-subtle);background:linear-gradient(180deg, rgba(201,168,111,0.05) 0%, rgba(20,20,20,0.6) 100%);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                <h2 style="margin:0;font-size:1.25rem;">Koneksi Akun Instagram Langsung (Meta Graph API / SK-13)</h2>
                {ig_status_badge}
              </div>
              <p style="font-size:13px;color:var(--color-text-muted);margin:0;">
                Hubungkan akun Instagram resmi firma langsung menggunakan official Meta Graph API. Galeri publik akan otomatis menampilkan 6 unggahan terbaru beserta gambar asli, caption, dan tautan permalink Instagram.
              </p>
            </div>
            <button type="button" class="btn-gold cms-btn-sm" onclick="triggerInstagramLiveSync()" id="btnSyncInstagram">
              🔄 Sinkronkan Live dari Instagram
            </button>
          </div>

          <form onsubmit="saveInstagramLiveConfig(event)" style="display:grid;grid-template-columns:1fr 1.5fr auto;gap:14px;align-items:flex-end;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px;">URL Profil Akun Instagram Resmi</label>
              <input type="url" id="cmsInstagramProfileUrl" class="form-input" placeholder="https://instagram.com/fhspartners" value="{html.escape(settings.get('instagramUrl', 'https://instagram.com/fhspartners'))}" required>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px;">
                Meta Instagram User Access Token (Long-Lived 60 Hari)
                <span style="font-weight:normal;color:var(--color-gold-strong);cursor:pointer;margin-left:8px;" onclick="toggleTokenVisibility()">[Lihat/Sembunyikan]</span>
              </label>
              <input type="password" id="cmsInstagramAccessToken" class="form-input" placeholder="Masukkan User Access Token dari Meta for Developers..." value="{html.escape(settings.get('instagramAccessToken', ''))}">
            </div>
            <div>
              <button type="submit" class="btn-outline cms-btn-sm" style="white-space:nowrap;height:42px;">
                Simpan &amp; Hubungkan
              </button>
            </div>
          </form>

          <div id="igSyncFeedback" style="display:none;margin-top:14px;padding:10px 14px;font-size:13px;border-radius:4px;"></div>

          <details style="margin-top:16px;background:rgba(0,0,0,0.3);border:1px solid var(--color-border-subtle);border-radius:4px;padding:10px 14px;">
            <summary style="font-size:12.5px;color:var(--color-gold-strong);cursor:pointer;font-weight:600;">
              📖 Panduan Langkah Menghubungkan Akun Instagram Resmi (Meta for Developers)
            </summary>
            <ol style="margin:10px 0 0 18px;padding:0;font-size:12.5px;line-height:1.6;color:var(--color-text-secondary);">
              <li>Buka <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" class="link-gold">Meta for Developers</a>, buat App (pilih tipe <strong>Business</strong> atau <strong>Consumer</strong>).</li>
              <li>Tambahkan produk <strong>Instagram Basic Display</strong> atau <strong>Instagram Graph API</strong>, lalu tautkan akun Instagram resmi firma pada menu <em>User Token Generator</em>.</li>
              <li>Klik <strong>Generate Token</strong> (dapat diperpanjang menjadi Long-Lived Token 60 hari melalui Graph API Explorer), salin token tersebut, lalu tempelkan ke kolom input di atas dan klik <strong>Simpan &amp; Hubungkan</strong>.</li>
            </ol>
            <p style="font-size:11.5px;color:var(--color-text-muted);margin:8px 0 0 0;">
              *Sesuai <code>SEC-003</code>, token hanya disimpan di sisi server dan tidak pernah diekspos ke bundel peramban publik.
            </p>
          </details>
        </div>

        <div class="cms-panel-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <h2>Unggahan Edukasi &amp; Galeri Instagram Aktif ({len(instagram_items)} Post)</h2>
              <p style="font-size:13.5px;color:var(--color-text-muted);">Kelola postingan edukasi Instagram yang tampil di Beranda publik. Dilengkapi teks alt aksesibilitas WCAG AA dan tombol sembunyikan/terbitkan.</p>
            </div>
            <button type="button" class="btn-gold cms-btn-sm" onclick="openNewInstagramModal()">+ Tambah Postingan Edukasi</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
            {instagram_cards_html}
          </div>
        </div>
      </section>

      <!-- TAB 10: MEDIA LIBRARY -->
      <section id="tab-media" class="cms-tab-pane">
        <div class="cms-panel-box">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div>
              <h2>Pustaka Media &amp; Unggah Gambar ({len(media_files)} Aset)</h2>
              <p style="font-size:13.5px;color:var(--color-text-muted);">Hanya menerima format <code>image/jpeg</code>, <code>image/png</code>, dan <code>image/webp</code> maks. 5 MB. Format SVG ditolak otomatis sesuai <code>SEC-013</code>.</p>
            </div>
            <div>
              <label class="btn-gold cms-btn-sm" style="cursor:pointer;">
                + Unggah Gambar Baru (JPEG/PNG/WebP)
                <input type="file" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="uploadMediaFile(this)">
              </label>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;">
            {media_cards_html}
          </div>
        </div>
      </section>

      <!-- TAB 9: SITE, HOMEPAGE, CONTACT & SEO SETTINGS -->
      <section id="tab-settings" class="cms-tab-pane">
        <form onsubmit="submitSiteSettingsForm(event)">
          <div class="cms-panel-box">
            <h2 style="margin-bottom:6px;">A. Identitas Resmi Kantor, Kontak WhatsApp &amp; Jam Konsultasi</h2>
            <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:20px;">Perubahan pada bagian ini langsung memperbarui Header, Tombol WhatsApp, Formulir Janji Temu, dan Footer di seluruh halaman.</p>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Nama Resmi Firma Hukum</label>
                <input name="officialFirmName" type="text" class="form-input" required value="{html.escape(settings['officialFirmName'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Nama Pendek Brand</label>
                <input name="shortBrandName" type="text" class="form-input" required value="{html.escape(settings['shortBrandName'])}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Alamat Resmi Kantor Pusat</label>
              <input name="address" type="text" class="form-input" required value="{html.escape(settings['address'])}">
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Nomor WhatsApp (Format Internasional 62...)</label>
                <input name="whatsappNumber" type="text" class="form-input" required value="{html.escape(settings['whatsappNumber'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Label Tampilan Nomor Hotline</label>
                <input name="whatsappDisplay" type="text" class="form-input" required value="{html.escape(settings['whatsappDisplay'])}">
              </div>
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Pesan Pembuka Default WhatsApp</label>
                <input name="defaultWaMessage" type="text" class="form-input" required value="{html.escape(settings['defaultWaMessage'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Email Penerima Notifikasi Janji Temu (INQUIRY_TO)</label>
                <input name="inquiryRecipientEmail" type="email" class="form-input" required value="{html.escape(settings['inquiryRecipientEmail'])}">
              </div>
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Slot Sesi Pagi</label>
                <input name="officeHoursPagi" type="text" class="form-input" value="{html.escape(settings['officeHoursPagi'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Slot Sesi Siang</label>
                <input name="officeHoursSiang" type="text" class="form-input" value="{html.escape(settings['officeHoursSiang'])}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Slot Sesi Sore</label>
              <input name="officeHoursSore" type="text" class="form-input" value="{html.escape(settings['officeHoursSore'])}">
            </div>
          </div>

          <div class="cms-panel-box">
            <h2 style="margin-bottom:6px;">B. Konten Seksi Hero, Tentang Firma &amp; Banner CTA Beranda</h2>
            <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:20px;">Kelola teks utama di halaman depan tanpa perlu menyentuh kode.</p>
            <div class="form-group">
              <label class="form-label">Label Eyebrow Hero</label>
              <input name="heroEyebrow" type="text" class="form-input" value="{html.escape(settings['heroEyebrow'])}">
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Judul Hero Baris 1 (Putih)</label>
                <input name="heroTitleLine1" type="text" class="form-input" value="{html.escape(settings['heroTitleLine1'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Judul Hero Baris 2 (Kilau Emas)</label>
                <input name="heroTitleGold" type="text" class="form-input" value="{html.escape(settings['heroTitleGold'])}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Paragraf Pembuka Hero</label>
              <textarea name="heroLead" class="form-textarea" rows="3">{html.escape(settings['heroLead'])}</textarea>
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Judul Seksi Tentang Firma</label>
                <input name="aboutHeading" type="text" class="form-input" value="{html.escape(settings['aboutHeading'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Motto Managing Partner</label>
                <input name="founderMotto" type="text" class="form-input" value="{html.escape(settings['founderMotto'])}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Paragraf Narasi Tentang Firma</label>
              <textarea name="aboutParagraph" class="form-textarea" rows="3">{html.escape(settings['aboutParagraph'])}</textarea>
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Kartu Kredibilitas 1 — Judul</label>
                <input name="cred1Title" type="text" class="form-input" value="{html.escape(settings['cred1Title'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Kartu Kredibilitas 2 — Judul</label>
                <input name="cred2Title" type="text" class="form-input" value="{html.escape(settings['cred2Title'])}">
              </div>
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Kartu Kredibilitas 1 — Deskripsi</label>
                <textarea name="cred1Desc" class="form-textarea" rows="2">{html.escape(settings['cred1Desc'])}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Kartu Kredibilitas 2 — Deskripsi</label>
                <textarea name="cred2Desc" class="form-textarea" rows="2">{html.escape(settings['cred2Desc'])}</textarea>
              </div>
            </div>
            <div class="form-row-duo">
              <div class="form-group">
                <label class="form-label">Judul Banner CTA Palu Sidang</label>
                <input name="ctaTitle" type="text" class="form-input" value="{html.escape(settings['ctaTitle'])}">
              </div>
              <div class="form-group">
                <label class="form-label">Subjudul Banner CTA</label>
                <input name="ctaSubtitle" type="text" class="form-input" value="{html.escape(settings['ctaSubtitle'])}">
              </div>
            </div>
          </div>

          <div class="cms-panel-box">
            <h2 style="margin-bottom:6px;">C. Pengaturan SEO Global &amp; Teks Disclaimer Hukum</h2>
            <div class="form-group">
              <label class="form-label">Default Meta Title (&le; 60 Karakter Disarankan)</label>
              <input name="seoDefaultTitle" type="text" class="form-input" value="{html.escape(settings['seoDefaultTitle'])}">
            </div>
            <div class="form-group">
              <label class="form-label">Default Meta Description (&le; 155 Karakter Disarankan)</label>
              <textarea name="seoDefaultDescription" class="form-textarea" rows="2">{html.escape(settings['seoDefaultDescription'])}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Teks Disclaimer Hukum Standar (Footer &amp; Bawah Artikel)</label>
              <textarea name="disclaimerText" class="form-textarea" rows="3">{html.escape(settings['disclaimerText'])}</textarea>
            </div>
            <button type="submit" class="btn-gold full-width-btn">Simpan Seluruh Pengaturan Situs &rarr;</button>
          </div>
        </form>
      </section>

      <!-- TAB 10: USERS, SECURITY & AUDIT LOGS -->
      <section id="tab-security" class="cms-tab-pane">
        <div class="docket-booking-grid" style="margin-top:0;">
          <div class="cms-panel-box">
            <h3 style="margin-bottom:12px;">Tambah Akun Pengguna CMS (SEC-001)</h3>
            <p style="font-size:12.5px;color:var(--color-text-muted);margin-bottom:16px;">Kata sandi minimal 12 karakter. Peran <code>admin</code> memiliki akses penuh; peran <code>editor</code> hanya mengelola artikel dan media.</p>
            <form onsubmit="submitNewUserForm(event)">
              <div class="form-group">
                <label class="form-label">Nama Lengkap Pengguna</label>
                <input id="newUserName" type="text" class="form-input" required placeholder="Nama Staf / Editor">
              </div>
              <div class="form-group">
                <label class="form-label">Alamat Email</label>
                <input id="newUserEmail" type="email" class="form-input" required placeholder="nama@fsdanrekan.id">
              </div>
              <div class="form-row-duo">
                <div class="form-group">
                  <label class="form-label">Peran Otorisasi (RBAC)</label>
                  <select id="newUserRole" class="form-select">
                    <option value="editor">Editor (Artikel &amp; Media)</option>
                    <option value="admin">Admin (Akses Penuh)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Kata Sandi (&ge; 12 Karakter)</label>
                  <input id="newUserPassword" type="password" class="form-input" required minlength="12" placeholder="Minimal 12 karakter">
                </div>
              </div>
              <button type="submit" class="btn-gold full-width-btn">Tambah Pengguna &rarr;</button>
            </form>
          </div>

          <div class="cms-panel-box">
            <h3 style="margin-bottom:14px;">Daftar Akun Pengguna ({len(users)})</h3>
            {user_rows_html}
          </div>
        </div>

        <div class="cms-panel-box">
          <h3 style="margin-bottom:14px;">Log Audit Keamanan Terpusat (AuditLogs &mdash; Tanpa PII sesuai SEC-012)</h3>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;text-align:left;">
              <thead>
                <tr style="border-bottom:2px solid var(--color-gold);color:var(--color-gold-strong);font-size:12px;text-transform:uppercase;">
                  <th style="padding:10px 12px;">Waktu (UTC)</th>
                  <th style="padding:10px 12px;">Aktor</th>
                  <th style="padding:10px 12px;">Aksi</th>
                  <th style="padding:10px 12px;">Koleksi &amp; Target</th>
                  <th style="padding:10px 12px;">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {audit_rows_html}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- MODAL 1: CREATE / EDIT ARTICLE -->
  <div id="cmsArticleModal" class="modal-overlay" onclick="if(event.target===this)closeCmsModal('cmsArticleModal')">
    <div class="modal-dialog-box" style="max-width:820px;">
      <button type="button" class="modal-close-trigger" onclick="closeCmsModal('cmsArticleModal')">&times;</button>
      <h3 id="cmsArticleModalHeading" style="margin-bottom:16px;">Tulis / Edit Artikel</h3>
      <form onsubmit="submitArticleModalForm(event)">
        <input id="modalArtId" type="hidden" value="">
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Judul Artikel</label>
            <input id="modalArtTitle" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Slug URL (Otomatis bila dikosongkan)</label>
            <input id="modalArtSlug" type="text" class="form-input" placeholder="contoh-slug-artikel">
          </div>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Kategori</label>
            <select id="modalArtCategory" class="form-select">{cat_options_html}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Status Publikasi</label>
            <select id="modalArtStatus" class="form-select">
              <option value="published">Terbit (Published)</option>
              <option value="draft">Draf Internal (Tersembunyi / 404 di Publik)</option>
            </select>
          </div>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Penulis</label>
            <input id="modalArtAuthor" type="text" class="form-input" value="Tim Redaksi FS dan Rekan">
          </div>
          <div class="form-group">
            <label class="form-label">Gambar Sampul (Dari Pustaka Media)</label>
            <select id="modalArtCover" class="form-select">{media_options_html}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ringkasan Kartu (Excerpt)</label>
          <input id="modalArtExcerpt" type="text" class="form-input" required maxlength="220">
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">SEO Meta Title (&le; 60 Karakter)</label>
            <input id="modalArtSeoTitle" type="text" class="form-input" maxlength="70">
          </div>
          <div class="form-group">
            <label class="form-label">SEO Meta Description (&le; 155 Karakter)</label>
            <input id="modalArtSeoDesc" type="text" class="form-input" maxlength="170">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Isi Artikel (HTML atau Paragraf Teks)</label>
          <textarea id="modalArtBody" class="form-textarea" rows="7" required></textarea>
        </div>
        <button type="submit" class="btn-gold full-width-btn">Simpan Artikel &rarr;</button>
      </form>
    </div>
  </div>

  <!-- MODAL 2: CREATE / EDIT TEAM MEMBER -->
  <div id="cmsTeamModal" class="modal-overlay" onclick="if(event.target===this)closeCmsModal('cmsTeamModal')">
    <div class="modal-dialog-box" style="max-width:820px;">
      <button type="button" class="modal-close-trigger" onclick="closeCmsModal('cmsTeamModal')">&times;</button>
      <h3 id="cmsTeamModalHeading" style="margin-bottom:16px;">Edit Profil Anggota Tim</h3>
      <form onsubmit="submitTeamModalForm(event)">
        <input id="modalTeamAction" type="hidden" value="update">
        <input id="modalTeamSlug" type="hidden" value="">
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Nama Lengkap (Tanpa Gelar)</label>
            <input id="modalTeamFullName" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Gelar Akademik / Profesi (Contoh: S.H. atau S.H., M.H.)</label>
            <input id="modalTeamHonorific" type="text" class="form-input" placeholder="Kosongkan bila belum ingin menampilkan gelar">
          </div>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Jabatan Resmi (Role Title)</label>
            <input id="modalTeamRole" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Kelompok Jabatan</label>
            <select id="modalTeamGroup" class="form-select">
              <option value="Pendiri dan Managing Partner">Pendiri dan Managing Partner</option>
              <option value="Associate">Associate</option>
              <option value="Legal Administrator">Legal Administrator</option>
            </select>
          </div>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Foto Potret (Dari Pustaka Media)</label>
            <select id="modalTeamPhoto" class="form-select">{media_options_html}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Urutan Tampil &amp; Status Publikasi</label>
            <div style="display:flex;gap:10px;align-items:center;">
              <input id="modalTeamOrder" type="number" class="form-input" style="width:90px;" min="1" value="1">
              <label class="consent-checkbox-label"><input id="modalTeamPublished" type="checkbox" checked> <span>Tampilkan di Publik</span></label>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Bio Singkat Kartu (&le; 200 Karakter sesuai FR-3.2)</label>
          <input id="modalTeamShortBio" type="text" class="form-input" required maxlength="200">
        </div>
        <div class="form-group">
          <label class="form-label">Bio Lengkap (Pisahkan paragraf dengan baris kosong)</label>
          <textarea id="modalTeamFullBio" class="form-textarea" rows="6" required></textarea>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Pendidikan (Satu per baris)</label>
            <textarea id="modalTeamEdu" class="form-textarea" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Kredensial / Lisensi (Satu per baris)</label>
            <textarea id="modalTeamCred" class="form-textarea" rows="3"></textarea>
          </div>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Bahasa (Satu per baris)</label>
            <textarea id="modalTeamLang" class="form-textarea" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Tag Keahlian (Pisahkan dengan koma)</label>
            <input id="modalTeamTags" type="text" class="form-input" placeholder="Hukum Korporasi, Perbankan, Litigasi">
          </div>
        </div>
        <button type="submit" class="btn-gold full-width-btn">Simpan Profil Tim &rarr;</button>
      </form>
    </div>
  </div>

  <!-- MODAL 3: CREATE / EDIT PRACTICE AREA -->
  <div id="cmsPracticeModal" class="modal-overlay" onclick="if(event.target===this)closeCmsModal('cmsPracticeModal')">
    <div class="modal-dialog-box" style="max-width:760px;">
      <button type="button" class="modal-close-trigger" onclick="closeCmsModal('cmsPracticeModal')">&times;</button>
      <h3 id="cmsPracticeModalHeading" style="margin-bottom:16px;">Edit Bidang Praktik Layanan</h3>
      <form onsubmit="submitPracticeModalForm(event)">
        <input id="modalPracAction" type="hidden" value="update">
        <input id="modalPracSlug" type="hidden" value="">
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Nama Bidang Praktik</label>
            <input id="modalPracName" type="text" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Label Badge (Contoh: BISNIS, PROPERTI, PIDANA)</label>
            <input id="modalPracLabel" type="text" class="form-input" required>
          </div>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Gambar Latar Panggung</label>
            <select id="modalPracImage" class="form-select">{media_options_html}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Urutan Tampil &amp; Status</label>
            <div style="display:flex;gap:10px;align-items:center;">
              <input id="modalPracOrder" type="number" class="form-input" style="width:90px;" min="1" value="1">
              <label class="consent-checkbox-label"><input id="modalPracPublished" type="checkbox" checked> <span>Aktif</span></label>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ringkasan Layanan (1&ndash;2 Kalimat)</label>
          <textarea id="modalPracSummary" class="form-textarea" rows="2" required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Subjudul Cakupan Advokasi</label>
          <input id="modalPracDesc" type="text" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">Daftar Butir Cakupan Advokasi (Satu butir per baris)</label>
          <textarea id="modalPracScope" class="form-textarea" rows="4" required></textarea>
        </div>
        <button type="submit" class="btn-gold full-width-btn">Simpan Bidang Praktik &rarr;</button>
      </form>
    </div>
  </div>

  <!-- MODAL: CREATE / EDIT INSTAGRAM POST (SK-13) -->
  <div id="cmsInstagramModal" class="modal-overlay" onclick="if(event.target===this)closeCmsModal('cmsInstagramModal')">
    <div class="modal-dialog-box" style="max-width:680px;">
      <button type="button" class="modal-close-trigger" onclick="closeCmsModal('cmsInstagramModal')">&times;</button>
      <h3 id="cmsInstagramModalHeading" style="margin-bottom:16px;">Tambah Postingan Edukasi Instagram</h3>
      <form onsubmit="submitInstagramModalForm(event)">
        <input id="modalIgId" type="hidden" value="">
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Kategori Edukasi</label>
            <input id="modalIgCategory" type="text" class="form-input" required placeholder="mis. Edukasi Korporasi">
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Terbit</label>
            <input id="modalIgDate" type="text" class="form-input" required placeholder="mis. 14 Okt 2026">
          </div>
        </div>
        <div class="form-row-duo">
          <div class="form-group">
            <label class="form-label">Gambar Postingan</label>
            <select id="modalIgImage" class="form-select">{media_options_html}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Urutan Tampil (Display Order)</label>
            <input id="modalIgOrder" type="number" class="form-input" required min="1" value="1">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Teks Alternatif Gambar (Wajib Aksesibilitas WCAG AA)</label>
          <input id="modalIgAlt" type="text" class="form-input" required placeholder="Edukasi Hukum ... - Ferdinan Silalahi dan Rekan Law Firm">
        </div>
        <div class="form-group">
          <label class="form-label">Teks Caption Edukasi Hukum</label>
          <textarea id="modalIgCaption" class="form-textarea" rows="4" required placeholder="Tuliskan ulasan ringkas wawasan edukasi hukum..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Tautan Konten Instagram (Permalink)</label>
          <input id="modalIgPermalink" type="url" class="form-input" required placeholder="https://instagram.com/">
        </div>
        <div class="form-group">
          <label class="consent-checkbox-label">
            <input id="modalIgPublished" type="checkbox" checked>
            <span>Tampilkan di Beranda Publik (Status Terbit)</span>
          </label>
        </div>
        <button type="submit" class="btn-gold full-width-btn">Simpan Postingan Instagram &rarr;</button>
      </form>
    </div>
  </div>

  <div id="cmsToast" class="cms-toast" role="status"></div>

  <script>
    const CMS_ARTICLES = {json.dumps({a["id"]: a for a in all_articles}, ensure_ascii=False)};
    const CMS_TEAM = {json.dumps({m["slug"]: m for m in team}, ensure_ascii=False)};
    const CMS_PRACTICES = {json.dumps({a["slug"]: a for a in practices}, ensure_ascii=False)};
    const CMS_CASES = {json.dumps({c["id"]: c for c in cases}, ensure_ascii=False)};
    const CMS_INQUIRIES = {json.dumps(inquiries, ensure_ascii=False)};
    const CMS_INSTAGRAM = {json.dumps({it["id"]: it for it in instagram_items}, ensure_ascii=False)};
    const CMS_CHAT_SESSIONS = {json.dumps({s["id"]: s for s in chat_sessions}, ensure_ascii=False)};

    function showToast(msg) {{
      const t = document.getElementById('cmsToast');
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => {{ t.style.display = 'none'; }}, 3200);
    }}

    function switchCmsTab(tabId) {{
      document.querySelectorAll('.cms-tab-pane').forEach(p => p.classList.toggle('is-active', p.id === tabId));
      document.querySelectorAll('.cms-nav-btn').forEach(b => b.classList.toggle('is-active', b.getAttribute('data-tab') === tabId));
      window.location.hash = tabId;
    }}

    if (window.location.hash && document.getElementById(window.location.hash.slice(1))) {{
      switchCmsTab(window.location.hash.slice(1));
    }}

    function closeCmsModal(id) {{
      document.getElementById(id).classList.remove('is-active');
    }}

    // Articles CRUD
    function filterArticlesByStatus(st) {{
      document.querySelectorAll('#cmsArticleList .cms-item-card').forEach(card => {{
        card.style.display = (st === 'all' || card.getAttribute('data-status') === st) ? 'flex' : 'none';
      }});
    }}

    function openNewArticleModal() {{
      document.getElementById('cmsArticleModalHeading').textContent = 'Tulis Artikel Baru';
      document.getElementById('modalArtId').value = '';
      document.getElementById('modalArtTitle').value = '';
      document.getElementById('modalArtSlug').value = '';
      document.getElementById('modalArtStatus').value = 'published';
      document.getElementById('modalArtAuthor').value = 'Tim Redaksi FS dan Rekan';
      document.getElementById('modalArtExcerpt').value = '';
      document.getElementById('modalArtSeoTitle').value = '';
      document.getElementById('modalArtSeoDesc').value = '';
      document.getElementById('modalArtBody').value = '';
      document.getElementById('cmsArticleModal').classList.add('is-active');
    }}

    function openEditArticleModal(id) {{
      const a = CMS_ARTICLES[id];
      if (!a) return;
      document.getElementById('cmsArticleModalHeading').textContent = 'Edit Artikel: ' + a.title;
      document.getElementById('modalArtId').value = a.id;
      document.getElementById('modalArtTitle').value = a.title || '';
      document.getElementById('modalArtSlug').value = a.slug || '';
      document.getElementById('modalArtCategory').value = (a.category && a.category.name) || 'Hukum Korporasi & Bisnis';
      document.getElementById('modalArtStatus').value = a.status || 'published';
      document.getElementById('modalArtAuthor').value = a.authorName || 'Tim Redaksi FS dan Rekan';
      document.getElementById('modalArtCover').value = a.coverUrl || '/images/practice-corporate.webp';
      document.getElementById('modalArtExcerpt').value = a.excerpt || '';
      document.getElementById('modalArtSeoTitle').value = a.seoTitle || '';
      document.getElementById('modalArtSeoDesc').value = a.seoDescription || '';
      document.getElementById('modalArtBody').value = a.bodyHtml || '';
      document.getElementById('cmsArticleModal').classList.add('is-active');
    }}

    async function submitArticleModalForm(e) {{
      e.preventDefault();
      const id = document.getElementById('modalArtId').value;
      const payload = {{
        action: id ? 'update' : 'create',
        id: id,
        title: document.getElementById('modalArtTitle').value.trim(),
        slug: document.getElementById('modalArtSlug').value.trim(),
        categoryName: document.getElementById('modalArtCategory').value,
        status: document.getElementById('modalArtStatus').value,
        authorName: document.getElementById('modalArtAuthor').value.trim(),
        coverUrl: document.getElementById('modalArtCover').value,
        excerpt: document.getElementById('modalArtExcerpt').value.trim(),
        seoTitle: document.getElementById('modalArtSeoTitle').value.trim(),
        seoDescription: document.getElementById('modalArtSeoDesc').value.trim(),
        bodyText: document.getElementById('modalArtBody').value.trim()
      }};
      const res = await fetch('/api/admin/article', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(payload)
      }});
      if (res.ok) window.location.reload();
    }}

    async function toggleArticleStatus(id, status) {{
      const res = await fetch('/api/admin/article', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'toggle', id, status }})
      }});
      if (res.ok) window.location.reload();
    }}

    async function deleteArticle(id) {{
      if (!confirm('Hapus artikel ini secara permanen?')) return;
      const res = await fetch('/api/admin/article', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'delete', id }})
      }});
      if (res.ok) window.location.reload();
    }}

    // Categories CRUD
    async function submitCategoryForm(e) {{
      e.preventDefault();
      const res = await fetch('/api/admin/category', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          action: 'create',
          name: document.getElementById('catNameInput').value.trim(),
          description: document.getElementById('catDescInput').value.trim()
        }})
      }});
      if (res.ok) window.location.reload();
    }}

    async function deleteCategory(id) {{
      const res = await fetch('/api/admin/category', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'delete', id }})
      }});
      if (res.ok) window.location.reload();
    }}

    // Inquiries CRUD & Export
    function filterInquiriesByStatus(st) {{
      document.querySelectorAll('#cmsInquiryList .cms-inquiry-item').forEach(card => {{
        card.style.display = (st === 'all' || card.getAttribute('data-inq-status') === st) ? 'flex' : 'none';
      }});
    }}

    async function updateInquiry(id, status, internalNotes) {{
      const res = await fetch('/api/admin/inquiry-status', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'update', id, status, internalNotes }})
      }});
      if (res.ok) showToast('Data permohonan janji temu berhasil diperbarui.');
    }}

    async function deleteInquiry(id) {{
      if (!confirm('Hapus data permohonan ini sesuai hak penghapusan subjek data UU PDP?')) return;
      const res = await fetch('/api/admin/inquiry-status', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'delete', id }})
      }});
      if (res.ok) window.location.reload();
    }}

    function exportInquiriesCsv() {{
      if (!CMS_INQUIRIES.length) {{
        showToast('Belum ada data permohonan untuk diekspor.');
        return;
      }}
      const headers = ['ID','Nama','Email','WhatsApp','Bidang Hukum','Tanggal','Sesi','Metode','Status','Persetujuan PDP','Catatan Internal','Uraian'];
      const rows = CMS_INQUIRIES.map(i => [
        i.id, i.name, i.email, i.phone, i.practiceAreaId, i.preferredDate, i.sessionSlot, i.method, i.status, i.consentAt, i.internalNotes || '', (i.summary || '').replace(/\\n/g, ' ')
      ].map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(','));
      const csv = [headers.join(','), ...rows].join('\\n');
      const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'permohonan-janji-temu-fs-dan-rekan.csv';
      a.click();
    }}

    // Team CRUD
    function openNewTeamModal() {{
      document.getElementById('cmsTeamModalHeading').textContent = 'Tambah Anggota Tim Baru';
      document.getElementById('modalTeamAction').value = 'create';
      document.getElementById('modalTeamSlug').value = '';
      document.getElementById('modalTeamFullName').value = '';
      document.getElementById('modalTeamHonorific').value = 'S.H.';
      document.getElementById('modalTeamRole').value = 'Associate';
      document.getElementById('modalTeamGroup').value = 'Associate';
      document.getElementById('modalTeamOrder').value = '6';
      document.getElementById('modalTeamPublished').checked = true;
      document.getElementById('modalTeamShortBio').value = '';
      document.getElementById('modalTeamFullBio').value = '';
      document.getElementById('modalTeamEdu').value = '';
      document.getElementById('modalTeamCred').value = '';
      document.getElementById('modalTeamLang').value = 'Indonesia\\nInggris';
      document.getElementById('modalTeamTags').value = '';
      document.getElementById('cmsTeamModal').classList.add('is-active');
    }}

    function openEditTeamModal(slug) {{
      const m = CMS_TEAM[slug];
      if (!m) return;
      document.getElementById('cmsTeamModalHeading').textContent = 'Edit Profil: ' + m.displayName;
      document.getElementById('modalTeamAction').value = 'update';
      document.getElementById('modalTeamSlug').value = m.slug;
      document.getElementById('modalTeamFullName').value = m.fullName || '';
      document.getElementById('modalTeamHonorific').value = m.honorific || '';
      document.getElementById('modalTeamRole').value = m.roleTitle || '';
      document.getElementById('modalTeamGroup').value = m.group || 'Associate';
      document.getElementById('modalTeamPhoto').value = (m.photo && m.photo.url) || '/team/ferdinan-hasiholan-silalahi.webp';
      document.getElementById('modalTeamOrder').value = m.displayOrder || 1;
      document.getElementById('modalTeamPublished').checked = m.isPublished !== false;
      document.getElementById('modalTeamShortBio').value = m.shortBio || '';
      document.getElementById('modalTeamFullBio').value = m.fullBio || '';
      document.getElementById('modalTeamEdu').value = (m.education || []).join('\\n');
      document.getElementById('modalTeamCred').value = (m.credentials || []).join('\\n');
      document.getElementById('modalTeamLang').value = (m.languages || []).join('\\n');
      document.getElementById('modalTeamTags').value = (m.tags || []).join(', ');
      document.getElementById('cmsTeamModal').classList.add('is-active');
    }}

    async function submitTeamModalForm(e) {{
      e.preventDefault();
      const payload = {{
        action: document.getElementById('modalTeamAction').value,
        slug: document.getElementById('modalTeamSlug').value,
        fullName: document.getElementById('modalTeamFullName').value.trim(),
        honorific: document.getElementById('modalTeamHonorific').value.trim(),
        roleTitle: document.getElementById('modalTeamRole').value.trim(),
        group: document.getElementById('modalTeamGroup').value,
        photoUrl: document.getElementById('modalTeamPhoto').value,
        displayOrder: parseInt(document.getElementById('modalTeamOrder').value || '1', 10),
        isPublished: document.getElementById('modalTeamPublished').checked,
        shortBio: document.getElementById('modalTeamShortBio').value.trim(),
        fullBio: document.getElementById('modalTeamFullBio').value.trim(),
        educationText: document.getElementById('modalTeamEdu').value,
        credentialsText: document.getElementById('modalTeamCred').value,
        languagesText: document.getElementById('modalTeamLang').value,
        tagsText: document.getElementById('modalTeamTags').value
      }};
      const res = await fetch('/api/admin/team', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(payload)
      }});
      const data = await res.json().catch(() => ({{}}));
      if (res.ok) window.location.reload();
      else alert(data.error || 'Gagal menyimpan profil tim.');
    }}

    async function deleteCustomTeamMember(slug) {{
      if (!confirm('Hapus anggota tim ini?')) return;
      const res = await fetch('/api/admin/team', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'delete_custom', slug }})
      }});
      if (res.ok) window.location.reload();
    }}

    // Practice Areas CRUD
    function openNewPracticeModal() {{
      document.getElementById('cmsPracticeModalHeading').textContent = 'Tambah Bidang Praktik Baru';
      document.getElementById('modalPracAction').value = 'create';
      document.getElementById('modalPracSlug').value = '';
      document.getElementById('modalPracName').value = '';
      document.getElementById('modalPracLabel').value = 'KORPORASI';
      document.getElementById('modalPracOrder').value = '11';
      document.getElementById('modalPracPublished').checked = true;
      document.getElementById('modalPracSummary').value = '';
      document.getElementById('modalPracDesc').value = '';
      document.getElementById('modalPracScope').value = '';
      document.getElementById('cmsPracticeModal').classList.add('is-active');
    }}

    function openEditPracticeModal(slug) {{
      const a = CMS_PRACTICES[slug];
      if (!a) return;
      document.getElementById('cmsPracticeModalHeading').textContent = 'Edit Bidang Praktik: ' + a.name;
      document.getElementById('modalPracAction').value = 'update';
      document.getElementById('modalPracSlug').value = a.slug;
      document.getElementById('modalPracName').value = a.name || '';
      document.getElementById('modalPracLabel').value = a.label || '';
      document.getElementById('modalPracImage').value = a.image || '/images/practice-corporate.webp';
      document.getElementById('modalPracOrder').value = a.displayOrder || 1;
      document.getElementById('modalPracPublished').checked = a.isPublished !== false;
      document.getElementById('modalPracSummary').value = a.summary || '';
      document.getElementById('modalPracDesc').value = a.description || '';
      document.getElementById('modalPracScope').value = (a.advocacyScope || []).join('\\n');
      document.getElementById('cmsPracticeModal').classList.add('is-active');
    }}

    async function submitPracticeModalForm(e) {{
      e.preventDefault();
      const payload = {{
        action: document.getElementById('modalPracAction').value,
        slug: document.getElementById('modalPracSlug').value,
        name: document.getElementById('modalPracName').value.trim(),
        label: document.getElementById('modalPracLabel').value.trim(),
        image: document.getElementById('modalPracImage').value,
        displayOrder: parseInt(document.getElementById('modalPracOrder').value || '1', 10),
        isPublished: document.getElementById('modalPracPublished').checked,
        summary: document.getElementById('modalPracSummary').value.trim(),
        description: document.getElementById('modalPracDesc').value.trim(),
        scopeText: document.getElementById('modalPracScope').value
      }};
      const res = await fetch('/api/admin/practice', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(payload)
      }});
      if (res.ok) window.location.reload();
    }}

    // Case Records CRUD (SK-14)
    function openEditCaseModal(id) {{
      const c = CMS_CASES[id];
      if (!c) return;
      document.getElementById('caseIdInput').value = c.id;
      document.getElementById('caseTypeInput').value = c.caseType || '';
      document.getElementById('caseRegionInput').value = c.region || '';
      document.getElementById('caseOrderInput').value = c.displayOrder || 1;
      document.getElementById('caseModeInput').value = c.displayMode || 'anonymous';
      document.getElementById('caseClientInput').value = c.clientName || '';
      document.getElementById('caseConsentRefInput').value = c.consentRef || '';
      document.getElementById('namedConsentFields').style.display = c.displayMode === 'named' ? 'block' : 'none';
      showToast('Mode Edit Perkara: ' + c.caseType);
    }}

    function resetCaseForm() {{
      document.getElementById('caseIdInput').value = '';
      document.getElementById('caseTypeInput').value = '';
      document.getElementById('caseRegionInput').value = '';
      document.getElementById('caseModeInput').value = 'anonymous';
      document.getElementById('caseClientInput').value = '';
      document.getElementById('caseConsentRefInput').value = '';
      document.getElementById('namedConsentFields').style.display = 'none';
    }}

    async function submitCaseForm(e) {{
      e.preventDefault();
      const id = document.getElementById('caseIdInput').value;
      const res = await fetch('/api/admin/cases', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          action: id ? 'update' : 'create',
          id: id,
          caseType: document.getElementById('caseTypeInput').value.trim(),
          region: document.getElementById('caseRegionInput').value.trim(),
          displayOrder: parseInt(document.getElementById('caseOrderInput').value || '1', 10),
          displayMode: document.getElementById('caseModeInput').value,
          clientName: document.getElementById('caseClientInput').value.trim(),
          consentRef: document.getElementById('caseConsentRefInput').value.trim(),
          isPublished: true
        }})
      }});
      const data = await res.json().catch(() => ({{}}));
      if (res.ok) window.location.reload();
      else alert(data.error || 'Gagal menyimpan perkara.');
    }}

    async function deleteCaseRecord(id) {{
      if (!confirm('Hapus rekam jejak perkara ini?')) return;
      const res = await fetch('/api/admin/cases', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'delete', id }})
      }});
      if (res.ok) window.location.reload();
    }}

    // Media Upload (SEC-013)
    function uploadMediaFile(input) {{
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {{
        const b64 = String(reader.result).split(',')[1] || '';
        const res = await fetch('/api/admin/media', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{
            filename: file.name,
            mimeType: file.type,
            dataBase64: b64
          }})
        }});
        const data = await res.json().catch(() => ({{}}));
        if (res.ok) window.location.reload();
        else alert(data.error || 'Gagal mengunggah gambar.');
      }};
      reader.readAsDataURL(file);
    }}

    // Site Settings Form
    async function submitSiteSettingsForm(e) {{
      e.preventDefault();
      const formData = new FormData(e.target);
      const payload = Object.fromEntries(formData.entries());
      const res = await fetch('/api/admin/settings', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(payload)
      }});
      if (res.ok) {{
        showToast('Seluruh pengaturan situs & beranda berhasil disimpan!');
        setTimeout(() => window.location.reload(), 900);
      }}
    }}

    // Users & Security
    async function submitNewUserForm(e) {{
      e.preventDefault();
      const res = await fetch('/api/admin/users', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          action: 'create',
          name: document.getElementById('newUserName').value.trim(),
          email: document.getElementById('newUserEmail').value.trim(),
          role: document.getElementById('newUserRole').value,
          password: document.getElementById('newUserPassword').value,
          mfaEnabled: true
        }})
      }});
      const data = await res.json().catch(() => ({{}}));
      if (res.ok) window.location.reload();
      else alert(data.error || 'Gagal menambah pengguna.');
    }}

    async function toggleUserMfa(id) {{
      const res = await fetch('/api/admin/users', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'toggle_mfa', id }})
      }});
      if (res.ok) window.location.reload();
    }}

    async function promptChangePassword(id, email) {{
      const newPassword = prompt('Masukkan kata sandi baru (minimal 12 karakter) untuk ' + email + ':');
      if (!newPassword) return;
      const res = await fetch('/api/admin/users', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'change_password', id, newPassword }})
      }});
      const data = await res.json().catch(() => ({{}}));
      if (res.ok) showToast('Kata sandi berhasil diperbarui.');
      else alert(data.error || 'Gagal mengubah kata sandi.');
    }}

    async function deleteUserAccount(id) {{
      if (!confirm('Hapus akun pengguna ini?')) return;
      const res = await fetch('/api/admin/users', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ action: 'delete', id }})
      }});
      const data = await res.json().catch(() => ({{}}));
      if (res.ok) window.location.reload();
      else alert(data.error || 'Gagal menghapus akun.');
    }}

    // Instagram Live Sync & Config (SK-13 / Meta Graph API)
    function toggleTokenVisibility() {{
      const el = document.getElementById('cmsInstagramAccessToken');
      if (el) el.type = el.type === 'password' ? 'text' : 'password';
    }}

    async function saveInstagramLiveConfig(e) {{
      if (e) e.preventDefault();
      const profileUrl = document.getElementById('cmsInstagramProfileUrl').value.trim();
      const accessToken = document.getElementById('cmsInstagramAccessToken').value.trim();
      const fb = document.getElementById('igSyncFeedback');
      fb.style.display = 'block';
      fb.style.background = 'rgba(201,168,111,0.1)';
      fb.style.border = '1px solid var(--color-gold-strong)';
      fb.style.color = 'var(--color-gold-strong)';
      fb.textContent = 'Menyimpan konfigurasi dan memeriksa koneksi Instagram...';

      try {{
        const res = await fetch('/api/admin/instagram/sync', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{ profileUrl, accessToken }})
        }});
        const data = await res.json().catch(() => ({{}}));
        if (res.ok && data.ok) {{
          fb.style.background = '#14532d';
          fb.style.borderColor = '#86efac';
          fb.style.color = '#86efac';
          fb.textContent = data.message || 'Berhasil terhubung ke akun Instagram!';
          showToast('Koneksi Instagram berhasil diperbarui.');
          setTimeout(() => window.location.reload(), 1200);
        }} else {{
          fb.style.background = '#451a03';
          fb.style.borderColor = '#fdba74';
          fb.style.color = '#fdba74';
          fb.textContent = (data.error || 'Gagal terhubung ke Instagram. Konfigurasi disimpan, namun token belum aktif.') + ' Galeri beralih ke mode kurasi yang aman.';
          showToast('Pengaturan disimpan.');
        }}
      }} catch (err) {{
        fb.style.background = '#451a03';
        fb.style.borderColor = '#fdba74';
        fb.style.color = '#fdba74';
        fb.textContent = 'Terjadi kesalahan jaringan saat menghubungi API Instagram.';
      }}
    }}

    async function triggerInstagramLiveSync() {{
      const btn = document.getElementById('btnSyncInstagram');
      if (btn) btn.disabled = true;
      const fb = document.getElementById('igSyncFeedback');
      fb.style.display = 'block';
      fb.style.background = 'rgba(201,168,111,0.1)';
      fb.style.border = '1px solid var(--color-gold-strong)';
      fb.style.color = 'var(--color-gold-strong)';
      fb.textContent = 'Menghubungi Meta Instagram Graph API...';

      try {{
        const res = await fetch('/api/admin/instagram/sync', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{}})
        }});
        const data = await res.json().catch(() => ({{}}));
        if (res.ok && data.ok) {{
          fb.style.background = '#14532d';
          fb.style.borderColor = '#86efac';
          fb.style.color = '#86efac';
          fb.textContent = data.message || 'Sinkronisasi berhasil!';
          showToast(data.message || 'Sinkronisasi Instagram berhasil.');
          setTimeout(() => window.location.reload(), 1000);
        }} else {{
          fb.style.background = '#451a03';
          fb.style.borderColor = '#fdba74';
          fb.style.color = '#fdba74';
          fb.textContent = data.error || 'Gagal sinkronisasi Instagram.';
        }}
      }} catch (err) {{
        fb.style.background = '#451a03';
        fb.style.borderColor = '#fdba74';
        fb.style.color = '#fdba74';
        fb.textContent = 'Kesalahan jaringan saat melakukan sinkronisasi.';
      }} finally {{
        if (btn) btn.disabled = false;
      }}
    }}

    // Instagram CRUD (SK-13)
    function openNewInstagramModal() {{
      document.getElementById('cmsInstagramModalHeading').textContent = 'Tambah Postingan Edukasi Instagram';
      document.getElementById('modalIgId').value = '';
      document.getElementById('modalIgCategory').value = 'Edukasi Hukum';
      document.getElementById('modalIgDate').value = new Date().toLocaleDateString('id-ID', {{day:'numeric', month:'short', year:'numeric'}});
      document.getElementById('modalIgOrder').value = Object.keys(CMS_INSTAGRAM).length + 1;
      document.getElementById('modalIgAlt').value = 'Edukasi Hukum - Ferdinan Silalahi dan Rekan Law Firm';
      document.getElementById('modalIgCaption').value = '';
      document.getElementById('modalIgPermalink').value = 'https://instagram.com/';
      document.getElementById('modalIgPublished').checked = true;
      document.getElementById('cmsInstagramModal').classList.add('is-active');
    }}

    function openEditInstagramModal(id) {{
      const it = CMS_INSTAGRAM[id];
      if (!it) return;
      document.getElementById('cmsInstagramModalHeading').textContent = 'Edit Postingan Edukasi Instagram';
      document.getElementById('modalIgId').value = it.id;
      document.getElementById('modalIgCategory').value = it.category || '';
      document.getElementById('modalIgDate').value = it.publishedDate || '';
      document.getElementById('modalIgImage').value = it.imageUrl || '';
      document.getElementById('modalIgOrder').value = it.displayOrder || 1;
      document.getElementById('modalIgAlt').value = it.alt || '';
      document.getElementById('modalIgCaption').value = it.caption || '';
      document.getElementById('modalIgPermalink').value = it.permalink || '';
      document.getElementById('modalIgPublished').checked = it.isPublished !== false;
      document.getElementById('cmsInstagramModal').classList.add('is-active');
    }}

    async function submitInstagramModalForm(e) {{
      e.preventDefault();
      const id = document.getElementById('modalIgId').value.trim();
      const payload = {{
        action: id ? 'update' : 'create',
        id: id || undefined,
        category: document.getElementById('modalIgCategory').value.trim(),
        publishedDate: document.getElementById('modalIgDate').value.trim(),
        imageUrl: document.getElementById('modalIgImage').value,
        displayOrder: parseInt(document.getElementById('modalIgOrder').value, 10) || 1,
        alt: document.getElementById('modalIgAlt').value.trim(),
        caption: document.getElementById('modalIgCaption').value.trim(),
        permalink: document.getElementById('modalIgPermalink').value.trim(),
        isPublished: document.getElementById('modalIgPublished').checked,
      }};
      try {{
        const res = await fetch('/api/admin/instagram', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify(payload)
        }});
        const data = await res.json().catch(() => ({{}}));
        if (res.ok) {{
          showToast('Postingan Instagram berhasil disimpan.');
          setTimeout(() => window.location.reload(), 700);
        }} else {{
          alert(data.error || 'Gagal menyimpan postingan Instagram.');
        }}
      }} catch (err) {{
        alert('Terjadi kesalahan jaringan.');
      }}
    }}

    async function toggleInstagramPublish(id) {{
      try {{
        const res = await fetch('/api/admin/instagram', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{action: 'toggle_publish', id}})
        }});
        if (res.ok) {{
          showToast('Status publikasi Instagram diperbarui.');
          setTimeout(() => window.location.reload(), 700);
        }}
      }} catch (err) {{
        alert('Terjadi kesalahan jaringan.');
      }}
    }}

    async function deleteInstagramItem(id) {{
      if (!confirm('Hapus postingan edukasi Instagram ini?')) return;
      try {{
        const res = await fetch('/api/admin/instagram', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{action: 'delete', id}})
        }});
        if (res.ok) {{
          showToast('Postingan Instagram berhasil dihapus.');
          setTimeout(() => window.location.reload(), 700);
        }}
      }} catch (err) {{
        alert('Terjadi kesalahan jaringan.');
      }}
    }}

    // Chat Sessions (SK-11 / UU PDP)
    function filterChatSessionsByStatus(st) {{
      document.querySelectorAll('#cmsChatList .cms-chat-item').forEach(card => {{
        card.style.display = (st === 'all' || card.getAttribute('data-chat-status') === st) ? 'flex' : 'none';
      }});
    }}

    async function updateChatSessionStatus(id, st) {{
      try {{
        const res = await fetch('/api/admin/chat-sessions', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{action: 'update_status', id, status: st}})
        }});
        if (res.ok) {{
          showToast('Status sesi chat diperbarui.');
        }}
      }} catch (err) {{
        alert('Gagal memperbarui status chat.');
      }}
    }}

    async function deleteChatSessionPdp(id) {{
      if (!confirm('Hapus permanen data transkrip chat ini sesuai hak penghapusan UU PDP?')) return;
      try {{
        const res = await fetch('/api/admin/chat-sessions', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{action: 'delete', id}})
        }});
        if (res.ok) {{
          showToast('Data chat pengunjung berhasil dihapus permanen (UU PDP).');
          setTimeout(() => window.location.reload(), 700);
        }}
      }} catch (err) {{
        alert('Gagal menghapus data.');
      }}
    }}
  </script>
</body>
</html>"""
