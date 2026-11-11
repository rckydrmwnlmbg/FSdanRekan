-- =============================================================================
-- database/migrations/001_case_records_photos.sql
-- Migrasi Inkremental Universal (MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+)
-- Menambah kolom photos_json jika belum ada dan mem-backfill data lama tanpa menimpa.
-- Kompatibel dijalankan sekali lewat phpMyAdmin (SQL tab) tanpa terminal.
-- =============================================================================

SET NAMES utf8mb4;

-- 1. Tambah kolom photos_json secara dinamis jika belum ada
SET @dbname = DATABASE();
SET @tablename = 'case_records';
SET @columnname = 'photos_json';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` LONGTEXT NULL AFTER `image_alt`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

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
