// src/Activities.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { 
  Trophy, 
  Clock, 
  User, 
  TrendingUp, 
  Target, 
  Zap, 
  Star, 
  Award, 
  Calendar,
  Play,
  CheckCircle,
  Activity,
  BarChart3,
  Sparkles,
  Rocket,
  Flame,
  Crown,
  Medal,
  Timer,
  Brain
} from "lucide-react";

function formatDuration(seconds) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return `${diffDays} Tage her`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} Wochen her`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function getPerformanceLevel(score) {
  if (score >= 90) return { level: "Ausgezeichnet", color: "text-emerald-600", bg: "bg-emerald-50", icon: Crown, gradient: "from-emerald-500 to-green-500" };
  if (score >= 75) return { level: "Sehr gut", color: "text-blue-600", bg: "bg-blue-50", icon: Star, gradient: "from-blue-500 to-indigo-500" };
  if (score >= 60) return { level: "Gut", color: "text-yellow-600", bg: "bg-yellow-50", icon: Award, gradient: "from-yellow-500 to-orange-500" };
  if (score >= 40) return { level: "Befriedigend", color: "text-orange-600", bg: "bg-orange-50", icon: Target, gradient: "from-orange-500 to-red-500" };
  return { level: "Verbesserungsbedarf", color: "text-red-600", bg: "bg-red-50", icon: Zap, gradient: "from-red-500 to-pink-500" };
}

function ActivityCard({ activity, index, onRetry }) {
  const performance = getPerformanceLevel(activity.total_score || 0);
  const PerformanceIcon = performance.icon;
  
  return (
    <div 
      className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient Background Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${performance.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      {/* Performance Badge */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${performance.bg} ${performance.color} flex items-center gap-1 shadow-sm`}>
          <PerformanceIcon className="h-3 w-3" />
          {performance.level}
        </div>
      </div>

      <div className="p-6 relative z-20">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4 pr-20">
          {/* Animated Avatar */}
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                {activity.exam_title || "Unbekannte Klausur"}
              </h3>
            </div>
            
            <p className="text-gray-600 text-sm">
              <span className="font-medium text-indigo-600">{activity.user_name}</span> hat das Training erfolgreich abgeschlossen
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
            <div className="flex items-center justify-center mb-1">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-xl font-bold text-gray-800">{activity.total_score ?? 0}</div>
            <div className="text-xs text-gray-500">Punkte</div>
          </div>
          
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
            <div className="flex items-center justify-center mb-1">
              <Timer className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-lg font-bold text-gray-800">{formatDuration(activity.duration_seconds)}</div>
            <div className="text-xs text-gray-500">Dauer</div>
          </div>
          
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-gray-800">{Math.round((activity.total_score || 0) / 100 * 100)}%</div>
            <div className="text-xs text-gray-500">Erfolg</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Fortschritt</span>
            <span>{activity.total_score ?? 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${performance.gradient} transition-all duration-500 ease-out`}
              style={{ width: `${activity.total_score || 0}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => {
              console.log("Button clicked! exam_id:", activity.exam_id);
              onRetry(activity.exam_id);
            }}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium cursor-pointer relative z-30"
          >
            <Play className="h-4 w-4" />
            Erneut üben
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors relative z-30">
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActivities: 0,
    averageScore: 0,
    totalTime: 0,
    bestScore: 0
  });

  const navigate = useNavigate();

  // Gruppierungslogik
  const groupActivities = (items) => {
    const now = new Date();
    const groups = {
      "🔥 Heute": [],
      "⚡ Gestern": [],
      "📅 Diese Woche": [],
      "📊 Letzter Monat": [],
      "📈 Älter": [],
    };

    items.forEach((a) => {
      if (!a.finished_at) return;
      const finished = new Date(a.finished_at);

      const diffMs = now - finished;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groups["🔥 Heute"].push(a);
      } else if (diffDays === 1) {
        groups["⚡ Gestern"].push(a);
      } else if (diffDays <= 7) {
        groups["📅 Diese Woche"].push(a);
      } else if (diffDays <= 30) {
        groups["📊 Letzter Monat"].push(a);
      } else {
        groups["📈 Älter"].push(a);
      }
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  };

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("exam_activity")
        .select(
          `
          id,
          exam_id,
          user_id,
          started_at,
          finished_at,
          duration_seconds,
          total_score,
          exams ( title )
        `
        )
        .eq("user_id", user.id)
        .order("finished_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden:", error);
      } else {
        const enriched = data.map((a) => ({
          ...a,
          exam_title: a.exams?.title,
          user_name: user.email,
        }));
        setActivities(enriched);

        // Calculate stats
        const totalActivities = enriched.length;
        const averageScore = totalActivities > 0 ? Math.round(enriched.reduce((sum, a) => sum + (a.total_score || 0), 0) / totalActivities) : 0;
        const totalTime = enriched.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
        const bestScore = Math.max(...enriched.map(a => a.total_score || 0), 0);

        setStats({
          totalActivities,
          averageScore,
          totalTime,
          bestScore
        });
      }

      setLoading(false);
    };

    fetchActivities();
  }, []);

  const grouped = groupActivities(activities);

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-white/20 rounded-full p-3">
              <Activity className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">🚀 Deine Lernaktivitäten</h1>
          </div>
          <p className="text-indigo-100 text-lg">Verfolge deinen Fortschritt und feiere deine Erfolge</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.totalActivities}</div>
            <div className="text-indigo-200 text-sm">Aktivitäten</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.averageScore}%</div>
            <div className="text-indigo-200 text-sm">Ø Erfolg</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{Math.floor(stats.totalTime / 60)}m</div>
            <div className="text-indigo-200 text-sm">Gesamtzeit</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.bestScore}%</div>
            <div className="text-indigo-200 text-sm">Beste Leistung</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Lade deine Aktivitäten...</p>
          </div>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-12 border border-indigo-200 max-w-md mx-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Rocket className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Starte deine Lernreise!</h3>
            <p className="text-gray-600 mb-6">Erstelle deine erste Klausur und beginne mit dem Lernen. Deine Aktivitäten werden hier angezeigt.</p>
            <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium">
              Erste Klausur erstellen
            </button>
          </div>
        </div>
      ) : (
        grouped.map(([label, items]) => (
          <div key={label} className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">{label}</h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {items.length} Aktivität{items.length !== 1 ? 'en' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {items.map((activity, index) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  index={index} 
                  onRetry={(examId) => {
                    console.log("Navigation triggered with examId:", examId);
                    navigate(`/klausur/ueben/${examId}`);
                  }}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
