import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determine the correct redirect URL based on environment
const getRedirectUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5173'; // Development
  }
  // Production - use the current domain
  return window.location.origin;
};

// Utility function to get redirect URL with path
export const getAuthRedirectUrl = (path = '/') => {
  const baseUrl = getRedirectUrl();
  return baseUrl + path;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: getRedirectUrl(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
