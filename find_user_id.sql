-- Helper script to find user IDs from profiles table
-- Run this first to get your user ID for testing

-- Show all users in profiles table
SELECT 
    id,
    firstname,
    lastname,
    username,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Show count of users
SELECT COUNT(*) as total_users FROM public.profiles;

-- Show user with most recent activity (if you have activity tracking)
-- SELECT 
--     p.id,
--     p.firstname,
--     p.lastname,
--     p.username,
--     p.created_at
-- FROM public.profiles p
-- ORDER BY p.created_at DESC
-- LIMIT 1;
