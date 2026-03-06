-- ============================================================
-- Migration 007: Add post-call text fields to leads table
-- Stores transcript, summary, and action items inline on the
-- lead so they are accessible without joining call records.
-- Also adds columns that were present in the frontend model
-- but missing from the MySQL schema (legal_name etc. are in
-- the lead_client_fields EAV table, but ORM needs flat cols).
-- ============================================================

-- MySQL (production) --
ALTER TABLE `leads`
    ADD COLUMN IF NOT EXISTS `legal_name`         VARCHAR(255)  DEFAULT NULL  AFTER `call_rating`,
    ADD COLUMN IF NOT EXISTS `gst_number`         VARCHAR(50)   DEFAULT NULL  AFTER `legal_name`,
    ADD COLUMN IF NOT EXISTS `registered_address` TEXT          DEFAULT NULL  AFTER `gst_number`,
    ADD COLUMN IF NOT EXISTS `contact_person`     VARCHAR(255)  DEFAULT NULL  AFTER `registered_address`,
    ADD COLUMN IF NOT EXISTS `transcript_text`    LONGTEXT      DEFAULT NULL  AFTER `contact_person`,
    ADD COLUMN IF NOT EXISTS `summary_text`       LONGTEXT      DEFAULT NULL  AFTER `transcript_text`,
    ADD COLUMN IF NOT EXISTS `action_items_text`  LONGTEXT      DEFAULT NULL  AFTER `summary_text`;

-- SQLite (development) --
-- SQLite does not support ADD COLUMN IF NOT EXISTS; the backend
-- main.py handles this automatically at startup via PRAGMA
-- table_info checks before issuing ALTER TABLE statements.
