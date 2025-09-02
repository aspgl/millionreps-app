-- Documents Schema Rollback Script
-- Führe diese Queries aus, um das komplette documents_schema rückgängig zu machen

-- 1. Alle Trigger löschen
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_document_comments_updated_at ON document_comments;
DROP TRIGGER IF EXISTS update_document_statistics ON documents;
DROP TRIGGER IF EXISTS update_document_favorites_count ON document_favorites;
DROP TRIGGER IF EXISTS increment_document_views_count ON document_activities;

-- 2. Alle Functions löschen (nur documents-spezifische)
DROP FUNCTION IF EXISTS update_document_stats();
DROP FUNCTION IF EXISTS update_favorites_count();
DROP FUNCTION IF EXISTS increment_document_views();

-- update_updated_at_column() NICHT löschen - wird von anderen Tabellen verwendet!

-- 3. Alle Indizes löschen
DROP INDEX IF EXISTS idx_documents_owner_id;
DROP INDEX IF EXISTS idx_documents_category;
DROP INDEX IF EXISTS idx_documents_tags;
DROP INDEX IF EXISTS idx_documents_created_at;
DROP INDEX IF EXISTS idx_documents_updated_at;
DROP INDEX IF EXISTS idx_documents_is_public;
DROP INDEX IF EXISTS idx_documents_is_archived;
DROP INDEX IF EXISTS idx_documents_collaborators;
DROP INDEX IF EXISTS idx_documents_shared_with;
DROP INDEX IF EXISTS idx_documents_title_lower;
DROP INDEX IF EXISTS idx_documents_description_lower;

DROP INDEX IF EXISTS idx_document_versions_document_id;
DROP INDEX IF EXISTS idx_document_versions_version_number;

DROP INDEX IF EXISTS idx_document_comments_document_id;
DROP INDEX IF EXISTS idx_document_comments_author_id;
DROP INDEX IF EXISTS idx_document_comments_parent_id;

DROP INDEX IF EXISTS idx_document_favorites_document_id;
DROP INDEX IF EXISTS idx_document_favorites_user_id;

DROP INDEX IF EXISTS idx_document_shares_document_id;
DROP INDEX IF EXISTS idx_document_shares_shared_with;

DROP INDEX IF EXISTS idx_document_activities_document_id;
DROP INDEX IF EXISTS idx_document_activities_user_id;
DROP INDEX IF EXISTS idx_document_activities_type;
DROP INDEX IF EXISTS idx_document_activities_created_at;

-- 4. Alle Tabellen löschen (in der richtigen Reihenfolge wegen Foreign Keys)
DROP TABLE IF EXISTS document_activities CASCADE;
DROP TABLE IF EXISTS document_shares CASCADE;
DROP TABLE IF EXISTS document_favorites CASCADE;
DROP TABLE IF EXISTS document_comments CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_templates CASCADE;
DROP TABLE IF EXISTS document_categories CASCADE;
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- 5. Optional: UUID Extension entfernen (falls nicht mehr benötigt)
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- Bestätigung
SELECT 'Documents schema successfully removed!' as status;
