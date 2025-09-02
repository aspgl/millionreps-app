-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_create_routine_calendar_events ON daily_routines;

-- Also drop the function if it exists
DROP FUNCTION IF EXISTS create_routine_calendar_events();
