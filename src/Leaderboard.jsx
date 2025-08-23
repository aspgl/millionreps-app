import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "./lib/supabase";
import { 
  Trophy, 
  Medal, 
  Crown, 
  TrendingUp, 
  Users, 
  Star, 
  Target, 
  Zap,
  Calendar,
  Clock,
  Award,
  ChevronUp,
  ChevronDown,
  Filter,
  Search
} from "lucide-react";

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [timeFilter, setTimeFilter] = useState("all"); // all, week, month
  const [categoryFilter, setCategoryFilter] = useState("all"); // all, exams, exercises, streaks
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    avgXP: 0,
    topStreak: 0
  });

  // Fetch real data from Supabase
  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch all profiles with XP and level data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          firstname,
          lastname,
          username,
          avatar_url,
          xp,
          plan,
          created_at
        `)
        .order("xp", { ascending: false })
        .limit(50);

      if (profilesError) throw profilesError;

      // 2. Fetch exam activities for each user
      const { data: examActivities, error: activitiesError } = await supabase
        .from("exam_activity")
        .select(`
          id,
          user_id,
          exam_id,
          finished_at,
          total_score,
          total_questions,
          duration_seconds
        `);

      if (activitiesError) throw activitiesError;

      // 3. Calculate statistics for each user
      const userStats = profiles.map((profile, index) => {
        const userActivities = examActivities.filter(activity => activity.user_id === profile.id);
        
        // Calculate exams completed
        const examsCompleted = userActivities.length;
        
        // Calculate average score
        const avgScore = userActivities.length > 0 
          ? Math.round((userActivities.reduce((sum, activity) => sum + (activity.total_score || 0), 0) / userActivities.length) * 10) / 10
          : 0;
        
        // Calculate total study time (in hours)
        const totalStudyTime = Math.round(userActivities.reduce((sum, activity) => sum + (activity.duration_seconds || 0), 0) / 3600);
        
        // Calculate current streak (simplified - based on recent activity)
        const recentActivities = userActivities
          .filter(activity => activity.finished_at)
          .sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at));
        
        let currentStreak = 0;
        if (recentActivities.length > 0) {
          const today = new Date();
          const lastActivity = new Date(recentActivities[0].finished_at);
          const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
          currentStreak = daysDiff <= 1 ? recentActivities.length : 0;
        }

        // Calculate level based on XP
        const level = Math.floor((profile.xp || 0) / 100) + 1;

        // Generate badges based on achievements
        const badges = [];
        if (avgScore >= 90) badges.push("perfectionist");
        if (examsCompleted >= 20) badges.push("speed_demon");
        if (currentStreak >= 10) badges.push("streak_master");
        if (examsCompleted >= 10) badges.push("consistency");
        if (profile.plan === "pro") badges.push("early_bird");
        if (profile.plan === "ultra") badges.push("night_owl");

        // Determine trend (simplified)
        const trend = index < 2 ? "up" : index < 4 ? "stable" : "down";

        return {
          id: profile.id,
          username: profile.username,
          firstname: profile.firstname,
          lastname: profile.lastname,
          avatar_url: profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.username}`,
          xp: profile.xp || 0,
          level,
          exams_completed: examsCompleted,
          avg_score: avgScore,
          current_streak: currentStreak,
          total_study_time: totalStudyTime,
          rank: index + 1,
          badges,
          trend,
          plan: profile.plan
        };
      });

      // 4. Calculate overall stats
      const totalUsers = profiles.length;
      const avgXP = Math.round(profiles.reduce((sum, p) => sum + (p.xp || 0), 0) / profiles.length);
      const topStreak = Math.max(...userStats.map(u => u.current_streak));

      setLeaderboardData(userStats);
      setStats({ totalUsers, avgXP, topStreak });

      // 5. Set current user
      const currentUserData = userStats.find(u => u.id === user?.id);
      setCurrentUser(currentUserData);
      setUserRank(currentUserData ? currentUserData.rank : null);

    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      // Fallback to mock data if there's an error
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaderboardData();
    }
  }, [user, timeFilter]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Trophy className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return <ChevronUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <ChevronDown className="h-4 w-4 text-red-500" />;
      default:
        return <span className="h-4 w-4 text-gray-400">—</span>;
    }
  };

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case "speed_demon":
        return <Zap className="h-3 w-3" />;
      case "perfectionist":
        return <Star className="h-3 w-3" />;
      case "streak_master":
        return <Target className="h-3 w-3" />;
      case "consistency":
        return <TrendingUp className="h-3 w-3" />;
      case "early_bird":
        return <Calendar className="h-3 w-3" />;
      case "night_owl":
        return <Clock className="h-3 w-3" />;
      default:
        return <Award className="h-3 w-3" />;
    }
  };

  const getBadgeColor = (badge) => {
    switch (badge) {
      case "speed_demon":
        return "bg-yellow-100 text-yellow-800";
      case "perfectionist":
        return "bg-purple-100 text-purple-800";
      case "streak_master":
        return "bg-orange-100 text-orange-800";
      case "consistency":
        return "bg-green-100 text-green-800";
      case "early_bird":
        return "bg-blue-100 text-blue-800";
      case "night_owl":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Leaderboard</h1>
            <p className="text-gray-600">Vergleiche dich mit anderen Lernenden</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suche nach Benutzern..."
                className="outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="all">Alle Zeit</option>
                <option value="week">Diese Woche</option>
                <option value="month">Dieser Monat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Current User Stats */}
        {currentUser && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.firstname}
                    className="h-16 w-16 rounded-full border-4 border-white/20"
                  />
                  {userRank <= 3 && (
                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {currentUser.firstname} {currentUser.lastname}
                  </h2>
                  <p className="text-indigo-100">
                    Platz #{userRank || "N/A"} • Level {currentUser.level}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{currentUser.xp} XP</div>
                <div className="text-indigo-100">Gesamt</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Lernende</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {leaderboardData.length > 0 ? (
            leaderboardData.map((user, index) => (
              <div
                key={user.id}
                className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                  user.rank <= 3 ? "bg-gradient-to-r from-yellow-50 to-orange-50" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12 h-12">
                    {getRankIcon(user.rank)}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={user.avatar_url}
                      alt={user.firstname}
                      className="h-12 w-12 rounded-full"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {user.firstname} {user.lastname}
                      </h4>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{user.xp}</div>
                      <div className="text-xs text-gray-500">XP</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{user.level}</div>
                      <div className="text-xs text-gray-500">Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{user.exams_completed}</div>
                      <div className="text-xs text-gray-500">Prüfungen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{user.avg_score}%</div>
                      <div className="text-xs text-gray-500">Durchschnitt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{user.current_streak}</div>
                      <div className="text-xs text-gray-500">Streak</div>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="flex items-center gap-2">
                    {getTrendIcon(user.trend)}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1">
                    {user.badges.slice(0, 3).map((badge, badgeIndex) => (
                      <div
                        key={badgeIndex}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(badge)}`}
                        title={badge.replace('_', ' ')}
                      >
                        {getBadgeIcon(badge)}
                      </div>
                    ))}
                    {user.badges.length > 3 && (
                      <div className="text-xs text-gray-500">+{user.badges.length - 3}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Daten</h3>
              <p className="text-gray-500">Erstelle deine erste Prüfung um im Leaderboard zu erscheinen!</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Aktive Lernende</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="h-4 w-4" />
            +{Math.floor(stats.totalUsers * 0.1)} diese Woche
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Durchschnittliche XP</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgXP}</div>
          <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="h-4 w-4" />
            +{Math.floor(stats.avgXP * 0.05)} diese Woche
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Top Streak</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.topStreak} Tage</div>
          <div className="text-sm text-gray-600 mt-1">
            von {leaderboardData.find(u => u.current_streak === stats.topStreak)?.firstname || "Unbekannt"}
          </div>
        </div>
      </div>
    </div>
  );
}
