-- ============================================================
-- Migration 005: Create lead_client_fields table
-- Stores the four required client KYC/compliance fields
-- per lead: Legal Name, GST Number, Registered Address,
-- and Contact Person.
-- A missing (unfilled) field blocks document generation
-- and email sending on the frontend.
-- ============================================================

CREATE TABLE IF NOT EXISTS `lead_client_fields` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `lead_id`       INT UNSIGNED    NOT NULL COMMENT 'FK → leads.id',

    -- The specific required field
    `field_name`    ENUM(
                        'legal_name',           -- Company's registered legal name
                        'gst_number',           -- GST / Tax registration number
                        'registered_address',   -- Official registered address
                        'contact_person'        -- Primary point of contact at client
                    )               NOT NULL,

    -- The value filled in (NULL when field is still missing)
    `field_value`   VARCHAR(500)             DEFAULT NULL,

    -- Convenience flag — TRUE once field_value is populated
    `is_filled`     TINYINT(1)      NOT NULL DEFAULT 0,

    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    -- One row per field per lead
    UNIQUE KEY `uq_lead_client_field` (`lead_id`, `field_name`),
    KEY `idx_lead_client_fields_lead` (`lead_id`),

    CONSTRAINT `fk_lead_client_fields_lead`
        FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
