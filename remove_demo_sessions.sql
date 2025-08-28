-- Remove all demo deep work sessions
-- This script removes sessions that were created for testing/demo purposes

-- Delete sessions with demo-related titles
DELETE FROM public.deepwork_sessions 
WHERE title LIKE '%Demo%' 
   OR title LIKE '%Test%'
   OR title LIKE 'Deep Work Session - %'
   OR description LIKE '%Demo%'
   OR description LIKE '%Test%'
   OR tags @> '["demo"]'
   OR tags @> '["test"]';

-- Delete sessions created in the last 7 days (likely demo sessions)
DELETE FROM public.deepwork_sessions 
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND (title LIKE '%Deep Work Session%' OR description LIKE '%Intensive%');

-- Show remaining sessions count
SELECT COUNT(*) as remaining_sessions FROM public.deepwork_sessions;

-- Show remaining sessions for verification
SELECT 
  id,
  title,
  description,
  created_at,
  tags
FROM public.deepwork_sessions 
ORDER BY created_at DESC 
LIMIT 10;
