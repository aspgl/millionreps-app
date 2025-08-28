-- Clean up deep work sessions - Remove demo and test sessions
-- This script removes sessions that were created for testing/demo purposes

-- First, show current sessions count
SELECT COUNT(*) as total_sessions FROM public.deepwork_sessions;

-- Show sessions by user (to identify which ones to keep)
SELECT 
  user_id,
  COUNT(*) as session_count,
  MIN(created_at) as first_session,
  MAX(created_at) as last_session
FROM public.deepwork_sessions 
GROUP BY user_id
ORDER BY session_count DESC;

-- Delete sessions with demo-related content
DELETE FROM public.deepwork_sessions 
WHERE title LIKE '%Demo%' 
   OR title LIKE '%Test%'
   OR title LIKE 'Deep Work Session - %'
   OR description LIKE '%Demo%'
   OR description LIKE '%Test%'
   OR description LIKE '%Intensive%'
   OR tags @> '["demo"]'
   OR tags @> '["test"]';

-- Delete sessions created in the last 7 days with specific patterns (likely demo sessions)
DELETE FROM public.deepwork_sessions 
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND (
    title LIKE '%Deep Work Session%' 
    OR description LIKE '%Intensive%'
    OR description LIKE '%Studium%'
    OR description LIKE '%Strategische%'
  );

-- Delete sessions with specific demo titles
DELETE FROM public.deepwork_sessions 
WHERE title IN (
  'Deep Work Session - Projektarbeit',
  'Deep Work Session - Lernen', 
  'Deep Work Session - Planung'
);

-- Show remaining sessions
SELECT COUNT(*) as remaining_sessions FROM public.deepwork_sessions;

-- Show remaining sessions for verification
SELECT 
  id,
  user_id,
  title,
  description,
  created_at,
  tags
FROM public.deepwork_sessions 
ORDER BY created_at DESC 
LIMIT 10;
