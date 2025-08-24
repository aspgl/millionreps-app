-- ========================================
-- TASK MANAGER DATABASE SCHEMA
-- ========================================

-- Projekte Tabelle
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'folder',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Status Tabelle (Backlog, Not Started, In Progress, Paused, Completed)
CREATE TABLE IF NOT EXISTS task_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Tasks Tabelle
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status_id UUID REFERENCES task_statuses(id) ON DELETE RESTRICT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  estimated_hours DECIMAL(4,1),
  actual_hours DECIMAL(4,1) DEFAULT 0,
  tags TEXT[], -- Array von Tags
  activities JSONB DEFAULT '[]', -- JSON Array für Activities (Fallback)
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern VARCHAR(100), -- 'daily', 'weekly', 'monthly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Task Steps/Progress Tabelle
CREATE TABLE IF NOT EXISTS task_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  hours_spent DECIMAL(4,2) DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Comments Tabelle
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Activities Tabelle (für Status Changes, Progress Updates, etc.)
CREATE TABLE IF NOT EXISTS task_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'status_change', 'progress_update', 'comment', 'time_log', 'next_action'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  metadata JSONB, -- Für zusätzliche Daten wie alte/neue Status, Zeit, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INITIAL DATA
-- ========================================

-- Task Statuses einfügen
INSERT INTO task_statuses (name, display_name, color, icon, sort_order) VALUES
('backlog', 'Backlog', '#6b7280', 'archive', 1),
('not_started', 'Nicht begonnen', '#ef4444', 'circle', 2),
('in_progress', 'In Bearbeitung', '#f59e0b', 'play-circle', 3),
('paused', 'Pausiert', '#8b5cf6', 'pause-circle', 4),
('review', 'In Review', '#06b6d4', 'eye', 5),
('completed', 'Erledigt', '#10b981', 'check-circle', 6);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Projects RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Task Steps RLS
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own task steps" ON task_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task steps" ON task_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task steps" ON task_steps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task steps" ON task_steps FOR DELETE USING (auth.uid() = user_id);

-- Task Comments RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own task comments" ON task_comments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task comments" ON task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task comments" ON task_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task comments" ON task_comments FOR DELETE USING (auth.uid() = user_id);

-- Task Activities RLS
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own task activities" ON task_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task activities" ON task_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task activities" ON task_activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task activities" ON task_activities FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- INDEXES für Performance
-- ========================================

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status_id ON tasks(status_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_task_activities_created_at ON task_activities(created_at);

-- ========================================
-- FUNCTIONS für Statistiken
-- ========================================

-- Task Statistiken pro User
CREATE OR REPLACE FUNCTION get_user_task_stats(user_uuid UUID)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  in_progress_tasks BIGINT,
  overdue_tasks BIGINT,
  total_hours_estimated DECIMAL,
  total_hours_spent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN t.status_id = (SELECT id FROM task_statuses WHERE name = 'completed') THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status_id IN (SELECT id FROM task_statuses WHERE name IN ('in_progress', 'review')) THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status_id != (SELECT id FROM task_statuses WHERE name = 'completed') THEN 1 END) as overdue_tasks,
    COALESCE(SUM(t.estimated_hours), 0) as total_hours_estimated,
    COALESCE(SUM(t.actual_hours), 0) as total_hours_spent
  FROM tasks t
  WHERE t.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS für updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- UPDATE EXISTING TABLES (if needed)
-- ========================================

-- Add activities JSON column to existing tasks table (if not exists)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]';
