-- Erweiterte Tagesroutinen Schema
-- Führe diese SQL-Befehle in Supabase aus

-- 1. Füge neue Spalten zur daily_routines Tabelle hinzu
ALTER TABLE daily_routines 
ADD COLUMN IF NOT EXISTS weekdays TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
ADD COLUMN IF NOT EXISTS is_weekend_routine BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_weekday_routine BOOLEAN DEFAULT false;

-- 2. Füge neue Spalten zur routine_habits Tabelle hinzu
ALTER TABLE routine_habits 
ADD COLUMN IF NOT EXISTS position_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_custom_habit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_icon TEXT DEFAULT 'Target';

-- 3. Aktualisiere die Zeitblock-Constraint
ALTER TABLE routine_habits 
DROP CONSTRAINT IF EXISTS routine_habits_time_block_check;

ALTER TABLE routine_habits 
ADD CONSTRAINT routine_habits_time_block_check 
CHECK (time_block IN ('morning', 'forenoon', 'noon', 'afternoon', 'evening'));

-- 4. Erstelle Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_routine_habits_order ON routine_habits(routine_id, position_order);
CREATE INDEX IF NOT EXISTS idx_daily_routines_weekdays ON daily_routines USING GIN (weekdays);

-- 5. Erstelle routine_calendar_events Tabelle (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS routine_calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES routine_habits(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Erstelle Indizes für Kalender-Events
CREATE INDEX IF NOT EXISTS idx_routine_calendar_events_user_date ON routine_calendar_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_routine_calendar_events_habit ON routine_calendar_events(habit_id);

-- 7. Aktiviere RLS für Kalender-Events
ALTER TABLE routine_calendar_events ENABLE ROW LEVEL SECURITY;

-- 8. Erstelle Policies für Kalender-Events (nur wenn sie nicht existieren)
DO $$
BEGIN
  -- Policy für SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'routine_calendar_events' 
    AND policyname = 'Users can view their own calendar events'
  ) THEN
    CREATE POLICY "Users can view their own calendar events" ON routine_calendar_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Policy für INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'routine_calendar_events' 
    AND policyname = 'Users can insert their own calendar events'
  ) THEN
    CREATE POLICY "Users can insert their own calendar events" ON routine_calendar_events
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy für UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'routine_calendar_events' 
    AND policyname = 'Users can update their own calendar events'
  ) THEN
    CREATE POLICY "Users can update their own calendar events" ON routine_calendar_events
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Policy für DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'routine_calendar_events' 
    AND policyname = 'Users can delete their own calendar events'
  ) THEN
    CREATE POLICY "Users can delete their own calendar events" ON routine_calendar_events
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9. Füge neue Templates hinzu (falls nicht vorhanden)
INSERT INTO habit_templates (name, description, category, time_block, duration_minutes, is_popular) VALUES
-- Vormittag (forenoon)
('Fokussierte Arbeit', 'Intensive Arbeitsphase ohne Ablenkungen', 'productivity', 'forenoon', 90, true),
('Meeting-Vorbereitung', 'Vorbereitung für wichtige Meetings', 'productivity', 'forenoon', 30, true),
('Kreative Arbeit', 'Zeit für kreative Projekte und Ideen', 'productivity', 'forenoon', 60, true),

-- Mittag (noon)
('Mittagspause', 'Erholsame Pause mit gesundem Essen', 'health', 'noon', 45, true),
('Kurze Bewegung', 'Schnelle Dehnübungen oder Spaziergang', 'fitness', 'noon', 15, true),
('Soziale Zeit', 'Kontakt mit Kollegen oder Freunden', 'wellness', 'noon', 30, true),

-- Nachmittag (afternoon)
('Nachmittags-Energie', 'Energie-Boost für den Nachmittag', 'health', 'afternoon', 20, true),
('Planung', 'Planung für den nächsten Tag', 'productivity', 'afternoon', 30, true),
('Lern-Session', 'Intensive Lernphase am Nachmittag', 'learning', 'afternoon', 60, true);

-- 10. Aktualisiere bestehende Routinen mit Standard-Wochentagen
UPDATE daily_routines 
SET weekdays = ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
WHERE weekdays IS NULL;

-- 11. Erstelle Funktion zum Aktualisieren der Wochentag-Flags
CREATE OR REPLACE FUNCTION update_weekday_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Aktualisiere is_weekend_routine basierend auf weekdays
  NEW.is_weekend_routine := NEW.weekdays @> ARRAY['saturday', 'sunday'] AND 
                           NOT (NEW.weekdays @> ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  
  -- Aktualisiere is_weekday_routine basierend auf weekdays
  NEW.is_weekday_routine := NEW.weekdays @> ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] AND 
                           NOT (NEW.weekdays @> ARRAY['saturday', 'sunday']);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Erstelle Trigger für automatische Wochentag-Flag-Aktualisierung
DROP TRIGGER IF EXISTS trigger_update_weekday_flags ON daily_routines;
CREATE TRIGGER trigger_update_weekday_flags
  BEFORE INSERT OR UPDATE ON daily_routines
  FOR EACH ROW
  EXECUTE FUNCTION update_weekday_flags();

-- 13. Erstelle Funktion für automatische Kalender-Events
CREATE OR REPLACE FUNCTION create_routine_calendar_events()
RETURNS TRIGGER AS $$
DECLARE
  habit_record RECORD;
  current_weekday TEXT;
  event_date DATE;
  i INTEGER;
BEGIN
  -- Wenn eine Routine aktiviert wird, erstelle Kalender-Events für die nächsten 7 Tage
  IF NEW.is_active = true AND OLD.is_active = false THEN
    -- Hole alle Habits für diese Routine
    FOR habit_record IN 
      SELECT * FROM routine_habits WHERE routine_id = NEW.id
    LOOP
      -- Erstelle Events für die nächsten 7 Tage
      FOR i IN 0..6 LOOP
        event_date := CURRENT_DATE + (i || ' days')::INTERVAL;
        
        -- Prüfe, ob der Wochentag für diese Routine aktiviert ist
        current_weekday := LOWER(TO_CHAR(event_date, 'day'));
        
        -- Wenn Wochentag in der Routine aktiviert ist oder alle Wochentage aktiviert sind
        IF NEW.weekdays @> ARRAY[current_weekday] OR array_length(NEW.weekdays, 1) = 7 THEN
          INSERT INTO routine_calendar_events (user_id, routine_id, habit_id, event_date, start_time, end_time)
          VALUES (
            NEW.user_id,
            NEW.id,
            habit_record.id,
            event_date,
            CASE habit_record.time_block
              WHEN 'morning' THEN '07:00'::TIME
              WHEN 'forenoon' THEN '09:00'::TIME
              WHEN 'noon' THEN '12:00'::TIME
              WHEN 'afternoon' THEN '15:00'::TIME
              WHEN 'evening' THEN '19:00'::TIME
            END,
            CASE habit_record.time_block
              WHEN 'morning' THEN '07:00'::TIME + (COALESCE(habit_record.estimated_duration, 15) || ' minutes')::INTERVAL
              WHEN 'forenoon' THEN '09:00'::TIME + (COALESCE(habit_record.estimated_duration, 15) || ' minutes')::INTERVAL
              WHEN 'noon' THEN '12:00'::TIME + (COALESCE(habit_record.estimated_duration, 15) || ' minutes')::INTERVAL
              WHEN 'afternoon' THEN '15:00'::TIME + (COALESCE(habit_record.estimated_duration, 15) || ' minutes')::INTERVAL
              WHEN 'evening' THEN '19:00'::TIME + (COALESCE(habit_record.estimated_duration, 15) || ' minutes')::INTERVAL
            END
          );
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Erstelle Trigger für automatische Kalender-Events
DROP TRIGGER IF EXISTS trigger_create_routine_calendar_events ON daily_routines;
CREATE TRIGGER trigger_create_routine_calendar_events
  AFTER UPDATE ON daily_routines
  FOR EACH ROW
  EXECUTE FUNCTION create_routine_calendar_events();

-- 15. Bestätige die Änderungen
SELECT 'Schema erfolgreich aktualisiert!' as status;
