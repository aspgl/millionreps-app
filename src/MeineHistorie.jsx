// src/MeineHistorie.jsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./AuthContext";
import {
  Calendar,
  Clock,
  ListChecks,
  Trophy,
  Search,
  Download,
} from "lucide-react";

export default function MeineHistorie() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState("cards");
  const [dateFilter, setDateFilter] = useState("Alle");

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("exam_activity")
        .select(
          `
          id,
          exam_id,
          user_id,
          finished_at,
          duration_seconds,
          total_score,
          total_questions,
          exams ( title )
        `
        )
        .eq("user_id", user.id)
        .order("finished_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der Aktivitäten:", error.message);
      } else {
        setActivities(data || []);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [user]);

  const formatDuration = (seconds) => {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDurationTotal = (seconds) => {
    if (!seconds) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getGrade = (score) => {
    if (score >= 95) return "A+";
    if (score >= 90) return "A";
    if (score >= 85) return "A-";
    if (score >= 80) return "B+";
    if (score >= 75) return "B";
    if (score >= 70) return "B-";
    if (score >= 65) return "C+";
    if (score >= 60) return "C";
    if (score >= 55) return "C-";
    if (score >= 50) return "D";
    if (score >= 40) return "E";
    return "F-";
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getBadgeColor = (score) => {
    if (score >= 75) return "bg-green-100 text-green-700";
    if (score >= 50) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  // --- Date Filter Helper ---
  const applyDateFilter = (list) => {
    if (dateFilter === "Alle") return list;
    const now = new Date();
    return list.filter((a) => {
      if (!a.finished_at) return false;
      const date = new Date(a.finished_at);
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      switch (dateFilter) {
        case "Heute":
          return date.toDateString() === now.toDateString();
        case "Gestern": {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return date.toDateString() === yesterday.toDateString();
        }
        case "Letzte 7 Tage":
          return diffDays <= 7;
        case "Letzte 14 Tage":
          return diffDays <= 14;
        case "Letzter Monat":
          return (
            date.getMonth() === now.getMonth() - 1 &&
            date.getFullYear() === now.getFullYear()
          );
        case "Letztes Quartal": {
          const quarter = Math.floor((now.getMonth() + 1) / 3);
          const startMonth = (quarter - 2) * 3;
          const start = new Date(now.getFullYear(), startMonth, 1);
          const end = new Date(now.getFullYear(), startMonth + 3, 0);
          return date >= start && date <= end;
        }
        case "Letztes Jahr":
          return date.getFullYear() === now.getFullYear() - 1;
        default:
          return true;
      }
    });
  };

  // Filter + Suche
  const filteredActivities = applyDateFilter(activities).filter((a) => {
    const examTitle = a.exams?.title?.toLowerCase() || "";
    const grade = getGrade(a.total_score || 0).toLowerCase();
    const score = String(a.total_score || 0);
    const duration = formatDuration(a.duration_seconds).toLowerCase();
    const date = a.finished_at
      ? new Date(a.finished_at).toLocaleDateString()
      : "";

    const term = filter.toLowerCase();
    return (
      examTitle.includes(term) ||
      grade.includes(term) ||
      score.includes(term) ||
      duration.includes(term) ||
      date.includes(term)
    );
  });

  // Stats
  const totalScore = filteredActivities.reduce(
    (sum, a) => sum + (a.total_score ?? 0),
    0
  );
  const avgScore =
    filteredActivities.length > 0
      ? Math.round(totalScore / filteredActivities.length)
      : 0;

  const avgGrade = getGrade(avgScore);

  const totalDurationSeconds = filteredActivities.reduce(
    (sum, a) => sum + (a.duration_seconds ?? 0),
    0
  );

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["Datum", "Klausur", "Punkte", "Note", "Dauer", "Fragen"],
      ...filteredActivities.map((a) => [
        a.finished_at
          ? new Date(a.finished_at).toLocaleDateString()
          : "-",
        a.exams?.title || "-",
        a.total_score ?? 0,
        getGrade(a.total_score ?? 0),
        formatDuration(a.duration_seconds),
        a.total_questions ?? 0,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.join(";")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "meine_historie.csv";
    link.click();
  };

  if (loading) {
    return <p className="text-center text-gray-500">⏳ Lade deine Aktivitäten...</p>;
  }

  if (!filteredActivities.length) {
    return (
      <div className="text-center text-gray-600 mt-10">
        <p>Du hast noch keine Aktivitäten.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold">📖 Deine Historie</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <select
            className="border rounded-lg px-3 py-2 bg-white"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="cards">Kartenansicht</option>
            <option value="table">Tabellenansicht</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2 mb-4 shadow-sm">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Filtern nach Titel, Note, Datum..."
          className="flex-1 outline-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          "Alle",
          "Heute",
          "Gestern",
          "Letzte 7 Tage",
          "Letzte 14 Tage",
          "Letzter Monat",
          "Letztes Quartal",
          "Letztes Jahr",
        ].map((f) => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
              dateFilter === f
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 hover:bg-gray-100 border-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Ø Punktzahl</p>
          <p className="text-xl font-bold text-indigo-600">{avgScore}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Ø Note</p>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor(
              avgScore
            )}`}
          >
            {avgGrade}
          </span>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Gesamtlernzeit</p>
          <p className="text-xl font-bold text-indigo-600">
            {formatDurationTotal(totalDurationSeconds)}
          </p>
        </div>
      </div>

      {/* Ansicht */}
      {view === "cards" ? (
        <div className="space-y-4">
          {filteredActivities.map((a) => {
            const score = a.total_score ?? 0;
            const grade = getGrade(score);

            return (
              <div
                key={a.id}
                className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition transform hover:-translate-y-1"
              >
                {/* Row 1: Datum + Titel */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {a.finished_at
                      ? new Date(a.finished_at).toLocaleDateString()
                      : "Unbekannt"}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {a.exams?.title || "Unbekannte Klausur"}
                  </h3>
                </div>

                {/* Row 2: Score + Note */}
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-xl font-bold ${getScoreColor(score)}`}>
                    {score} Punkte
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor(
                      score
                    )}`}
                  >
                    {grade}
                  </div>
                </div>

                {/* Row 3: Dauer + Fragen */}
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Dauer: {formatDuration(a.duration_seconds)}
                  </div>
                  <div className="flex items-center gap-1">
                    <ListChecks className="h-4 w-4" />
                    Fragen: {a.total_questions ?? 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Score: {score}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto shadow-lg rounded-xl">
          <table className="w-full text-sm text-gray-700">
            <thead className="sticky top-0 z-10 shadow-sm bg-gray-100">
              <tr className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 text-left w-32">Datum</th>
                <th className="px-4 py-3 text-left">Klausur</th>
                <th className="px-4 py-3 text-center w-28">Punkte</th>
                <th className="px-4 py-3 text-center w-24">Note</th>
                <th className="px-4 py-3 text-center w-32">Dauer</th>
                <th className="px-4 py-3 text-center w-24">Fragen</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((a, i) => {
                const score = a.total_score ?? 0;
                const grade = getGrade(score);

                return (
                  <tr
                    key={a.id}
                    className={`transition border-b last:border-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-indigo-50`}
                  >
                    <td className="px-4 py-3 flex items-center gap-2 text-gray-700">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {a.finished_at
                        ? new Date(a.finished_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {a.exams?.title || "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-center font-semibold ${getScoreColor(
                        score
                      )}`}
                    >
                      <div className="flex justify-center items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        {score}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getBadgeColor(
                          score
                        )}`}
                      >
                        {grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1 text-gray-700">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDuration(a.duration_seconds)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1 text-gray-700">
                        <ListChecks className="h-4 w-4 text-gray-400" />
                        {a.total_questions ?? 0}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
