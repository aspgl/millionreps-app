-- ========================================
-- GOAL TRACKING SYSTEM SCHEMA
-- ========================================
-- Integriert mit bestehender Task-Manager und Deep Work Architektur
-- Verwendet JSON-basierte Datenstrukturen für flexible Zielmetriken

-- Migration von alter zu neuer Struktur
DO $$
BEGIN
  -- Prüfe ob alte Tabelle existiert
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_goals') THEN
    -- Erstelle temporäre Tabelle für Migration
    CREATE TEMP TABLE temp_old_goals AS 
    SELECT * FROM public.user_goals;
    
    -- Drop alte Tabelle
    DROP TABLE public.user_goals CASCADE;
    
    RAISE NOTICE 'Alte user_goals Tabelle wurde gelöscht und Daten in temp_old_goals gespeichert';
  END IF;
END $$;

-- Haupttabelle für User-Ziele (neue, erweiterte Version)
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'personal', -- personal, health, finance, career, learning, etc.
  
  -- Zielmetrik (JSON-basiert für Flexibilität)
  goal_metric JSONB NOT NULL, -- {
                              --   "attribute": "weight",
                              --   "unit": "kg", 
                              --   "direction": "decrease", // increase/decrease
                              --   "start_value": 80.0,
                              --   "target_value": 70.0,
                              --   "current_value": 75.0
                              -- }
  
  -- Zeitrahmen
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  
  -- Check-In Einstellungen
  check_in_frequency VARCHAR(50) DEFAULT 'daily', -- daily, weekly, monthly, custom
  check_in_reminder BOOLEAN DEFAULT true,
  last_check_in_date DATE,
  
  -- Status und Fortschritt
  status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, abandoned
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  is_on_track BOOLEAN DEFAULT true,
  
  -- Milestones (JSON Array)
  milestones JSONB DEFAULT '[]', -- [
                                 --   {
                                 --     "id": "uuid",
                                 --     "title": "5kg verloren",
                                 --     "target_value": 75.0,
                                 --     "reward": "Neue Klamotten",
                                 --     "achieved": false,
                                 --     "achieved_at": null
                                 --   }
                                 -- ]
  
  -- Automatische Task-Generierung
  auto_generate_tasks BOOLEAN DEFAULT true,
  task_template JSONB DEFAULT '{}', -- Template für automatisch generierte Tasks
  
  -- Integration mit bestehenden Systemen
  linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  linked_tasks JSONB DEFAULT '[]', -- Array von Task-IDs die mit diesem Ziel verknüpft sind
  
  -- Visualisierung und UI
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'target',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check-In Historie
CREATE TABLE IF NOT EXISTS goal_check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Check-In Daten
  check_in_date DATE NOT NULL,
  current_value DECIMAL(10,2) NOT NULL,
  notes TEXT,
  
  -- Automatische Berechnungen
  progress_percentage DECIMAL(5,2),
  is_on_track BOOLEAN,
  
  -- API-Integration (optional)
  data_source VARCHAR(100), -- 'manual', 'health_api', 'finance_api', etc.
  external_data JSONB, -- Zusätzliche Daten von APIs
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal Activities (für Timeline und Diary Integration)
CREATE TABLE IF NOT EXISTS goal_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  activity_type VARCHAR(50) NOT NULL, -- 'milestone_achieved', 'check_in', 'status_change', 'task_completed'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Verknüpfung mit anderen Systemen
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_session_id UUID REFERENCES deepwork_sessions(id) ON DELETE SET NULL,
  
  metadata JSONB, -- Zusätzliche Daten je nach Activity Type
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal Templates (für schnelle Zielerstellung)
CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  
  -- Template-Daten
  template_data JSONB NOT NULL, -- {
                                --   "goal_metric": {...},
                                --   "check_in_frequency": "daily",
                                --   "milestones": [...],
                                --   "task_template": {...}
                                -- }
  
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES für Performance
-- ========================================

CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_status ON user_goals(status);
CREATE INDEX idx_user_goals_target_date ON user_goals(target_date);
CREATE INDEX idx_user_goals_category ON user_goals(category);
CREATE INDEX idx_goal_check_ins_goal_id ON goal_check_ins(goal_id);
CREATE INDEX idx_goal_check_ins_date ON goal_check_ins(check_in_date);
CREATE INDEX idx_goal_activities_goal_id ON goal_activities(goal_id);
CREATE INDEX idx_goal_activities_created_at ON goal_activities(created_at);
CREATE INDEX idx_goal_templates_category ON goal_templates(category);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- User Goals RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goals" ON user_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON user_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON user_goals FOR DELETE USING (auth.uid() = user_id);

-- Goal Check-Ins RLS
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own check-ins" ON goal_check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check-ins" ON goal_check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own check-ins" ON goal_check_ins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own check-ins" ON goal_check_ins FOR DELETE USING (auth.uid() = user_id);

-- Goal Activities RLS
ALTER TABLE goal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goal activities" ON goal_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal activities" ON goal_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goal activities" ON goal_activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goal activities" ON goal_activities FOR DELETE USING (auth.uid() = user_id);

-- Goal Templates RLS
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public templates" ON goal_templates FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Users can insert own templates" ON goal_templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own templates" ON goal_templates FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own templates" ON goal_templates FOR DELETE USING (auth.uid() = created_by);

-- ========================================
-- FUNCTIONS für Automatisierung
-- ========================================



-- Automatische Task-Generierung basierend auf Goal
CREATE OR REPLACE FUNCTION generate_goal_tasks(goal_uuid UUID)
RETURNS VOID AS $$
DECLARE
  goal_record RECORD;
  task_template JSONB;
  new_task_id UUID;
  task_title TEXT;
  task_description TEXT;
BEGIN
  -- Hole Goal-Daten
  SELECT * INTO goal_record FROM user_goals WHERE id = goal_uuid;
  
  IF NOT FOUND OR NOT goal_record.auto_generate_tasks THEN
    RETURN;
  END IF;
  
  task_template := goal_record.task_template;
  
  -- Generiere Tasks basierend auf Template
  -- Beispiel: Tägliche Check-Ins, wöchentliche Reviews, etc.
  IF task_template ? 'daily_tasks' THEN
    FOR task_title, task_description IN 
      SELECT * FROM jsonb_each(task_template->'daily_tasks')
    LOOP
      INSERT INTO tasks (user_id, project_id, title, description, status_id, priority, tags)
      VALUES (
        goal_record.user_id,
        goal_record.linked_project_id,
        task_title,
        task_description,
        (SELECT id FROM task_statuses WHERE name = 'not_started'),
        'medium',
        ARRAY['goal', goal_record.title]
      ) RETURNING id INTO new_task_id;
      
      -- Verknüpfe Task mit Goal
      UPDATE user_goals 
      SET linked_tasks = linked_tasks || jsonb_build_array(new_task_id)
      WHERE id = goal_uuid;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Milestone Check und Benachrichtigung
CREATE OR REPLACE FUNCTION check_goal_milestones(goal_uuid UUID)
RETURNS VOID AS $$
DECLARE
  goal_record RECORD;
  milestone JSONB;
  current_value DECIMAL(10,2);
  target_value DECIMAL(10,2);
  direction TEXT;
  milestone_achieved BOOLEAN;
  milestone_index INTEGER;
  updated_milestones JSONB;
BEGIN
  -- Hole Goal-Daten
  SELECT * INTO goal_record FROM user_goals WHERE id = goal_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  current_value := (goal_record.goal_metric->>'current_value')::DECIMAL;
  direction := goal_record.goal_metric->>'direction';
  updated_milestones := goal_record.milestones;
  
  -- Prüfe alle Milestones
  FOR milestone_index IN 0..jsonb_array_length(goal_record.milestones)-1
  LOOP
    milestone := goal_record.milestones->milestone_index;
    
    -- Überspringe bereits erreichte Milestones
    IF (milestone->>'achieved')::BOOLEAN THEN
      CONTINUE;
    END IF;
    
    target_value := (milestone->>'target_value')::DECIMAL;
    
    -- Prüfe ob Milestone erreicht wurde
    IF direction = 'increase' THEN
      milestone_achieved := current_value >= target_value;
    ELSE
      milestone_achieved := current_value <= target_value;
    END IF;
    
    -- Wenn Milestone erreicht wurde
    IF milestone_achieved THEN
      -- Update Milestone Status
      updated_milestones := jsonb_set(
        updated_milestones,
        ARRAY[milestone_index::TEXT],
        milestone || jsonb_build_object(
          'achieved', true,
          'achieved_at', NOW()
        )
      );
      
      -- Erstelle Activity Record
      INSERT INTO goal_activities (goal_id, user_id, activity_type, title, description, metadata)
      VALUES (
        goal_uuid,
        goal_record.user_id,
        'milestone_achieved',
        'Milestone erreicht: ' || (milestone->>'title'),
        'Gratulation! Du hast den Meilenstein "' || (milestone->>'title') || '" erreicht.',
        jsonb_build_object(
          'milestone_id', milestone->>'id',
          'reward', milestone->>'reward',
          'target_value', target_value,
          'current_value', current_value
        )
      );
    END IF;
  END LOOP;
  
  -- Update milestones wenn Änderungen gemacht wurden
  IF updated_milestones != goal_record.milestones THEN
    UPDATE user_goals 
    SET milestones = updated_milestones
    WHERE id = goal_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS für Automatisierung
-- ========================================

-- Trigger für automatische Fortschrittsberechnung bei Check-Ins
CREATE OR REPLACE FUNCTION update_goal_progress_on_checkin()
RETURNS TRIGGER AS $$
DECLARE
  goal_record RECORD;
  start_value DECIMAL(10,2);
  target_value DECIMAL(10,2);
  current_value DECIMAL(10,2);
  direction TEXT;
  progress_percentage DECIMAL(5,2);
  start_date DATE;
  target_date DATE;
  total_days INTEGER;
  elapsed_days INTEGER;
  time_progress DECIMAL(5,2);
  is_on_track BOOLEAN;
BEGIN
  -- Hole Goal-Daten
  SELECT * INTO goal_record FROM user_goals WHERE id = NEW.goal_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Extrahiere Werte aus goal_metric
  start_value := (goal_record.goal_metric->>'start_value')::DECIMAL;
  target_value := (goal_record.goal_metric->>'target_value')::DECIMAL;
  current_value := NEW.current_value;
  direction := goal_record.goal_metric->>'direction';
  start_date := goal_record.start_date;
  target_date := goal_record.target_date;
  
  -- Berechne Fortschritt
  IF direction = 'increase' THEN
    IF target_value > start_value THEN
      progress_percentage := ((current_value - start_value) / (target_value - start_value)) * 100;
    ELSE
      progress_percentage := 0;
    END IF;
  ELSE
    IF start_value > target_value THEN
      progress_percentage := ((start_value - current_value) / (start_value - target_value)) * 100;
    ELSE
      progress_percentage := 0;
    END IF;
  END IF;
  
  -- Begrenze auf 0-100%
  progress_percentage := GREATEST(0, LEAST(100, progress_percentage));
  
  -- Berechne Zeit-Fortschritt
  total_days := target_date - start_date;
  elapsed_days := CURRENT_DATE - start_date;
  
  IF total_days > 0 THEN
    time_progress := (elapsed_days::DECIMAL / total_days::DECIMAL) * 100;
  ELSE
    time_progress := 100;
  END IF;
  
  time_progress := GREATEST(0, LEAST(100, time_progress));
  
  -- Bestimme ob on track
  is_on_track := progress_percentage >= time_progress;
  
  -- Update Goal mit neuen Werten
  UPDATE user_goals 
  SET 
    goal_metric = jsonb_set(goal_metric, '{current_value}', to_jsonb(current_value)),
    progress_percentage = progress_percentage,
    is_on_track = is_on_track,
    last_check_in_date = NEW.check_in_date,
    updated_at = NOW()
  WHERE id = NEW.goal_id;
  
  -- Prüfe Milestones
  PERFORM check_goal_milestones(NEW.goal_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_goal_progress 
  AFTER INSERT OR UPDATE ON goal_check_ins
  FOR EACH ROW EXECUTE FUNCTION update_goal_progress_on_checkin();

-- Trigger für updated_at
CREATE TRIGGER update_user_goals_updated_at 
  BEFORE UPDATE ON user_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_templates_updated_at 
  BEFORE UPDATE ON goal_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INITIAL DATA - Goal Templates
-- ========================================

-- Fitness/Health Templates
INSERT INTO goal_templates (name, description, category, template_data, is_public) VALUES
('Gewicht verlieren', 'Gesundes Abnehmen mit täglichen Check-Ins', 'health', 
'{
  "goal_metric": {
    "attribute": "weight",
    "unit": "kg",
    "direction": "decrease"
  },
  "check_in_frequency": "daily",
  "milestones": [
    {"title": "Erste 2kg", "target_value": 78.0, "reward": "Neue Sportkleidung"},
    {"title": "Halbzeit", "target_value": 75.0, "reward": "Massage"},
    {"title": "Ziel erreicht", "target_value": 70.0, "reward": "Urlaub"}
  ],
  "task_template": {
    "daily_tasks": {
      "Gewicht tracken": "Tägliche Gewichtsmessung und Dokumentation",
      "Wasser trinken": "Mindestens 2L Wasser pro Tag",
      "Bewegung": "30 Minuten Bewegung oder Sport"
    }
  }
}', true),

('Muskelmasse aufbauen', 'Gezielter Muskelaufbau mit Krafttraining', 'health',
'{
  "goal_metric": {
    "attribute": "muscle_mass",
    "unit": "kg",
    "direction": "increase"
  },
  "check_in_frequency": "weekly",
  "milestones": [
    {"title": "Erste 2kg Muskelmasse", "target_value": 72.0, "reward": "Neue Gewichte"},
    {"title": "5kg Muskelmasse", "target_value": 75.0, "reward": "Personal Trainer Session"}
  ],
  "task_template": {
    "daily_tasks": {
      "Krafttraining": "3x pro Woche Krafttraining",
      "Protein": "Mindestens 1.6g Protein pro kg Körpergewicht",
      "Regeneration": "Ausreichend Schlaf und Ruhe"
    }
  }
}', true),

-- Finance Templates
('Sparen für Urlaub', 'Gezieltes Sparen für den nächsten Urlaub', 'finance',
'{
  "goal_metric": {
    "attribute": "savings",
    "unit": "€",
    "direction": "increase"
  },
  "check_in_frequency": "weekly",
  "milestones": [
    {"title": "25% gespart", "target_value": 500.0, "reward": "Kleiner Ausflug"},
    {"title": "50% gespart", "target_value": 1000.0, "reward": "Restaurantbesuch"},
    {"title": "Ziel erreicht", "target_value": 2000.0, "reward": "Urlaub buchen!"}
  ],
  "task_template": {
    "daily_tasks": {
      "Ausgaben tracken": "Tägliche Ausgaben dokumentieren",
      "Sparplan": "Wöchentlich 100€ zur Seite legen"
    }
  }
}', true),

-- Learning Templates
('Neue Sprache lernen', 'Strukturiertes Sprachenlernen', 'learning',
'{
  "goal_metric": {
    "attribute": "study_hours",
    "unit": "hours",
    "direction": "increase"
  },
  "check_in_frequency": "daily",
  "milestones": [
    {"title": "Erste 10 Stunden", "target_value": 10.0, "reward": "Neues Lehrbuch"},
    {"title": "50 Stunden", "target_value": 50.0, "reward": "Sprachkurs"},
    {"title": "100 Stunden", "target_value": 100.0, "reward": "Auslandsreise"}
  ],
  "task_template": {
    "daily_tasks": {
      "Sprachübung": "30 Minuten täglich üben",
      "Vokabeln": "10 neue Vokabeln lernen",
      "Konversation": "Wöchentlich mit Muttersprachler sprechen"
    }
  }
}', true);

-- ========================================
-- HELPER FUNCTIONS für Frontend
-- ========================================

-- Get User Goal Statistics
CREATE OR REPLACE FUNCTION get_user_goal_stats(user_uuid UUID)
RETURNS TABLE (
  total_goals BIGINT,
  active_goals BIGINT,
  completed_goals BIGINT,
  on_track_goals BIGINT,
  overdue_goals BIGINT,
  avg_progress DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_goals,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_goals,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_goals,
    COUNT(CASE WHEN is_on_track = true AND status = 'active' THEN 1 END) as on_track_goals,
    COUNT(CASE WHEN target_date < CURRENT_DATE AND status = 'active' THEN 1 END) as overdue_goals,
    ROUND(AVG(progress_percentage), 1) as avg_progress
  FROM user_goals
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Goals with Progress Data
CREATE OR REPLACE FUNCTION get_user_goals_with_progress(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  goal_metric JSONB,
  start_date DATE,
  target_date DATE,
  status TEXT,
  progress_percentage DECIMAL(5,2),
  is_on_track BOOLEAN,
  days_remaining INTEGER,
  time_progress_percentage DECIMAL(5,2),
  color TEXT,
  icon TEXT,
  milestones JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ug.id,
    ug.title,
    ug.description,
    ug.category,
    ug.goal_metric,
    ug.start_date,
    ug.target_date,
    ug.status,
    ug.progress_percentage,
    ug.is_on_track,
    (ug.target_date - CURRENT_DATE) as days_remaining,
    CASE 
      WHEN (ug.target_date - ug.start_date) = 0 THEN 0
      ELSE ((CURRENT_DATE - ug.start_date)::DECIMAL / (ug.target_date - ug.start_date)::DECIMAL) * 100
    END as time_progress_percentage,
    ug.color,
    ug.icon,
    ug.milestones,
    ug.created_at
  FROM user_goals ug
  WHERE ug.user_id = user_uuid
  ORDER BY ug.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- MIGRATION FUNCTIONS
-- ========================================

-- Funktion zum Migrieren alter Goal-Daten (falls vorhanden)
CREATE OR REPLACE FUNCTION migrate_old_goals()
RETURNS INTEGER AS $$
DECLARE
  old_goal RECORD;
  new_goal_id UUID;
  migrated_count INTEGER := 0;
BEGIN
  -- Prüfe ob temporäre Tabelle existiert
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'temp_old_goals') THEN
    RAISE NOTICE 'Keine alten Goal-Daten zum Migrieren gefunden';
    RETURN 0;
  END IF;

  -- Migriere jeden alten Goal
  FOR old_goal IN SELECT * FROM temp_old_goals
  LOOP
    -- Erstelle neuen Goal mit erweiterter Struktur
    INSERT INTO user_goals (
      user_id,
      title,
      description,
      category,
      goal_metric,
      start_date,
      target_date,
      status,
      progress_percentage,
      is_on_track,
      color,
      icon,
      created_at,
      updated_at
    ) VALUES (
      old_goal.user_id,
      'Migriertes Ziel: ' || old_goal.goal_type,
      'Automatisch migriert von alter Struktur',
      'personal',
      jsonb_build_object(
        'attribute', old_goal.goal_type,
        'unit', 'units',
        'direction', 'increase',
        'start_value', 0,
        'target_value', old_goal.target_value,
        'current_value', COALESCE(old_goal.current_value, 0)
      ),
      old_goal.start_date,
      COALESCE(old_goal.end_date, old_goal.start_date + INTERVAL '30 days'),
      CASE WHEN old_goal.is_active THEN 'active' ELSE 'paused' END,
      CASE 
        WHEN old_goal.target_value = 0 THEN 0
        ELSE (COALESCE(old_goal.current_value, 0)::DECIMAL / old_goal.target_value::DECIMAL) * 100
      END,
      CASE 
        WHEN old_goal.target_value = 0 THEN true
        ELSE COALESCE(old_goal.current_value, 0) >= old_goal.target_value
      END,
      '#6366f1',
      'target',
      old_goal.created_at,
      old_goal.updated_at
    ) RETURNING id INTO new_goal_id;

    migrated_count := migrated_count + 1;
    RAISE NOTICE 'Goal migriert: % -> %', old_goal.id, new_goal_id;
  END LOOP;

  -- Lösche temporäre Tabelle
  DROP TABLE IF EXISTS temp_old_goals;
  
  RAISE NOTICE 'Migration abgeschlossen: % Goals migriert', migrated_count;
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Führe Migration aus (falls alte Daten vorhanden)
SELECT migrate_old_goals();
