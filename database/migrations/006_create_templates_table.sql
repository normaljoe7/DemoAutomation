-- ============================================================
-- Migration 006: Create templates table
-- Stores DOCX/PPTX templates managed in the Template Engine.
-- Variables are {{placeholder}} fields detected in the file.
-- ============================================================

CREATE TABLE IF NOT EXISTS `templates` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,

    -- Ownership — who uploaded the template
    `created_by`    INT UNSIGNED    NOT NULL COMMENT 'FK → users.id',

    `name`          VARCHAR(200)    NOT NULL COMMENT 'Display name, e.g. "Standard Invoice"',

    -- File format
    `type`          ENUM(
                        'docx',
                        'pptx'
                    )               NOT NULL,

    -- Template purpose / grouping in the UI
    `category`      ENUM(
                        'invoice',
                        'contract',
                        'quotation',
                        'mom',              -- Minutes of Meeting
                        'pre_call_ppt',
                        'sample_list',
                        'other'
                    )               NOT NULL DEFAULT 'other',

    -- Version number incremented on each re-upload
    `version`       SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    -- Where the template file is stored
    `file_path`     VARCHAR(500)    NOT NULL,

    -- JSON array of {{variable}} names auto-detected from the file
    -- e.g. ["client_name","invoice_date","gst_rate"]
    `variables`     JSON                     DEFAULT NULL,

    `last_modified` DATE                     DEFAULT NULL,

    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_templates_category` (`category`),
    KEY `idx_templates_type`     (`type`),
    KEY `idx_templates_created_by` (`created_by`),

    CONSTRAINT `fk_templates_user`
        FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
