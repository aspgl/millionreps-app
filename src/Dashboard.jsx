// src/Dashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./AuthContext";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Trophy, 
  Zap,
  Calendar,
  BookOpen,
  Award,
  Star,
  Activity,
  Users,
  BarChart3,
  Filter,
  RefreshCw,
  Play,
  CheckCircle,
  AlertCircle,
  Clock3,
  Target as TargetIcon,
  Flame,
  Brain,
  Lightbulb
} from "lucide-react";

// Hilfsfunktion: Punkte → Note
const scoreToGrade = (score) => {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "C+";
  if (score >= 65) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return "F";
};

const getGradeColor = (grade) => {
  switch (grade) {
    case "A+": case "A": return "text-green-600";
    case "B+": case "B": return "text-blue-600";
    case "C+": case "C": return "text-yellow-600";
    case "D": return "text-orange-600";
    case "E": case "F": return "text-red-600";
    default: return "text-gray-600";
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalTime: 0,
    totalExams: 0,
    avgScore: 0,
    currentStreak: 0,
    bestScore: 0,
    totalXP: 0,
    level: 1,
    weeklyGoal: 0,
    monthlyGoal: 0
  });
  const [userGoals, setUserGoals] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("xp, level, firstname, lastname, avatar_url")
          .eq("id", user.id)
          .single();

        console.log("Profile data:", profileData, "Error:", profileError);

        if (profileData) {
          setProfile(profileData);
        } else {
          // Fallback: Versuche Daten aus user.user_metadata zu laden
          const userMetadata = user.user_metadata || {};
          console.log("Using user metadata:", userMetadata);
          setProfile({
            firstname: userMetadata.firstname || "",
            lastname: userMetadata.lastname || "",
            username: userMetadata.username || "",
            xp: 0,
            level: 1,
            avatar_url: ""
          });
        }

        // Calculate date range
        const now = new Date();
        let fromDate = new Date();
        
        switch (filter) {
          case "today":
            fromDate.setHours(0, 0, 0, 0);
            break;
          case "7d":
            fromDate.setDate(now.getDate() - 7);
            break;
          case "30d":
            fromDate.setDate(now.getDate() - 30);
            break;
          case "month":
            fromDate.setMonth(now.getMonth() - 1);
            break;
          case "quarter":
            fromDate.setMonth(now.getMonth() - 3);
            break;
          case "year":
            fromDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            fromDate.setDate(now.getDate() - 7);
        }

        // Fetch activities
        const { data: activitiesData, error } = await supabase
          .from("exam_activity")
          .select(`
            *,
            exams (
              title,
              description
            )
          `)
          .eq("user_id", user.id)
          .gte("finished_at", fromDate.toISOString())
          .order("finished_at", { ascending: true });

        if (error) throw error;
        setActivities(activitiesData || []);

        // Fetch user goals
        const { data: goalsData } = await supabase
          .from("user_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        // Update goals with current values based on activities
        if (goalsData && activitiesData) {
          const updatedGoals = goalsData.map(goal => {
            let currentValue = 0;
            
            // Filtere Aktivitäten basierend auf dem Ziel-Zeitraum
            let relevantActivities = activitiesData;
            
            if (goal.period === "weekly") {
              // Nur Aktivitäten der letzten 7 Tage
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              relevantActivities = activitiesData.filter(activity => 
                new Date(activity.finished_at) >= weekAgo
              );
            } else if (goal.period === "monthly") {
              // Nur Aktivitäten des letzten Monats
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              relevantActivities = activitiesData.filter(activity => 
                new Date(activity.finished_at) >= monthAgo
              );
            }
            
            switch (goal.goal_type) {
              case "weekly_study_time":
                // Summiere die gesamte Lernzeit im relevanten Zeitraum
                const totalStudySeconds = relevantActivities.reduce((sum, activity) => 
                  sum + (activity.duration_seconds || 0), 0);
                currentValue = Math.floor(totalStudySeconds / 3600); // Konvertiere zu Stunden
                break;
                
              case "weekly_exams":
                // Anzahl der abgeschlossenen Prüfungen im relevanten Zeitraum
                currentValue = relevantActivities.length;
                break;
                
              case "target_score":
                // Durchschnittliche Punktzahl im relevanten Zeitraum
                if (relevantActivities.length > 0) {
                  currentValue = Math.round(relevantActivities.reduce((sum, activity) => 
                    sum + (activity.total_score || 0), 0) / relevantActivities.length);
                }
                break;
                
              case "streak_days":
                // Berechne aktuelle Serie basierend auf aufeinanderfolgenden Tagen
                const sortedActivities = relevantActivities
                  .filter(a => a.finished_at)
                  .sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at));
                
                if (sortedActivities.length > 0) {
                  const today = new Date();
                  const lastActivity = new Date(sortedActivities[0].finished_at);
                  const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
                  currentValue = daysDiff <= 1 ? sortedActivities.length : 0;
                }
                break;
                
              default:
                currentValue = goal.current_value || 0;
            }
            
            return {
              ...goal,
              current_value: currentValue
            };
          });
          
          console.log("Updated goals with current values:", updatedGoals);
          setUserGoals(updatedGoals);
          
          // Update goals in database
          for (const goal of updatedGoals) {
            if (goal.current_value !== goal.current_value) {
              await supabase
                .from("user_goals")
                .update({ current_value: goal.current_value })
                .eq("id", goal.id);
            }
          }
        } else {
          setUserGoals(goalsData || []);
        }

        // Calculate comprehensive stats
        const totalTime = activitiesData?.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) || 0;
        const totalExams = activitiesData?.length || 0;
        const avgScore = totalExams > 0 
          ? Math.round(activitiesData.reduce((sum, a) => sum + (a.total_score || 0), 0) / totalExams)
          : 0;
        const bestScore = activitiesData?.length > 0 
          ? Math.max(...activitiesData.map(a => a.total_score || 0))
          : 0;

        // Calculate current streak
        const sortedActivities = activitiesData
          ?.filter(a => a.finished_at)
          .sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at)) || [];
        
        let currentStreak = 0;
        if (sortedActivities.length > 0) {
          const today = new Date();
          const lastActivity = new Date(sortedActivities[0].finished_at);
          const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
          currentStreak = daysDiff <= 1 ? sortedActivities.length : 0;
        }

        // Berechne Level basierend auf XP (falls nicht in der Datenbank gespeichert)
        const calculatedLevel = profileData?.level || Math.floor((profileData?.xp || 0) / 100) + 1;
        const currentXP = profileData?.xp || 0;
        
        console.log("Setting stats with:", {
          totalXP: currentXP,
          level: calculatedLevel,
          profileData
        });

        // Falls kein Profil existiert, erstelle eines mit XP basierend auf Aktivitäten
        if (!profileData && activitiesData && activitiesData.length > 0) {
          console.log("No profile found, creating one with calculated XP");
          const calculatedXP = Math.round(activitiesData.reduce((sum, activity) => {
            return sum + (activity.total_score || 0);
          }, 0) / activitiesData.length * activitiesData.length);
          
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              xp: calculatedXP,
              level: Math.floor(calculatedXP / 100) + 1,
              firstname: user.user_metadata?.firstname || "",
              lastname: user.user_metadata?.lastname || "",
              username: user.user_metadata?.username || "",
              email: user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (!insertError) {
            console.log("Profile created with XP:", calculatedXP);
            setStats({
              totalTime,
              totalExams,
              avgScore,
              currentStreak,
              bestScore,
              totalXP: calculatedXP,
              level: Math.floor(calculatedXP / 100) + 1,
              weeklyGoal: Math.round(totalTime / 3600 * 1.2),
              monthlyGoal: Math.round(totalTime / 3600 * 1.5)
            });
            return;
          }
        }

        setStats({
          totalTime,
          totalExams,
          avgScore,
          currentStreak,
          bestScore,
          totalXP: currentXP,
          level: calculatedLevel,
          weeklyGoal: Math.round(totalTime / 3600 * 1.2), // 20% more than current
          monthlyGoal: Math.round(totalTime / 3600 * 1.5) // 50% more than current
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, filter]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  // Chart data preparation
  const chartData = activities.map((activity, index) => {
    const date = new Date(activity.finished_at);
    return {
      date: `${date.getDate()}.${date.getMonth() + 1}`,
      score: activity.total_score || 0,
      time: Math.round((activity.duration_seconds || 0) / 60),
      exam: activity.exams?.title || "Unbekannt"
    };
  });

  // Subject performance data
  const subjectData = activities.reduce((acc, activity) => {
    const subject = activity.exams?.title?.split(' ')[0] || 'Allgemein';
    if (!acc[subject]) {
      acc[subject] = { total: 0, count: 0, avg: 0 };
    }
    acc[subject].total += activity.total_score || 0;
    acc[subject].count += 1;
    acc[subject].avg = Math.round(acc[subject].total / acc[subject].count);
    return acc;
  }, {});

  const pieData = Object.entries(subjectData).map(([subject, data]) => ({
    name: subject,
    value: data.avg,
    count: data.count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">🚀 Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Willkommen zurück, {profile?.firstname || 'Lerner'}!</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: "today", label: "Heute" },
              { key: "7d", label: "7T" },
              { key: "30d", label: "30T" },
              { key: "month", label: "Monat" },
              { key: "quarter", label: "Quartal" },
              { key: "year", label: "Jahr" }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  filter === f.key 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <KPICard
          title="Gesamte Lernzeit"
          value={`${Math.floor(stats.totalTime / 3600)}h ${Math.floor((stats.totalTime % 3600) / 60)}m`}
          icon={Clock}
          color="blue"
          trend="+12%"
          trendUp={true}
          subtitle={`${stats.totalExams} Prüfungen`}
        />
        <KPICard
          title="Durchschnittsnote"
          value={`${stats.avgScore}%`}
          icon={Target}
          color="green"
          trend="+5%"
          trendUp={true}
          subtitle={`${scoreToGrade(stats.avgScore)} (${getGradeColor(scoreToGrade(stats.avgScore))})`}
        />
        <KPICard
          title="Aktuelle Serie"
          value={stats.currentStreak}
          icon={Flame}
          color="orange"
          trend="+3"
          trendUp={true}
          subtitle="Tage in Folge"
        />
        <KPICard
          title="Beste Leistung"
          value={`${stats.bestScore}%`}
          icon={Trophy}
          color="purple"
          trend="Neuer Rekord!"
          trendUp={true}
          subtitle="Höchste Punktzahl"
        />
      </div>

      {/* Level & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-1">Level {stats.level}</h3>
              <p className="text-xs sm:text-sm text-indigo-100">Fortschritt zum nächsten Level</p>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalXP}</div>
              <div className="text-xs sm:text-sm text-indigo-100">Gesamt XP</div>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 mb-3 sm:mb-4">
            <div 
              className="bg-white rounded-full h-2 sm:h-3 transition-all duration-500"
              style={{ width: `${Math.min((stats.totalXP % 100) / 1, 100)}%` }}
            ></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Intelligenz +{stats.level * 2}</span>
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Kreativität +{stats.level}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Nächstes Level: {stats.totalXP % 100}/100 XP</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <TargetIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
            Meine Ziele
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {userGoals.length > 0 ? (
              userGoals.slice(0, 3).map((goal) => {
                const getGoalIcon = (goalType) => {
                  switch (goalType) {
                    case "weekly_study_time": return Clock;
                    case "weekly_exams": return BookOpen;
                    case "target_score": return Target;
                    case "streak_days": return Flame;
                    default: return Target;
                  }
                };

                const getGoalLabel = (goalType) => {
                  switch (goalType) {
                    case "weekly_study_time": return "Lernzeit";
                    case "weekly_exams": return "Prüfungen";
                    case "target_score": return "Durchschnitt";
                    case "streak_days": return "Serie";
                    default: return goalType;
                  }
                };

                const getGoalUnit = (goalType) => {
                  switch (goalType) {
                    case "weekly_study_time": return "h";
                    case "weekly_exams": return "";
                    case "target_score": return "%";
                    case "streak_days": return "Tage";
                    default: return "";
                  }
                };

                const Icon = getGoalIcon(goal.goal_type);
                const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Icon className="h-3 w-3" />
                        {getGoalLabel(goal.goal_type)}
                      </span>
                      <span>{goal.current_value} / {goal.target_value} {getGoalUnit(goal.goal_type)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                      <div 
                        className={`rounded-full h-1.5 sm:h-2 transition-all duration-500 ${
                          progress >= 100 ? 'bg-green-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              // Fallback zu den ursprünglichen Zielen wenn keine benutzerdefinierten Ziele vorhanden sind
              <>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span>Lernzeit</span>
                    <span>{Math.floor(stats.totalTime / 3600)}h / {stats.weeklyGoal}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-indigo-600 rounded-full h-1.5 sm:h-2 transition-all duration-500"
                      style={{ width: `${Math.min((stats.totalTime / 3600) / stats.weeklyGoal * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span>Prüfungen</span>
                    <span>{stats.totalExams} / {Math.max(stats.totalExams + 2, 5)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-green-500 rounded-full h-1.5 sm:h-2 transition-all duration-500"
                      style={{ width: `${Math.min(stats.totalExams / Math.max(stats.totalExams + 2, 5) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span>Durchschnitt</span>
                    <span>{stats.avgScore}% / 90%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-yellow-500 rounded-full h-1.5 sm:h-2 transition-all duration-500"
                      style={{ width: `${Math.min(stats.avgScore / 90 * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Performance Chart */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
            Leistungsverlauf
          </h3>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={10} className="sm:text-xs" />
              <YAxis stroke="#6B7280" fontSize={10} className="sm:text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#4F46E5" 
                strokeWidth={2}
                fill="url(#colorScore)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
            Fächer-Performance
          </h3>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value, name) => [`${value}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <div 
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span>{entry.name}</span>
                <span className="text-gray-500">({entry.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
          Letzte Aktivitäten
        </h3>
        <div className="space-y-2 sm:space-y-3">
          {activities.slice(0, 5).map((activity, index) => (
            <div key={activity.id} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`p-1.5 sm:p-2 rounded-lg ${
                activity.total_score >= 90 ? 'bg-green-100 text-green-600' :
                activity.total_score >= 80 ? 'bg-blue-100 text-blue-600' :
                activity.total_score >= 70 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {activity.total_score >= 90 ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> :
                 activity.total_score >= 80 ? <Star className="h-3 w-3 sm:h-4 sm:w-4" /> :
                 activity.total_score >= 70 ? <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" /> :
                 <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{activity.exams?.title || 'Unbekannte Prüfung'}</h4>
                <p className="text-xs sm:text-sm text-gray-500">
                  {new Date(activity.finished_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-semibold text-gray-900 text-sm sm:text-base">{activity.total_score}%</div>
                <div className="text-xs sm:text-sm text-gray-500">
                  {Math.round((activity.duration_seconds || 0) / 60)}m
                </div>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <Play className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
              <p className="text-sm sm:text-base">Noch keine Aktivitäten in diesem Zeitraum</p>
              <p className="text-xs sm:text-sm">Starte deine erste Prüfung!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced KPI Card Component
function KPICard({ title, value, icon: Icon, color, trend, trendUp, subtitle }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600"
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} text-white`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        {trend && (
          <span className={`inline-flex items-center px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium ${
            trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {trendUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            <span className="hidden sm:inline">{trend}</span>
            <span className="sm:hidden">{trend.replace(/[^0-9%]/g, '')}</span>
          </span>
        )}
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2">{title}</p>
      {subtitle && (
        <p className={`text-xs sm:text-sm font-medium ${subtitle.includes('(') ? subtitle.split('(')[1].split(')')[0] : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
