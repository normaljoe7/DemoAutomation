-- ============================================================
-- Migration 003: Create lead_intelligence table
-- One-to-one with leads.
-- Stores company intel, post-call transcript, summary,
-- and action items for a lead's meeting sessions.
-- ============================================================

CREATE TABLE IF NOT EXISTS `lead_intelligence` (
    `id`                    INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `lead_id`               INT UNSIGNED    NOT NULL COMMENT 'FK → leads.id (one-to-one)',

    -- Company intelligence (pre-call research)
    `industry`              VARCHAR(150)             DEFAULT NULL,
    `company_size`          VARCHAR(100)             DEFAULT NULL COMMENT 'e.g. "500-1000 employees"',
    `recent_news`           TEXT                     DEFAULT NULL COMMENT 'Latest news blurb about the company',

    -- Post-call content
    -- transcript can be stored as raw text or a file path on disk/S3
    `transcript_text`       LONGTEXT                 DEFAULT NULL COMMENT 'Full call transcript as plain text',
    `transcript_file_path`  VARCHAR(500)             DEFAULT NULL COMMENT 'Path/URL to uploaded transcript file',

    `summary`               TEXT                     DEFAULT NULL COMMENT 'AI or manually written call summary',
    `action_items`          TEXT                     DEFAULT NULL COMMENT 'Comma- or newline-separated action items',

    `created_at`            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_lead_intelligence_lead` (`lead_id`),   -- enforces one-to-one

    CONSTRAINT `fk_lead_intelligence_lead`
        FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
