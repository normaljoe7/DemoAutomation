-- Migration 009: Add approval workflow fields to documents table
-- Adds Finance/Legal approval stages, remarks, and timestamps.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) NULL
        COMMENT 'pending_finance | approved_finance | rejected_finance | pending_legal | approved_legal | rejected_legal | ready_to_send',
    ADD COLUMN IF NOT EXISTS finance_remarks TEXT NULL,
    ADD COLUMN IF NOT EXISTS legal_remarks TEXT NULL,
    ADD COLUMN IF NOT EXISTS approved_by_finance INT NULL,
    ADD COLUMN IF NOT EXISTS approved_by_legal INT NULL,
    ADD COLUMN IF NOT EXISTS approved_at_finance DATETIME NULL,
    ADD COLUMN IF NOT EXISTS approved_at_legal DATETIME NULL;

-- Backfill: set existing documents that have no approval_status to pending_finance
-- (only those that were generated with a lead_id, so they need review)
UPDATE documents
SET approval_status = 'pending_finance'
WHERE approval_status IS NULL
  AND lead_id IS NOT NULL;
