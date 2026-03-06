-- ============================================================
-- Migration 002: Create leads table
-- Core lead record — one row per prospect/client contact.
-- Owned by a user (SDR who manages the lead).
-- ============================================================

CREATE TABLE IF NOT EXISTS `leads` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,

    -- Ownership
    `user_id`           INT UNSIGNED    NOT NULL COMMENT 'SDR who owns this lead (FK → users.id)',

    -- Contact info
    `name`              VARCHAR(150)    NOT NULL,
    `email`             VARCHAR(255)    NOT NULL,
    `job_title`         VARCHAR(150)             DEFAULT NULL,
    `company`           VARCHAR(200)    NOT NULL,
    `phone`             VARCHAR(30)              DEFAULT NULL,

    -- Lead classification
    `lead_status`       ENUM(
                            'HOT',
                            'WARM',
                            'COLD',
                            'NOT CLASSIFIED'
                        )               NOT NULL DEFAULT 'NOT CLASSIFIED',

    -- Demo pipeline status
    `demo_status`       ENUM(
                            'Demo Scheduled',
                            'Demo Rescheduled',
                            'Demo Cancelled',
                            'Demo No Show',
                            'Demo Completed'
                        )               NOT NULL DEFAULT 'Demo Scheduled',

    -- Sub-status (free text — values depend on demo_status; see demoSubStatusMap in frontend)
    `demo_sub_status`   VARCHAR(100)             DEFAULT NULL,

    -- Scheduled demo date/time
    `demo_time`         DATETIME                 DEFAULT NULL,

    -- Meeting & recording links
    `teams_link`        TEXT                     DEFAULT NULL COMMENT 'Microsoft Teams join URL',
    `bubbles_link`      TEXT                     DEFAULT NULL COMMENT 'Bubbles.app recording URL',

    -- Timeline
    `last_contact`      DATETIME                 DEFAULT NULL,
    `follow_up_date`    DATETIME                 DEFAULT NULL,

    -- Post-call quality
    `call_rating`       TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0–5 star rating for internal synopsis',

    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_leads_user_id`      (`user_id`),
    KEY `idx_leads_lead_status`  (`lead_status`),
    KEY `idx_leads_demo_status`  (`demo_status`),
    KEY `idx_leads_follow_up`    (`follow_up_date`),

    CONSTRAINT `fk_leads_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
