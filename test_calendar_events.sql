-- Test script to check calendar_events table functionality

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'calendar_events'
) as table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'calendar_events'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'calendar_events';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'calendar_events';

-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'get_user_events%';

-- Test insert (this will fail if RLS is working properly without auth)
-- INSERT INTO public.calendar_events (user_id, title, start_time, end_time) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test Event', NOW(), NOW() + INTERVAL '1 hour');

-- Show current user events count (if any exist)
SELECT COUNT(*) as total_events FROM public.calendar_events;
