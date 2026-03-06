-- ============================================================
-- Migration 001: Create users table
-- Stores login credentials and role-based access for the app.
-- Roles: admin, sdr (Sales Dev Rep), finance, legal
-- ============================================================

CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(150)    NOT NULL,
    `email`         VARCHAR(255)    NOT NULL,
    `password_hash` VARCHAR(255)    NOT NULL COMMENT 'bcrypt hash of the password',
    `role`          ENUM(
                        'admin',
                        'sdr',
                        'finance',
                        'legal'
                    )               NOT NULL DEFAULT 'sdr',
    `is_active`     TINYINT(1)      NOT NULL DEFAULT 1,
    `last_login_at` DATETIME                 DEFAULT NULL,
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
