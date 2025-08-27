-- Calendar Events Schema for MillionReps
-- This schema handles calendar events with full CRUD operations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    category TEXT NOT NULL DEFAULT 'work' CHECK (category IN ('work', 'health', 'learning', 'finance', 'personal')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    location TEXT,
    attendees TEXT[], -- Array of attendee names
    tags TEXT[], -- Array of tags
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'Calendar',
    is_all_day BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- iCal RRULE format
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON public.calendar_events(category);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON public.calendar_events(user_id, start_time);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON public.calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own events" ON public.calendar_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON public.calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON public.calendar_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON public.calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- Helper Functions

-- Get events for a specific date range
CREATE OR REPLACE FUNCTION get_user_events(
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    category TEXT,
    priority TEXT,
    location TEXT,
    attendees TEXT[],
    tags TEXT[],
    color TEXT,
    icon TEXT,
    is_all_day BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.start_time,
        ce.end_time,
        ce.category,
        ce.priority,
        ce.location,
        ce.attendees,
        ce.tags,
        ce.color,
        ce.icon,
        ce.is_all_day
    FROM public.calendar_events ce
    WHERE ce.user_id = p_user_id
    AND (
        (ce.start_time >= p_start_date AND ce.start_time <= p_end_date) OR
        (ce.end_time >= p_start_date AND ce.end_time <= p_end_date) OR
        (ce.start_time <= p_start_date AND ce.end_time >= p_end_date)
    )
    ORDER BY ce.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get events for a specific day
CREATE OR REPLACE FUNCTION get_user_events_for_day(
    p_user_id UUID,
    p_date DATE
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    category TEXT,
    priority TEXT,
    location TEXT,
    attendees TEXT[],
    tags TEXT[],
    color TEXT,
    icon TEXT,
    is_all_day BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.start_time,
        ce.end_time,
        ce.category,
        ce.priority,
        ce.location,
        ce.attendees,
        ce.tags,
        ce.color,
        ce.icon,
        ce.is_all_day
    FROM public.calendar_events ce
    WHERE ce.user_id = p_user_id
    AND DATE(ce.start_time) = p_date
    ORDER BY ce.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get upcoming events
CREATE OR REPLACE FUNCTION get_user_upcoming_events(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    category TEXT,
    priority TEXT,
    location TEXT,
    attendees TEXT[],
    tags TEXT[],
    color TEXT,
    icon TEXT,
    is_all_day BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.start_time,
        ce.end_time,
        ce.category,
        ce.priority,
        ce.location,
        ce.attendees,
        ce.tags,
        ce.color,
        ce.icon,
        ce.is_all_day
    FROM public.calendar_events ce
    WHERE ce.user_id = p_user_id
    AND ce.start_time >= NOW()
    ORDER BY ce.start_time ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search events
CREATE OR REPLACE FUNCTION search_user_events(
    p_user_id UUID,
    p_search_term TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    category TEXT,
    priority TEXT,
    location TEXT,
    attendees TEXT[],
    tags TEXT[],
    color TEXT,
    icon TEXT,
    is_all_day BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.start_time,
        ce.end_time,
        ce.category,
        ce.priority,
        ce.location,
        ce.attendees,
        ce.tags,
        ce.color,
        ce.icon,
        ce.is_all_day
    FROM public.calendar_events ce
    WHERE ce.user_id = p_user_id
    AND (
        ce.title ILIKE '%' || p_search_term || '%' OR
        ce.description ILIKE '%' || p_search_term || '%' OR
        ce.location ILIKE '%' || p_search_term || '%' OR
        EXISTS (SELECT 1 FROM unnest(ce.tags) tag WHERE tag ILIKE '%' || p_search_term || '%')
    )
    ORDER BY ce.start_time ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for testing (optional)
-- INSERT INTO public.calendar_events (user_id, title, description, start_time, end_time, category, priority, location, attendees, tags, color, icon)
-- VALUES 
--     ('your-user-id-here', 'Deep Work Session', 'Fokus auf Projekt X', '2024-12-15 09:00:00+00', '2024-12-15 12:00:00+00', 'work', 'high', 'Home Office', ARRAY['Max', 'Anna'], ARRAY['fokus', 'produktivität'], '#6366f1', 'Brain'),
--     ('your-user-id-here', 'Gym Training', 'Krafttraining + Cardio', '2024-12-15 17:00:00+00', '2024-12-15 18:30:00+00', 'health', 'medium', 'Fitness Studio', ARRAY[], ARRAY['fitness', 'gesundheit'], '#10b981', 'Heart'),
--     ('your-user-id-here', 'Sprachkurs', 'Spanisch Lektion 5', '2024-12-16 14:00:00+00', '2024-12-16 15:30:00+00', 'learning', 'medium', 'Online', ARRAY['Maria'], ARRAY['sprache', 'lernen'], '#f59e0b', 'BookOpen'),
--     ('your-user-id-here', 'Team Meeting', 'Wöchentliches Standup', '2024-12-17 10:00:00+00', '2024-12-17 11:00:00+00', 'work', 'high', 'Zoom', ARRAY['Team A', 'Team B'], ARRAY['meeting', 'team'], '#6366f1', 'Briefcase'),
--     ('your-user-id-here', 'Investition Review', 'Portfolio Analyse', '2024-12-18 16:00:00+00', '2024-12-18 17:00:00+00', 'finance', 'low', 'Home', ARRAY[], ARRAY['finanzen', 'investition'], '#ef4444', 'DollarSign');
