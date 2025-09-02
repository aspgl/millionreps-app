-- Lean Calendar Schema für Supabase
-- Integriert mit der bestehenden profiles Tabelle

-- Enable UUID extension (falls noch nicht aktiviert)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Kalender-Events Tabelle (nur erstellen wenn nicht vorhanden)
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    
    -- Kategorisierung
    category VARCHAR(50) DEFAULT 'general',
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    
    -- Location & Details
    location TEXT,
    url TEXT,
    
    -- Status & Visibility
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, tentative, cancelled
    is_public BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- RRULE format für wiederkehrende Events
    
    -- Ownership & Sharing
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID[] DEFAULT '{}', -- Array von User-IDs
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes für Performance (nur erstellen wenn nicht vorhanden)
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON calendar_events(category);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_shared_with ON calendar_events USING GIN(shared_with);

-- Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Benutzer können ihre eigenen Events sehen
CREATE POLICY "Users can view own events" ON calendar_events
    FOR SELECT USING (auth.uid() = user_id);

-- Benutzer können Events sehen, die mit ihnen geteilt wurden
CREATE POLICY "Users can view shared events" ON calendar_events
    FOR SELECT USING (auth.uid() = ANY(shared_with));

-- Öffentliche Events können von allen gesehen werden
CREATE POLICY "Anyone can view public events" ON calendar_events
    FOR SELECT USING (is_public = true);

-- Benutzer können ihre eigenen Events erstellen
CREATE POLICY "Users can create own events" ON calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Benutzer können ihre eigenen Events bearbeiten
CREATE POLICY "Users can update own events" ON calendar_events
    FOR UPDATE USING (auth.uid() = user_id);

-- Benutzer können ihre eigenen Events löschen
CREATE POLICY "Users can delete own events" ON calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- Function für automatisches updated_at
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger für updated_at (nur erstellen wenn nicht vorhanden)
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_calendar_events_updated_at();

-- Sample Event-Kategorien (nur einfügen wenn Tabelle leer ist)
INSERT INTO calendar_events (title, description, start_time, end_time, category, color, user_id) 
SELECT 
    'Team Meeting', 
    'Wöchentliches Team-Meeting', 
    NOW() + INTERVAL '1 day', 
    NOW() + INTERVAL '1 day' + INTERVAL '1 hour', 
    'meeting', 
    '#10B981', 
    auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM calendar_events LIMIT 1)
ON CONFLICT DO NOTHING;
