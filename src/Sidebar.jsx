import React, { useState, useEffect } from "react";
import {
  Bell, Home, ListTodo, FileText, Star, ChevronDown,
  ClipboardList, Users, CreditCard, Clock3,
  FileCog, FolderOpen, UserCircle2, Users2, Share2, MessagesSquare,
  Mail, Search, Sparkles, History, Trophy, X
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { supabase } from "./lib/supabase";
import { NavLink } from "react-router-dom";
import millionrepsLogo from "./utils/img/millionreps.svg";

// ---------- UserCard ----------
const UserCard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [levelTable, setLevelTable] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [{ data: profileData }, { data: levelData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("firstname, lastname, username, avatar_url, xp, plan, organization(name)")
          .eq("id", user.id)
          .single(),
        supabase
          .from("level_progression")
          .select("level, xp_required")
          .order("level", { ascending: true }),
      ]);

      if (profileData && levelData) {
        setProfile(profileData);
        setLevelTable(levelData);
      }
    };

    fetchData();
  }, [user]);

  if (!user || !profile || levelTable.length === 0) return null;

  const xp = profile.xp || 0;
  const current = levelTable.filter(l => xp >= l.xp_required).pop() || { level: 1, xp_required: 0 };
  const next = levelTable.find(l => l.level === current.level + 1) || { xp_required: current.xp_required + 1 };

  const xpCurrent = xp - current.xp_required;
  const xpRequired = next.xp_required - current.xp_required;
  const progress = Math.min(xpCurrent / xpRequired, 1);

  const radius = 20;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  const renderBadge = () => {
    if (profile.plan === "pro") {
      return (
        <span className="ml-2 text-[10px] font-semibold bg-yellow-400 text-yellow-900 border border-yellow-300 px-2 py-0.5 rounded-full shadow">
          PRO
        </span>
      );
    }
    if (profile.plan === "ultra") {
      return (
        <span className="ml-2 text-[10px] font-semibold bg-purple-600 text-white border border-purple-400 px-2 py-0.5 rounded-full shadow">
          ULTRA
        </span>
      );
    }
    return null;
  };

  return (
    <div className="px-2 pb-3 pt-2 border-t border-gray-200">
      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50">
        {/* Fortschrittsring */}
        <svg height={radius * 2} width={radius * 2} className="shrink-0">
          <circle
            stroke="#e5e7eb"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="#6366f1"
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            transform={`rotate(-90 ${radius} ${radius})`}
          />
          <image
            href={profile.avatar_url || `https://i.pravatar.cc/40?u=${user.id}`}
            x={radius - 16}
            y={radius - 16}
            height="32"
            width="32"
            clipPath="circle(16px at 16px 16px)"
          />
        </svg>

        {/* Name + Rank */}
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900 leading-5 flex items-center">
            {profile.firstname} {profile.lastname}
            {renderBadge()}
          </div>
          <div className="text-xs text-gray-500 -mt-0.5">@{profile.username}</div>
        </div>

        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {/* XP & Level */}
      <div className="text-center mt-1">
        <div className="text-xs text-gray-700 font-medium">
          {xpCurrent} / {xpRequired} XP
        </div>
        <div className="text-xs text-indigo-600 font-semibold">
          Level {current.level}
        </div>
      </div>
    </div>
  );
};

// ---------- Hilfs-Komponenten ----------
const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-2"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
      </button>
      <div className={`${open ? "block" : "hidden"}`}>{children}</div>
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label, trailing }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
        isActive ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
      }`
    }
  >
    <Icon className="h-4 w-4" />
    <span className="flex-1 text-left truncate">{label}</span>
    {trailing}
  </NavLink>
);

const StarBadge = () => (
  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-50">
    <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
  </div>
);

const Kbd = ({ children }) => (
  <kbd className="ml-auto rounded-md border border-gray-200 bg-white px-1.5 text-[10px] leading-5 text-gray-500 shadow-sm">
    {children}
  </kbd>
);

const MillionRepsLogo = () => {
  return (
    <div className="flex justify-start px-4 pb-2 pt-0">
      <div className="h-12 w-32">
        <img 
          src={millionrepsLogo}
          alt="MillionReps" 
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
};

const SearchBar = () => (
  <div className="px-2 pb-2">
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
      <Search className="h-4 w-4 text-gray-400" />
      <input
        placeholder="Search..."
        className="peer w-full bg-transparent placeholder:text-gray-400 focus:outline-none"
      />
      <Kbd>K</Kbd>
    </div>
  </div>
);

// ---------- Sidebar ----------
const Sidebar = ({ onClose }) => {
  return (
    <aside className="flex h-screen w-[280px] flex-col rounded-r-2xl border-r border-gray-200 bg-white shadow-sm">
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 lg:hidden">
        <MillionRepsLogo />
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Logo */}
      <div className="hidden lg:block pt-3">
        <MillionRepsLogo />
        <SearchBar />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-1">
        {/* Hauptpunkte */}
        <NavItem to="/ai" icon={Sparkles} label="AI" trailing={<StarBadge />} />
        <NavItem to="/" icon={Home} label="Dashboard" />
        <NavItem to="/activities" icon={Bell} label="Aktivitäten" />
        <NavItem to="/tasks" icon={ListTodo} label="Aufgaben"/>
        <NavItem to="/documents" icon={FileText} label="Dokumente"/>

        {/* Section: Workflow */}
        <Section title="Lernen" defaultOpen>
          <div className="space-y-1">
            <NavItem to="/klausur" icon={ClipboardList} label="Lerninhalt erstellen" />
            <NavItem to="/meine-lern-inhalte" icon={Users} label="Meine Inhalte" />
            <NavItem to="/meine-historie" icon={History} label="Meine Historie" />
            <NavItem to="/reports" icon={Clock3} label="Grantee Reports" />
          </div>
        </Section>

        {/* Section: Documents */}
        <Section title="Documents" defaultOpen>
          <div className="space-y-1">
            <NavItem to="/templates" icon={FileCog} label="Document Templates" />
            <NavItem to="/centre" icon={FolderOpen} label="Document Centre" />
          </div>
        </Section>

        {/* Section: Contacts */}
        <Section title="Contacts" defaultOpen>
          <div className="space-y-1">
            <NavItem to="/leaderboard" icon={Trophy} label="Leaderboard" />
            <NavItem to="/grantees" icon={UserCircle2} label="Grantees" />
            <NavItem to="/individuals" icon={Users2} label="Individuals" />
            <NavItem to="/constituents" icon={Share2} label="Constituents" />
            <NavItem to="/communications" icon={MessagesSquare} label="Communications" />
            <NavItem to="/klausur" icon={ClipboardList} label="Klausur erstellen" />
          </div>
        </Section>

        <NavItem to="/email" icon={Mail} label="Email Review" />
        <NavItem to="/settings" icon={FileCog} label="Einstellungen" />
      </nav>

      <div className="mt-auto">
        <UserCard />
      </div>
    </aside>
  );
};

export default Sidebar;
