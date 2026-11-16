-- =============================================================================
-- database/migrations/002_instagram_fsdanrekan.sql
-- Migrasi Inkremental Universal (MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+)
-- Memperbarui referensi username Instagram lama (@fhspartners) ke @fsdanrekan.
-- Idempoten & aman dijalankan ulang melalui phpMyAdmin tanpa menimpa pengaturan lain.
-- =============================================================================

SET NAMES utf8mb4;

UPDATE `site_settings`
SET `settings_json` = REPLACE(
  REPLACE(`settings_json`, 'https://www.instagram.com/fhspartners/', 'https://www.instagram.com/fsdanrekan/'),
  'https://instagram.com/fhspartners',
  'https://www.instagram.com/fsdanrekan/'
)
WHERE `setting_key` = 'global'
  AND `settings_json` LIKE '%fhspartners%';

UPDATE `instagram_gallery`
SET
  `alt_text` = REPLACE(`alt_text`, '@fhspartners', '@fsdanrekan'),
  `caption` = REPLACE(`caption`, '@fhspartners', '@fsdanrekan')
WHERE `alt_text` LIKE '%@fhspartners%'
   OR `caption` LIKE '%@fhspartners%';
