-- =============================================================================
-- database/schema.sql
-- Skema Database MySQL 8.0+ / MariaDB 10.5+ untuk Ferdinan Silalahi dan Rekan Law Firm
-- Kompatibel dengan cPanel phpMyAdmin & skrip migrasi otomatis (idempoten).
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- 1. Tabel Pengguna Admin & Editor (SEC-001)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'editor') NOT NULL DEFAULT 'editor',
  `mfa_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `failed_login_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL DEFAULT NULL,
  `last_login_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Sesi Login Admin (SEC-001: HttpOnly Cookie + CSRF Token)
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `csrf_token` VARCHAR(128) NOT NULL,
  `ip_hash` VARCHAR(128) NOT NULL,
  `user_agent` VARCHAR(255) NULL DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Kategori Artikel (FR-5.1, FR-6.4)
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Artikel Hukum (FR-5, FR-6.3, SEC-004, SEC-008)
CREATE TABLE IF NOT EXISTS `articles` (
  `id` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(180) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT NOT NULL,
  `body_html` LONGTEXT NOT NULL,
  `cover_url` VARCHAR(500) NOT NULL,
  `cover_alt` VARCHAR(255) NOT NULL,
  `category_slug` VARCHAR(120) NOT NULL,
  `category_name` VARCHAR(120) NOT NULL,
  `author_name` VARCHAR(120) NOT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `published_at` DATETIME NOT NULL,
  `seo_title` VARCHAR(160) NOT NULL DEFAULT '',
  `seo_description` VARCHAR(320) NOT NULL DEFAULT '',
  `created_by` VARCHAR(64) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_articles_slug` (`slug`),
  KEY `idx_articles_status_published_at` (`status`, `published_at`),
  KEY `idx_articles_category_slug` (`category_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel 10 Bidang Layanan / Praktik (FR-4, FR-6.5)
CREATE TABLE IF NOT EXISTS `practice_areas` (
  `id` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(140) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `label` VARCHAR(64) NOT NULL,
  `summary` TEXT NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `advocacy_scope_json` LONGTEXT NOT NULL,
  `icon` VARCHAR(120) NOT NULL DEFAULT '',
  `image` VARCHAR(500) NOT NULL DEFAULT '/images/practice-corporate.webp',
  `display_order` INT NOT NULL DEFAULT 1,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_practice_areas_slug` (`slug`),
  KEY `idx_practice_areas_order` (`is_published`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Profil Tim & Advokat (FR-3, FR-6.5)
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(140) NOT NULL,
  `full_name` VARCHAR(160) NOT NULL,
  `honorific` VARCHAR(120) NOT NULL DEFAULT '',
  `display_name` VARCHAR(200) NOT NULL,
  `role_title` VARCHAR(160) NOT NULL,
  `group_name` VARCHAR(120) NOT NULL,
  `motto` VARCHAR(255) NULL DEFAULT NULL,
  `short_bio` TEXT NOT NULL,
  `full_bio` LONGTEXT NOT NULL,
  `education_json` LONGTEXT NOT NULL,
  `credentials_json` LONGTEXT NOT NULL,
  `languages_json` LONGTEXT NOT NULL,
  `tags_json` LONGTEXT NOT NULL,
  `photo_json` LONGTEXT NOT NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_members_slug` (`slug`),
  KEY `idx_team_members_order` (`is_published`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Rekam Jejak Perkara (SK-14: Anonim secara default)
CREATE TABLE IF NOT EXISTS `case_records` (
  `id` VARCHAR(64) NOT NULL,
  `case_type` VARCHAR(200) NOT NULL,
  `region` VARCHAR(160) NOT NULL,
  `display_mode` ENUM('anonymous', 'named') NOT NULL DEFAULT 'anonymous',
  `client_name` VARCHAR(200) NULL DEFAULT NULL,
  `consent_ref` VARCHAR(255) NULL DEFAULT NULL,
  `scope_text` TEXT NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `image_url` VARCHAR(500) NULL DEFAULT NULL,
  `image_alt` VARCHAR(255) NULL DEFAULT NULL,
  `photos_json` LONGTEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_case_records_order` (`is_published`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Permohonan Janji Temu / Inquiries (FR-6.7, FR-7, SEC-014)
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `practice_area_id` VARCHAR(120) NOT NULL,
  `preferred_date` VARCHAR(20) NOT NULL,
  `session_slot` ENUM('pagi', 'siang', 'sore') NOT NULL,
  `method` ENUM('tatap-muka', 'daring') NOT NULL,
  `summary` TEXT NOT NULL,
  `consent_at` DATETIME NOT NULL,
  `status` ENUM('baru', 'dihubungi', 'selesai', 'spam') NOT NULL DEFAULT 'baru',
  `internal_notes` TEXT NULL,
  `email_failed` TINYINT(1) NOT NULL DEFAULT 0,
  `ip_hash` VARCHAR(128) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inquiries_status_created` (`status`, `created_at`),
  KEY `idx_inquiries_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabel Pengaturan Situs Global (FR-6.6)
CREATE TABLE IF NOT EXISTS `site_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `settings_json` LONGTEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabel Pustaka Media / File Upload Persisten (FR-6.8, SEC-013)
CREATE TABLE IF NOT EXISTS `media_assets` (
  `id` VARCHAR(64) NOT NULL,
  `filename` VARCHAR(190) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(64) NOT NULL,
  `size_bytes` INT NOT NULL,
  `alt_text` VARCHAR(255) NOT NULL DEFAULT '',
  `url` VARCHAR(500) NOT NULL,
  `uploaded_by` VARCHAR(64) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_media_assets_filename` (`filename`),
  KEY `idx_media_assets_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabel Log Audit Keamanan (PRD Section 7, SEC-014: Tanpa PII)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `actor` VARCHAR(120) NOT NULL,
  `action` VARCHAR(80) NOT NULL,
  `collection_name` VARCHAR(80) NOT NULL,
  `target_id` VARCHAR(120) NOT NULL,
  `detail` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabel Galeri Instagram (SK-13)
CREATE TABLE IF NOT EXISTS `instagram_gallery` (
  `id` VARCHAR(64) NOT NULL,
  `shortcode` VARCHAR(64) NOT NULL DEFAULT '',
  `permalink` VARCHAR(500) NOT NULL,
  `embed_url` VARCHAR(500) NOT NULL DEFAULT '',
  `alt_text` VARCHAR(255) NOT NULL,
  `category` VARCHAR(120) NOT NULL DEFAULT 'Publikasi Resmi',
  `caption` TEXT NOT NULL,
  `published_date` VARCHAR(80) NOT NULL DEFAULT 'Instagram Live',
  `image_url` VARCHAR(500) NOT NULL,
  `display_order` INT NOT NULL DEFAULT 1,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_instagram_gallery_order` (`is_published`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Tabel Sesi Chat Pemandu (SK-11)
CREATE TABLE IF NOT EXISTS `chat_sessions` (
  `id` VARCHAR(64) NOT NULL,
  `visitor_name` VARCHAR(120) NOT NULL,
  `visitor_phone` VARCHAR(32) NOT NULL,
  `practice_area` VARCHAR(160) NOT NULL,
  `preferred_schedule` VARCHAR(120) NOT NULL,
  `notes` TEXT NULL,
  `consent_at` DATETIME NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'baru',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_sessions_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Tabel Rate Limiting Berbasis Database (SEC-007: Lintas Proses Passenger)
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `bucket_key` VARCHAR(190) NOT NULL,
  `hit_count` INT NOT NULL DEFAULT 1,
  `window_start` BIGINT NOT NULL,
  `expires_at` BIGINT NOT NULL,
  PRIMARY KEY (`bucket_key`),
  KEY `idx_rate_limits_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

