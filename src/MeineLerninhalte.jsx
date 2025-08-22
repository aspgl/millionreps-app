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
} from "lucide-react";

export default function MeineLerninhalte() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [collections, setCollections] = useState([]);
  const [tags, setTags] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Exams laden
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

      const withStats = examsData.map((exam) => {
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

      setExams(withStats);
      setCollections(collectionsData || []);
      setTags(tagsData || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <p className="text-center text-gray-500">⏳ Lade deine Klausuren...</p>;
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
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-12 w-12 text-indigo-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Noch keine Klausuren</h3>
        <p className="text-gray-500 mb-6">Erstelle deine erste Klausur und beginne mit dem Lernen!</p>
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
    <div className="space-y-6">
      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{totalExams}</div>
          <div className="text-sm text-gray-500">Klausuren</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalAttempts}</div>
          <div className="text-sm text-gray-500">Versuche</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{avgScore}</div>
          <div className="text-sm text-gray-500">Ø Punkte</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{collections.length}</div>
          <div className="text-sm text-gray-500">Kollektionen</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Klausuren durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Collection Filter */}
          <div className="lg:w-48">
            <select 
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Alle Kollektionen</option>
              {collections.map(collection => (
                <option key={collection.id} value={collection.id}>
                  {collection.collection_name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div className="lg:w-48">
            <select 
              value={selectedTags[0] || ""}
              onChange={(e) => setSelectedTags(e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Alle Tags</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>
                  #{tag.tag_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {Object.entries(groupedByCollection).map(([collectionName, collectionExams]) => (
        <div key={collectionName} className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Folder className="h-5 w-5 text-indigo-600" />
            {collectionName}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collectionExams.map((exam) => (
              <div key={exam.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Card Header */}
                <div className="p-6 border-b">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800 flex-1 pr-2">
                      {exam.title}
                    </h3>
                    {exam.collection_id && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full whitespace-nowrap">
                        {collectionName}
                      </span>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {exam.tag_ids && exam.tag_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {exam.tag_ids.map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? (
                          <span key={tagId} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            #{tag.tag_name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{exam.stats.questions}</div>
                      <div className="text-xs text-gray-500">Fragen</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{exam.stats.attempts}</div>
                      <div className="text-xs text-gray-500">Versuche</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{exam.stats.avgPoints}</div>
                      <div className="text-xs text-gray-500">Ø Punkte</div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="p-4 bg-gray-50 flex gap-2">
                  <button
                    onClick={() => navigate(`/klausur/ueben/${exam.id}`)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Üben
                  </button>
                  <button
                    onClick={() => navigate(`/klausur?id=${exam.id}`)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Bearbeiten
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

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
