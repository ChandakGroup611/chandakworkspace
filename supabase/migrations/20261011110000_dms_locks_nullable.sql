-- Migration to allow system/unauthenticated locking in DMS
ALTER TABLE IF EXISTS dms_document_locks ALTER COLUMN locked_by DROP NOT NULL;
