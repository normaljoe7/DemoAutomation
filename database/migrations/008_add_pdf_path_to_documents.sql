-- ============================================================
-- Migration 008: Add pdf_path column to documents table
-- All generated documents are now converted to PDF by default.
-- pdf_path stores the absolute path to the generated PDF file.
-- filename is updated to reflect the PDF basename when available.
-- ============================================================

ALTER TABLE `documents`
    ADD COLUMN IF NOT EXISTS `pdf_path` VARCHAR(500) DEFAULT NULL
        COMMENT 'Absolute path to the generated PDF file (NULL if conversion failed or not requested)';

-- Update existing document records: derive pdf_path from file_path by swapping extension
-- This only sets pdf_path for records that already have a .docx file_path.
-- It does NOT guarantee the PDF file exists on disk; it is only a best-effort migration.
UPDATE `documents`
SET `pdf_path` = REPLACE(`file_path`, '.docx', '.pdf')
WHERE `file_path` LIKE '%.docx'
  AND `pdf_path` IS NULL;
