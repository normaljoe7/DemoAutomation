-- ============================================================
-- Migration 004: Create lead_documents table
-- Tracks every document associated with a lead:
--   • Documents requested by the client (after the call)
--   • Documents generated from templates (invoice, quotation, etc.)
--   • Documents uploaded manually (brochure PDF, sample list CSV)
-- Each row = one document instance for one lead.
-- ============================================================

CREATE TABLE IF NOT EXISTS `lead_documents` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `lead_id`       INT UNSIGNED    NOT NULL COMMENT 'FK → leads.id',

    -- What type of document
    `doc_type`      ENUM(
                        'invoice',
                        'quotation',
                        'contract',
                        'brochure',
                        'sample_list',
                        'agreement',
                        'corporate_deck',
                        'one_pager',
                        'mom',              -- Minutes of Meeting
                        'other'
                    )               NOT NULL,

    -- How the document entered the system
    `doc_category`  ENUM(
                        'requested',    -- client asked for this doc
                        'generated',    -- created via template engine
                        'uploaded'      -- manually attached/uploaded
                    )               NOT NULL DEFAULT 'requested',

    -- Where the file lives (relative path or absolute URL)
    `file_path`     VARCHAR(500)             DEFAULT NULL,
    `file_name`     VARCHAR(255)             DEFAULT NULL COMMENT 'Original file name for display',

    -- Lifecycle status of this document
    `status`        ENUM(
                        'pending',      -- not yet created/uploaded
                        'generated',    -- created from template, not yet sent
                        'uploaded',     -- file uploaded manually
                        'sent'          -- included in email to client
                    )               NOT NULL DEFAULT 'pending',

    `generated_at`  DATETIME                 DEFAULT NULL COMMENT 'When the doc was generated/uploaded',
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    -- A lead can have at most one instance of each doc_type per category
    UNIQUE KEY `uq_lead_doc_type_category` (`lead_id`, `doc_type`, `doc_category`),
    KEY `idx_lead_documents_lead` (`lead_id`),
    KEY `idx_lead_documents_status` (`status`),

    CONSTRAINT `fk_lead_documents_lead`
        FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
