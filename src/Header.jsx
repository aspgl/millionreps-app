import { Bell, Search, Building2, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("avatar_url, organization(name)")
        .eq("id", user.id)
        .single()
        .then(({ data, error }) => {
          if (!error) {
            setProfile(data);
            setOrganization(data.organization?.name);
          }
        });
    }
  }, [user]);

  return (
    <header className="h-16 flex items-center justify-between border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-6 shadow-sm">
      {/* Left: Organization (if exists) or App Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-secondary hover:text-gray-900 dark:hover:text-dark-text lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {organization ? (
          <>
            <div 
              onClick={() => navigate("/organization")}
              className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-dark-accent/10 rounded-lg border border-indigo-200 dark:border-dark-accent/20 cursor-pointer hover:bg-indigo-100 dark:hover:bg-dark-accent/20 transition-colors"
            >
              <Building2 className="h-4 w-4 text-indigo-600 dark:text-dark-accent" />
              <span className="text-sm font-medium text-indigo-700 dark:text-dark-accent">{organization}</span>
            </div>
          </>
        ) : (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Dashboard</h1>
        )}
      </div>

      {/* Middle: Search */}
      <div className="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-secondary px-3 py-2 text-sm text-gray-600 dark:text-dark-text-secondary w-80">
        <Search className="h-4 w-4 text-gray-400 dark:text-dark-text-secondary" />
        <input
          placeholder="Search..."
          className="w-full bg-transparent placeholder:text-gray-400 dark:placeholder:text-dark-text-secondary focus:outline-none text-gray-900 dark:text-dark-text"
        />
      </div>

      {/* Right: Icons + Avatar */}
      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-dark-card"></span>
        </button>

        {/* Avatar mit Navigation */}
        <img
          onClick={() => navigate("/settings")}
          src={
            profile?.avatar_url || `https://i.pravatar.cc/40?u=${user?.id || "default"}`
          }
          alt="User"
          className="h-8 w-8 rounded-full cursor-pointer object-cover"
        />
      </div>
    </header>
  );
}
