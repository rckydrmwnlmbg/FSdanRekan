-- =============================================================================
-- database/migrations/001_case_records_photos_mariadb.sql
-- Migrasi Inkremental Khusus MariaDB 10.3+ (Menggunakan ADD COLUMN IF NOT EXISTS)
-- Kompatibel dijalankan sekali lewat phpMyAdmin (SQL tab) tanpa terminal.
-- =============================================================================

SET NAMES utf8mb4;

-- 1. Tambah kolom photos_json jika belum ada
ALTER TABLE `case_records` ADD COLUMN IF NOT EXISTS `photos_json` LONGTEXT NULL AFTER `image_alt`;

-- 2. Backfill data lama HANYA jika photos_json kosong / NULL / '[]'
-- Data yang sudah memiliki isi photos_json TIDAK AKAN ditimpa
UPDATE `case_records`
SET `photos_json` = JSON_ARRAY(
  JSON_OBJECT(
    'url', `image_url`,
    'caption', IFNULL(`image_alt`, ''),
    'alt', IFNULL(`image_alt`, 'Dokumentasi penanganan perkara')
  )
)
WHERE (`photos_json` IS NULL OR TRIM(`photos_json`) = '' OR TRIM(`photos_json`) = '[]')
  AND `image_url` IS NOT NULL
  AND TRIM(`image_url`) != '';

