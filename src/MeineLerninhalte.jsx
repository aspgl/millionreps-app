import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useAuth } from "./AuthContext";
import {
  BookOpen,
  Edit3,
  ChevronDown,
  ChevronUp,
  Calendar,
  ListChecks,
  Trophy,
  Search,
  Folder,
  Tag,
  Plus,
  Share2,
} from "lucide-react";
import SharePopup from "./components/SharePopup";

export default function MeineLerninhalte() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [sharedExams, setSharedExams] = useState([]);
  const [collections, setCollections] = useState([]);
  const [tags, setTags] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const navigate = useNavigate();
  const [shareExam, setShareExam] = useState(null);

  const fetchData = async () => {
      if (!user) return;

      // Exams laden (eigene)
      const { data: examsData, error } = await supabase
        .from("exams")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der Klausuren:", error.message);
        setLoading(false);
        return;
      }

      // Exams laden (geteilte)
      const { data: sharedRows } = await supabase
        .from("exam_shares")
        .select("exam_id, exams(*)")
        .eq("shared_with_id", user.id);

      const shared = (sharedRows || []).map(r => r.exams).filter(Boolean);

      // Collections laden
      const { data: collectionsData } = await supabase
        .from("exams_collections")
        .select("*")
        .eq("created_by", user.id);

      // Tags laden
      const { data: tagsData } = await supabase
        .from("exams_tags")
        .select("*")
        .eq("created_by", user.id);

      // Aktivitäten laden
      const { data: activityData } = await supabase
        .from("exam_activity")
        .select("*")
        .eq("user_id", user.id);

      const ownWithStats = examsData.map((exam) => {
        const activities = activityData?.filter(
          (a) => a.exam_id === exam.id
        ) || [];
        const avgPoints =
          activities.length > 0
            ? Math.round(
                activities.reduce((sum, a) => sum + a.total_score, 0) /
                  activities.length
              )
            : 0;

        return {
          ...exam,
          stats: {
            attempts: activities.length,
            avgPoints,
            questions: exam.content?.questions?.length || 0,
            history: activities,
          },
        };
      });

      const sharedWithStats = shared.map((exam) => {
        const activities = activityData?.filter(
          (a) => a.exam_id === exam.id
        ) || [];
        const avgPoints =
          activities.length > 0
            ? Math.round(
                activities.reduce((sum, a) => sum + a.total_score, 0) /
                  activities.length
              )
            : 0;
        return {
          ...exam,
          isShared: true,
          stats: {
            attempts: activities.length,
            avgPoints,
            questions: exam.content?.questions?.length || 0,
            history: activities,
          },
        };
      });

      setExams(ownWithStats);
      setSharedExams(sharedWithStats);
      setCollections(collectionsData || []);
      setTags(tagsData || []);
      setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return <p className="text-center text-gray-500 dark:text-dark-text-secondary">⏳ Lade deine Klausuren...</p>;
  }

  // Filter-Logik
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCollection = !selectedCollection || exam.collection_id === selectedCollection;
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tagId => exam.tag_ids?.includes(tagId));
    
    return matchesSearch && matchesCollection && matchesTags;
  });

  // Geteilte separat gruppieren
  const filteredShared = sharedExams.filter(exam => {
    const matchesSearch = exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tagId => exam.tag_ids?.includes(tagId));
    return matchesSearch && matchesTags;
  });

  // Gruppierung nach Collections
  const groupedByCollection = filteredExams.reduce((acc, exam) => {
    const collection = collections.find(c => c.id === exam.collection_id);
    const collectionName = collection?.collection_name || "Ohne Kollektion";
    
    if (!acc[collectionName]) {
      acc[collectionName] = [];
    }
    acc[collectionName].push(exam);
    return acc;
  }, {});

  // Stats berechnen
  const totalExams = exams.length;
  const totalAttempts = exams.reduce((sum, exam) => sum + exam.stats.attempts, 0);
  const avgScore = exams.length > 0 
    ? Math.round(exams.reduce((sum, exam) => sum + exam.stats.avgPoints, 0) / exams.length)
    : 0;

  if (!exams.length) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-indigo-100 dark:bg-dark-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-12 w-12 text-indigo-600 dark:text-dark-accent" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-dark-text">Noch keine Klausuren</h3>
        <p className="text-gray-500 dark:text-dark-text-secondary mb-6">Erstelle deine erste Klausur und beginne mit dem Lernen!</p>
        <button
          onClick={() => navigate("/klausur")}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          Neue Klausur erstellen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {shareExam && (
        <SharePopup
          exam={shareExam}
          onClose={(reload) => {
            setShareExam(null);
            if (reload) {
              fetchData();
            }
          }}
        />
      )}
      {/* Library Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-border bg-gradient-to-br from-indigo-50 via-purple-50 to-white dark:from-indigo-900/10 dark:via-purple-900/10 dark:to-dark-card">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-dark-text">Meine Bibliothek</h1>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Organisiere, teile und übe deine Lerninhalte</p>
            </div>
            <button
              onClick={() => navigate("/klausur")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4" /> Neue Klausur
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white dark:bg-dark-card shadow-sm border border-gray-200 dark:border-dark-border p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">Klausuren</div>
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalExams}</div>
            </div>
            <div className="rounded-xl bg-white dark:bg-dark-card shadow-sm border border-gray-200 dark:border-dark-border p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">Versuche</div>
              <div className="text-3xl font-extrabold text-green-600 dark:text-green-400">{totalAttempts}</div>
            </div>
            <div className="rounded-xl bg-white dark:bg-dark-card shadow-sm border border-gray-200 dark:border-dark-border p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">Ø Punkte</div>
              <div className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{avgScore}</div>
            </div>
            <div className="rounded-xl bg-white dark:bg-dark-card shadow-sm border border-gray-200 dark:border-dark-border p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">Kollektionen</div>
              <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{collections.length}</div>
            </div>
          </div>

          {/* Search & Filters inline */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="col-span-1 md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-text-secondary" />
                <input
                  type="text"
                  placeholder="Inhalte, Beschreibungen, Tags suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent"
              >
                <option value="">Alle Kollektionen</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.collection_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={selectedTags[0] || ""}
                onChange={(e) => setSelectedTags(e.target.value ? [e.target.value] : [])}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent"
              >
                <option value="">Alle Tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    #{tag.tag_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content as carousels */}
      {Object.entries(groupedByCollection).map(([collectionName, collectionExams]) => (
        <div key={collectionName} className="space-y-4">
          <div className="flex items-center justify-between pr-1">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-dark-text">
              <Folder className="h-5 w-5 text-indigo-600" />
              {collectionName}
            </h2>
            <div className="text-xs text-gray-500 dark:text-dark-text-secondary">{collectionExams.length} Inhalte</div>
          </div>
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {collectionExams.map((exam) => (
                <div
                  key={exam.id}
                  className="snap-start group relative min-w-[300px] sm:min-w-[340px] rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Poster/Preview */}
                  <div className="h-48 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    {/* Floating Action Buttons */}
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={() => setShareExam(exam)}
                        className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white shadow-lg hover:scale-110 transition-all"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/klausur?id=${exam.id}`)}
                        className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white shadow-lg hover:scale-110 transition-all"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Stats Overlay */}
                    <div className="absolute bottom-3 left-3 z-10 text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-1">
                          <ListChecks className="h-4 w-4" />
                          {exam.stats.questions} Fragen
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          {exam.stats.attempts} Versuche
                        </div>
                      </div>
                      <div className="text-xs text-white/90 mt-1">Ø {exam.stats.avgPoints} Punkte</div>
                    </div>

                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-4 right-4 w-16 h-16 bg-indigo-400/30 rounded-full blur-xl animate-pulse" />
                      <div className="absolute bottom-8 left-8 w-12 h-12 bg-purple-400/30 rounded-full blur-lg animate-pulse delay-1000" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-gray-900 dark:text-dark-text line-clamp-2 text-lg leading-tight">{exam.title}</h3>
                      {exam.collection_id && (
                        <span className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full whitespace-nowrap h-fit">
                          {collectionName}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {exam.description && (
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2 mb-3">
                        {exam.description}
                      </p>
                    )}

                    {/* Tags */}
                    {exam.tag_ids && exam.tag_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {exam.tag_ids.slice(0,3).map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? (
                            <span key={tagId} className="px-3 py-1 bg-gray-100 dark:bg-dark-secondary text-gray-700 dark:text-dark-text text-xs rounded-full font-medium">
                              #{tag.tag_name}
                            </span>
                          ) : null;
                        })}
                        {exam.tag_ids.length > 3 && (
                          <span className="px-3 py-1 bg-gray-50 dark:bg-dark-primary text-gray-500 dark:text-dark-text-secondary text-xs rounded-full">
                            +{exam.tag_ids.length-3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/klausur/ueben/${exam.id}`)}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                      >
                        <BookOpen className="h-4 w-4" /> Jetzt üben
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Shared with me */}
      {filteredShared.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-dark-text">
            <Folder className="h-5 w-5 text-purple-600" />
            Mit mir geteilt
          </h2>
          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {filteredShared.map((exam) => (
              <div
                key={exam.id}
                className="snap-start group relative min-w-[300px] sm:min-w-[340px] rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-48 bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Shared Badge */}
                  <span className="absolute top-3 left-3 z-10 px-3 py-1 text-xs rounded-full bg-white/90 backdrop-blur-sm text-purple-700 font-medium shadow-lg">
                    Geteilt
                  </span>

                  {/* Stats Overlay */}
                  <div className="absolute bottom-3 left-3 z-10 text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="flex items-center gap-4 text-sm font-medium">
                      <div className="flex items-center gap-1">
                        <ListChecks className="h-4 w-4" />
                        {exam.stats.questions} Fragen
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        {exam.stats.attempts} Versuche
                      </div>
                    </div>
                    <div className="text-xs text-white/90 mt-1">Ø {exam.stats.avgPoints} Punkte</div>
                  </div>

                  {/* Animated Background Pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 right-4 w-16 h-16 bg-purple-400/30 rounded-full blur-xl animate-pulse" />
                    <div className="absolute bottom-8 left-8 w-12 h-12 bg-pink-400/30 rounded-full blur-lg animate-pulse delay-1000" />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-gray-900 dark:text-dark-text line-clamp-2 text-lg leading-tight mb-3">{exam.title}</h3>
                  
                  {/* Description */}
                  {exam.description && (
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2 mb-3">
                      {exam.description}
                    </p>
                  )}

                  {/* Tags */}
                  {exam.tag_ids && exam.tag_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {exam.tag_ids.slice(0,3).map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? (
                          <span key={tagId} className="px-3 py-1 bg-gray-100 dark:bg-dark-secondary text-gray-700 dark:text-dark-text text-xs rounded-full font-medium">
                            #{tag.tag_name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/klausur/ueben/${exam.id}`)}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <BookOpen className="h-4 w-4" /> Jetzt üben
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create New Button */}
      <div className="text-center pt-6">
        <button
          onClick={() => navigate("/klausur")}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          Neue Klausur erstellen
        </button>
      </div>
    </div>
  );
}

