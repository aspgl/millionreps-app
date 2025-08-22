import { Bell, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data, error }) => {
          if (!error) setProfile(data);
        });
    }
  }, [user]);

  return (
    <header className="h-16 flex items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      {/* Left: App Title */}
      <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>

      {/* Middle: Search */}
      <div className="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 w-80">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          placeholder="Search..."
          className="w-full bg-transparent placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      {/* Right: Icons + Avatar */}
      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
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
