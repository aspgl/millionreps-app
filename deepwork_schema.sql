-- Deep Work Tracker Schema
-- Run these commands in your Supabase SQL Editor

-- 1. Session Types Table
CREATE TABLE IF NOT EXISTS deepwork_session_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_duration INTEGER NOT NULL, -- in minutes
  default_break_duration INTEGER NOT NULL, -- in minutes
  color VARCHAR(7) DEFAULT '#6366f1', -- hex color
  icon VARCHAR(50) DEFAULT 'brain',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Deep Work Sessions Table
CREATE TABLE IF NOT EXISTS deepwork_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type_id UUID REFERENCES deepwork_session_types(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal TEXT,
  tags TEXT[], -- array of tags
  planned_duration INTEGER NOT NULL, -- in minutes
  actual_duration INTEGER, -- in minutes (filled when completed)
  break_duration INTEGER DEFAULT 0, -- in minutes
  focus_score INTEGER, -- 0-100
  status VARCHAR(20) DEFAULT 'planned', -- planned, active, paused, completed, cancelled
  started_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Session Events Table (for detailed tracking)
CREATE TABLE IF NOT EXISTS deepwork_session_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES deepwork_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- start, pause, resume, break_start, break_end, complete, cancel, distraction
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB, -- additional event data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Focus Metrics Table
CREATE TABLE IF NOT EXISTS deepwork_focus_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES deepwork_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  focus_level INTEGER, -- 0-100
  distractions_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. User Deep Work Settings
CREATE TABLE IF NOT EXISTS deepwork_user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_session_type_id UUID REFERENCES deepwork_session_types(id),
  auto_start_breaks BOOLEAN DEFAULT true,
  auto_start_sessions BOOLEAN DEFAULT false,
  notification_sounds BOOLEAN DEFAULT true,
  focus_reminders BOOLEAN DEFAULT true,
  break_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default session types
INSERT INTO deepwork_session_types (name, description, default_duration, default_break_duration, color, icon) VALUES
('Deep Work', 'Intensive Fokus-Session für komplexe Aufgaben', 90, 15, '#8b5cf6', 'brain'),
('Pomodoro', 'Klassische 25/5 Minuten Technik', 25, 5, '#ef4444', 'timer'),
('Flow State', 'Längere Session für maximale Produktivität', 120, 20, '#06b6d4', 'zap'),
('Review Session', 'Kurze Session für Überprüfung und Planung', 30, 10, '#10b981', 'check-circle'),
('Quick Focus', 'Schnelle 15-Minuten Session', 15, 3, '#f59e0b', 'target'),
('Study Session', 'Speziell für Lerninhalte optimiert', 45, 10, '#6366f1', 'book-open');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deepwork_sessions_user_id ON deepwork_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_deepwork_sessions_status ON deepwork_sessions(status);
CREATE INDEX IF NOT EXISTS idx_deepwork_sessions_created_at ON deepwork_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_deepwork_session_events_session_id ON deepwork_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_deepwork_focus_metrics_session_id ON deepwork_focus_metrics(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE deepwork_session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE deepwork_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deepwork_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deepwork_focus_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deepwork_user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Session types are readable by all authenticated users
CREATE POLICY "Session types are viewable by authenticated users" ON deepwork_session_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Sessions are owned by the user who created them
CREATE POLICY "Users can view own sessions" ON deepwork_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON deepwork_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON deepwork_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON deepwork_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Session events are owned by the session owner
CREATE POLICY "Users can view own session events" ON deepwork_session_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deepwork_sessions 
      WHERE deepwork_sessions.id = deepwork_session_events.session_id 
      AND deepwork_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own session events" ON deepwork_session_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deepwork_sessions 
      WHERE deepwork_sessions.id = deepwork_session_events.session_id 
      AND deepwork_sessions.user_id = auth.uid()
    )
  );

-- Focus metrics are owned by the session owner
CREATE POLICY "Users can view own focus metrics" ON deepwork_focus_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deepwork_sessions 
      WHERE deepwork_sessions.id = deepwork_focus_metrics.session_id 
      AND deepwork_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own focus metrics" ON deepwork_focus_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deepwork_sessions 
      WHERE deepwork_sessions.id = deepwork_focus_metrics.session_id 
      AND deepwork_sessions.user_id = auth.uid()
    )
  );

-- User settings are owned by the user
CREATE POLICY "Users can view own settings" ON deepwork_user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON deepwork_user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON deepwork_user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_user_deepwork_stats(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_sessions BIGINT,
  total_duration BIGINT,
  avg_focus_score NUMERIC,
  current_streak INTEGER,
  best_streak INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_sessions,
    COALESCE(SUM(actual_duration), 0) as total_duration,
    ROUND(AVG(focus_score), 1) as avg_focus_score,
    COALESCE(MAX(streak.current_streak), 0) as current_streak,
    COALESCE(MAX(streak.best_streak), 0) as best_streak
  FROM deepwork_sessions ds
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as current_streak,
      MAX(COUNT(*)) OVER () as best_streak
    FROM (
      SELECT 
        user_id,
        DATE(created_at) as session_date,
        ROW_NUMBER() OVER (ORDER BY DATE(created_at) DESC) as rn,
        DATE(created_at) - ROW_NUMBER() OVER (ORDER BY DATE(created_at) DESC) as grp
      FROM deepwork_sessions 
      WHERE user_id = user_uuid 
        AND status = 'completed'
        AND created_at >= NOW() - INTERVAL '30 days'
    ) t
    GROUP BY user_id, grp
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) streak ON ds.user_id = streak.user_id
  WHERE ds.user_id = user_uuid 
    AND ds.created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND ds.status = 'completed';
END;
$$ LANGUAGE plpgsql;

