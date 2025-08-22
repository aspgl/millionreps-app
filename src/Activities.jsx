// src/Activities.jsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Trophy, Clock, User } from "lucide-react";

function formatDuration(seconds) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function ActivityCard({ activity }) {
  return (
    <div className="bg-white shadow rounded-xl p-6 flex items-start gap-4 hover:shadow-md transition">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
        <User className="h-6 w-6 text-indigo-600" />
      </div>

      {/* Inhalt */}
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">
            {activity.user_name || "Unbekannt"}
          </h3>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Gesamtzeit: {formatDuration(activity.duration_seconds)}
          </span>
        </div>

        <p className="text-gray-600 mt-1">
          <span className="font-medium">{activity.user_name}</span> hat das Training{" "}
          <span className="font-medium text-indigo-600">
            {activity.exam_title || "Unbekannte Klausur"}
          </span>{" "}
          abgeschlossen{" "}
          {activity.finished_at
            ? `am ${new Date(activity.finished_at).toLocaleDateString()}`
            : ""}
        </p>

        {/* Punkte */}
        <div className="mt-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold text-gray-800">
            {activity.total_score ?? 0} / 100 Punkte
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gruppierungslogik
  const groupActivities = (items) => {
    const now = new Date();
    const groups = {
      Heute: [],
      Gestern: [],
      "Letzte 7 Tage": [],
      "Letzte 14 Tage": [],
      "Letzte 30 Tage": [],
      "Letztes Quartal": [],
      "Letztes Jahr": [],
    };

    items.forEach((a) => {
      if (!a.finished_at) return;
      const finished = new Date(a.finished_at);

      const diffMs = now - finished;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groups["Heute"].push(a);
      } else if (diffDays === 1) {
        groups["Gestern"].push(a);
      } else if (diffDays <= 7) {
        groups["Letzte 7 Tage"].push(a);
      } else if (diffDays <= 14) {
        groups["Letzte 14 Tage"].push(a);
      } else if (diffDays <= 30) {
        groups["Letzte 30 Tage"].push(a);
      } else if (diffDays <= 90) {
        groups["Letztes Quartal"].push(a);
      } else if (diffDays <= 365) {
        groups["Letztes Jahr"].push(a);
      }
    });

    // nur Gruppen zurückgeben, die auch Werte haben
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
          user_name: user.email, // später gegen fullname ersetzen
        }));
        setActivities(enriched);
      }

      setLoading(false);
    };

    fetchActivities();
  }, []);

  const grouped = groupActivities(activities);

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold mb-6">📊 Deine Aktivitäten</h1>

      {loading ? (
        <div className="text-center text-gray-500">⏳ Lädt...</div>
      ) : activities.length === 0 ? (
        <div className="text-center text-gray-500">
          Noch keine Aktivitäten vorhanden.
        </div>
      ) : (
        grouped.map(([label, items]) => (
          <div key={label} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">{label}</h2>
            {items.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
