-- Calendar Schema Rollback Script
-- Führe diese Queries aus, um das bestehende calendar_schema zu entfernen

-- 1. Alle Trigger löschen
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;

-- 2. Alle Functions löschen
DROP FUNCTION IF EXISTS update_calendar_events_updated_at();

-- 3. Alle Indizes löschen
DROP INDEX IF EXISTS idx_calendar_events_user_id;
DROP INDEX IF EXISTS idx_calendar_events_start_time;
DROP INDEX IF EXISTS idx_calendar_events_category;
DROP INDEX IF EXISTS idx_calendar_events_user_start;
DROP INDEX IF EXISTS idx_calendar_events_shared_with;

-- 4. Tabelle löschen
DROP TABLE IF EXISTS calendar_events CASCADE;

-- Bestätigung
SELECT 'Calendar schema successfully removed!' as status;
