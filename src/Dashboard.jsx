// src/Dashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./AuthContext";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

// Hilfsfunktion: Punkte → Note
const scoreToGrade = (score) => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return "F";
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("7d"); // heute, 7d, month, quarter, year
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const now = new Date();
      let fromDate = new Date();
      let prevFromDate = new Date();
      let prevToDate = new Date();

      switch (filter) {
        case "today":
          fromDate.setHours(0, 0, 0, 0);
          prevFromDate = new Date(fromDate);
          prevFromDate.setDate(prevFromDate.getDate() - 1);
          prevToDate = new Date(fromDate);
          break;
        case "7d":
          fromDate.setDate(now.getDate() - 7);
          prevFromDate = new Date(fromDate);
          prevFromDate.setDate(prevFromDate.getDate() - 7);
          prevToDate = new Date(fromDate);
          break;
        case "month":
          fromDate.setMonth(now.getMonth() - 1);
          prevFromDate = new Date(fromDate);
          prevFromDate.setMonth(prevFromDate.getMonth() - 1);
          prevToDate = new Date(fromDate);
          break;
        case "quarter":
          fromDate.setMonth(now.getMonth() - 3);
          prevFromDate = new Date(fromDate);
          prevFromDate.setMonth(prevFromDate.getMonth() - 3);
          prevToDate = new Date(fromDate);
          break;
        case "year":
          fromDate.setFullYear(now.getFullYear() - 1);
          prevFromDate = new Date(fromDate);
          prevFromDate.setFullYear(prevFromDate.getFullYear() - 1);
          prevToDate = new Date(fromDate);
          break;
        default:
          break;
      }

      // Aktueller Zeitraum
      const { data, error } = await supabase
        .from("exam_activity")
        .select("*, exams(title)")
        .eq("user_id", user.id)
        .gte("started_at", fromDate.toISOString())
        .order("started_at", { ascending: true });

      if (error) console.error(error);
      else setActivities(data || []);
      setLoading(false);
    };
    fetchData();
  }, [user, filter]);

  if (loading) return <div className="p-10 text-center">⏳ Lade Dashboard...</div>;

  // KPI Berechnungen
  const totalTime = activities.reduce((s, a) => s + (a.duration_seconds || 0), 0);
  const totalHours = Math.floor(totalTime / 3600);
  const totalMinutes = Math.floor((totalTime % 3600) / 60);
  const examsDone = activities.length;
  const avgScore = examsDone > 0 ? Math.round(activities.reduce((s, a) => s + (a.total_score || 0), 0) / examsDone) : 0;
  const grade = scoreToGrade(avgScore);

  // Aktivster Tag
  const dayMap = {};
  activities.forEach((a) => {
    const day = new Date(a.started_at).toLocaleDateString("de-DE", { weekday: "long" });
    dayMap[day] = (dayMap[day] || 0) + (a.duration_seconds || 0);
  });
  const activeDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "–";

  // Chartdaten
  const lineData = activities.map((a) => {
    const d = new Date(a.started_at);
    return {
      date: `${d.getDate()}.${d.getMonth() + 1}`,
      minutes: Math.round((a.duration_seconds || 0) / 60)
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header mit Filter */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <div className="flex gap-2">
          {["today", "7d", "month", "quarter", "year"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {f === "today" && "Heute"}
              {f === "7d" && "7 Tage"}
              {f === "month" && "Monat"}
              {f === "quarter" && "Quartal"}
              {f === "year" && "Jahr"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <KPIBox title="Gesamte Lernzeit" value={`${totalHours}h ${totalMinutes}m`} trend="+12%" up />
        <KPIBox title="Ø Punktzahl" value={`${avgScore} / 100 (${grade})`} trend="+5%" up />
        <KPIBox title="Abgeschlossene Einheiten" value={examsDone} trend="-2%" />
        <KPIBox title="Aktivster Tag" value={activeDay} />
      </div>

      {/* Chart: kumulierte Lernzeit */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold mb-4">⏳ Kumulative Lernzeit</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="minutes" stroke="#4F46E5" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// KPI Card Component mit Badge
function KPIBox({ title, value, trend, up }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
      {trend && (
        <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
          up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {trend} {up ? "↑" : "↓"}
        </span>
      )}
    </div>
  );
}
