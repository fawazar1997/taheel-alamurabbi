import { getSql } from "@/db";

export async function ensurePlanDocumentSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS plan_documents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL, name TEXT NOT NULL,
    size INTEGER NOT NULL CHECK (size > 0 AND size < 5242880),
    complete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS plan_document_chunks (
    document_id TEXT NOT NULL REFERENCES plan_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0 AND chunk_index < 5),
    content BYTEA NOT NULL CHECK (octet_length(content) > 0 AND octet_length(content) <= 1048576),
    PRIMARY KEY (document_id, chunk_index)
  )`;
  await sql`ALTER TABLE annual_plans ADD COLUMN IF NOT EXISTS document_id TEXT REFERENCES plan_documents(id) ON DELETE SET NULL`;
}
