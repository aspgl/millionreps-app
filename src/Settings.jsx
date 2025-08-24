import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import { supabase } from "./lib/supabase";
import { useEffect, useState } from "react";
import { resizeImage } from "./utils/image";
import ImageCropper from "./components/ImageCropper";
import { 
  User, 
  Target, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Save,
  Upload,
  Camera,
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  TrendingUp,
  Trophy,
  Flame,
  Calendar,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  Volume2,
  VolumeX,
  Zap,
  Star,
  Award,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronDown,
  RefreshCw
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setThemeMode } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    avatar_url: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [goals, setGoals] = useState([]);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: "weekly_study_time",
    target_value: 10,
    period: "weekly"
  });

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
      loadGoals();
    }
  }, [user]);



  const loadUserData = async () => {
    console.log("Loading user data for user ID:", user.id);
    console.log("User object:", user);
    
    // Versuche zuerst Daten aus der profiles Tabelle zu laden
    const { data, error } = await supabase
      .from("profiles")
      .select("firstname, lastname, username, avatar_url, xp, level")
      .eq("id", user.id)
      .single();

    console.log("Supabase response:", { data, error });
    console.log("Avatar URL from database:", data?.avatar_url);

    if (data) {
      console.log("Profile data found:", data);
      setForm({
        firstname: data.firstname || "",
        lastname: data.lastname || "",
        username: data.username || "",
        email: user.email || "",
        avatar_url: data.avatar_url || "",
      });
      setProfile(data);
    } else {
      console.log("No profile data found, checking user metadata");
      
      // Fallback: Versuche Daten aus user.user_metadata zu laden
      const userMetadata = user.user_metadata || {};
      console.log("User metadata:", userMetadata);
      
      setForm({
        firstname: userMetadata.firstname || "",
        lastname: userMetadata.lastname || "",
        username: userMetadata.username || "",
        email: user.email || "",
        avatar_url: "",
      });
      setProfile(null);
    }
  };

  const loadGoals = async () => {
    const { data: goalsData } = await supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Lade auch Aktivitäten um die Ziele zu aktualisieren
    const { data: activitiesData } = await supabase
      .from("exam_activity")
      .select("*")
      .eq("user_id", user.id)
      .order("finished_at", { ascending: false });

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
      
      console.log("Updated goals in settings:", updatedGoals);
      setGoals(updatedGoals);
      
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
      setGoals(goalsData || []);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setShowCropper(true);
    }
  };

  const handleCropComplete = async (croppedBlob, fileUrl) => {
    setAvatarFile(croppedBlob);
    setShowCropper(false);
    // Automatically upload the cropped image
    await handleUploadAvatar(croppedBlob);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setAvatarFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        firstname: form.firstname,
        lastname: form.lastname,
        username: form.username,
      })
      .eq("id", user.id);

    if (error) {
      alert(`Fehler: ${error.message}`);
    } else {
      alert("Profil erfolgreich gespeichert ✅");
      loadUserData();
    }
  };

  const handleUploadAvatar = async (fileToUpload = avatarFile) => {
    if (!fileToUpload || !user) return;
    setLoading(true);

    try {
      // Check if it's a blob (cropped image) or a file
      const isBlob = fileToUpload instanceof Blob && !fileToUpload.name;
      
      if (!isBlob && !fileToUpload.type.startsWith('image/')) {
        throw new Error('Bitte wähle eine Bilddatei aus');
      }

      if (!isBlob && fileToUpload.size > 5 * 1024 * 1024) {
        throw new Error('Datei ist zu groß (max 5MB)');
      }

      // For cropped images (blobs), we don't need to resize again
      const blob = isBlob ? fileToUpload : await resizeImage(fileToUpload, 400, 400);
      const filePath = `${user.id}/avatar.jpg`;

      try {
        await supabase.storage.from("avatars").remove([filePath]);
      } catch (error) {
        // Ignore delete errors
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          upsert: true,
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (uploadError) throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      console.log("Generated public URL:", publicUrl);

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (dbError) throw new Error(`Datenbankfehler: ${dbError.message}`);

      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      console.log("Avatar URL updated in form:", publicUrl);
      alert("Profilbild erfolgreich hochgeladen ✅");
      loadUserData();
    } catch (err) {
      alert(`Fehler beim Hochladen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!user) return;

    const startDate = new Date();
    const endDate = new Date();
    
    if (newGoal.period === "weekly") {
      endDate.setDate(startDate.getDate() + 7);
    } else if (newGoal.period === "monthly") {
      endDate.setMonth(startDate.getMonth() + 1);
    } else {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    const { error } = await supabase
      .from("user_goals")
      .insert({
        user_id: user.id,
        goal_type: newGoal.goal_type,
        target_value: newGoal.target_value,
        period: newGoal.period,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

    if (error) {
      alert(`Fehler beim Erstellen des Ziels: ${error.message}`);
    } else {
      setShowNewGoalForm(false);
      setNewGoal({ goal_type: "weekly_study_time", target_value: 10, period: "weekly" });
      loadGoals();
      alert("Ziel erfolgreich erstellt ✅");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm("Möchtest du dieses Ziel wirklich löschen?")) return;

    const { error } = await supabase
      .from("user_goals")
      .update({ is_active: false })
      .eq("id", goalId);

    if (error) {
      alert(`Fehler beim Löschen: ${error.message}`);
    } else {
      loadGoals();
      alert("Ziel erfolgreich gelöscht ✅");
    }
  };

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
      case "weekly_study_time": return "Wöchentliche Lernzeit";
      case "weekly_exams": return "Prüfungen pro Woche";
      case "target_score": return "Zielpunktzahl";
      case "streak_days": return "Serie-Tage";
      default: return goalType;
    }
  };

  const getGoalUnit = (goalType) => {
    switch (goalType) {
      case "weekly_study_time": return "Stunden";
      case "weekly_exams": return "Prüfungen";
      case "target_score": return "%";
      case "streak_days": return "Tage";
      default: return "";
    }
  };

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "goals", label: "Ziele", icon: Target },
    { id: "preferences", label: "Einstellungen", icon: SettingsIcon },
    { id: "notifications", label: "Benachrichtigungen", icon: Bell },
    { id: "privacy", label: "Datenschutz", icon: Shield }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">⚙️ Einstellungen</h1>
        <p className="text-gray-600 dark:text-dark-text-secondary">Verwalte dein Profil, Ziele und Präferenzen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeTab === tab.id
                        ? "bg-indigo-50 dark:bg-dark-accent/10 text-indigo-700 dark:text-dark-accent border border-indigo-200 dark:border-dark-accent/20"
                        : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-secondary hover:text-gray-900 dark:hover:text-dark-text"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative">
                    <img
                      src={form.avatar_url || profile?.avatar_url || `https://i.pravatar.cc/100?u=${user?.id || "default"}`}
                      alt="Profilbild"
                      className="h-24 w-24 rounded-full object-cover border-4 border-gray-100 shadow-lg"
                      onError={(e) => {
                        e.target.src = `https://i.pravatar.cc/100?u=${user?.id || "default"}`;
                      }}
                    />
                    {loading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                    <button className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {form.firstname} {form.lastname}
                    </h2>
                    <p className="text-gray-600">@{form.username}</p>
                    {profile && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span>Level {profile.level || 1}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-indigo-500" />
                          <span>{profile.xp || 0} XP</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                        Vorname
                      </label>
                      <input
                        name="firstname"
                        value={form.firstname || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                        placeholder="Dein Vorname"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                        Nachname
                      </label>
                      <input
                        name="lastname"
                        value={form.lastname || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                        placeholder="Dein Nachname"
                      />
                    </div>
                  </div>

                                    <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                      Username
                    </label>
                    <input
                      name="username"
                      value={form.username || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                      placeholder="dein_username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                      E-Mail (nicht änderbar)
                    </label>
                    <input
                      value={form.email || ""}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-secondary text-gray-500 dark:text-dark-text-secondary cursor-not-allowed"
                    />
                  </div>

                  {/* Avatar Upload */}
                  <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Profilbild ändern
                    </h3>
                    {form.avatar_url && (
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                        Aktuelles Profilbild: {form.avatar_url}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer bg-gray-100 dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-primary px-6 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        📁 Datei auswählen
                      </label>
                      
                      <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        Wähle ein Bild aus und schneide es zu
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-2">
                      Unterstützte Formate: JPG, PNG, GIF (max 5MB). Du kannst das Bild zuschneiden und drehen.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-dark-accent dark:to-purple-600 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 dark:hover:from-dark-accent-hover dark:hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Save className="h-5 w-5" />
                    Profil speichern
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === "goals" && (
            <div className="space-y-6">
              {/* Goals Header */}
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">🎯 Meine Ziele</h2>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Setze dir Ziele und verfolge deinen Fortschritt</p>
                  </div>
                  <button
                    onClick={() => setShowNewGoalForm(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Neues Ziel
                  </button>
                </div>

                {/* New Goal Form */}
                {showNewGoalForm && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">Neues Ziel erstellen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zieltyp
                        </label>
                        <select
                          value={newGoal.goal_type}
                          onChange={(e) => setNewGoal({...newGoal, goal_type: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="weekly_study_time">Wöchentliche Lernzeit</option>
                          <option value="weekly_exams">Prüfungen pro Woche</option>
                          <option value="target_score">Zielpunktzahl</option>
                          <option value="streak_days">Serie-Tage</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zielwert
                        </label>
                        <input
                          type="number"
                          value={newGoal.target_value}
                          onChange={(e) => setNewGoal({...newGoal, target_value: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zeitraum
                        </label>
                        <select
                          value={newGoal.period}
                          onChange={(e) => setNewGoal({...newGoal, period: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="weekly">Wöchentlich</option>
                          <option value="monthly">Monatlich</option>
                          <option value="yearly">Jährlich</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCreateGoal}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-all"
                      >
                        Ziel erstellen
                      </button>
                      <button
                        onClick={() => setShowNewGoalForm(false)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-300 transition-all"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}

                {/* Goals List */}
                <div className="space-y-4">
                  {goals.map((goal) => {
                    const Icon = getGoalIcon(goal.goal_type);
                    const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                    
                    return (
                      <div key={goal.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {getGoalLabel(goal.goal_type)}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {goal.target_value} {getGoalUnit(goal.goal_type)} • {goal.period === 'weekly' ? 'Wöchentlich' : goal.period === 'monthly' ? 'Monatlich' : 'Jährlich'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Fortschritt</span>
                            <span>{goal.current_value} / {goal.target_value} {getGoalUnit(goal.goal_type)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                progress >= 100 ? 'bg-green-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          {progress >= 100 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className={progress >= 100 ? 'text-green-600' : 'text-yellow-600'}>
                            {progress >= 100 ? 'Ziel erreicht!' : `${Math.round(progress)}% abgeschlossen`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {goals.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">Noch keine Ziele gesetzt</p>
                      <p className="text-sm">Erstelle dein erstes Ziel, um deinen Fortschritt zu verfolgen!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🎨 Präferenzen</h2>
                
                <div className="space-y-6">
                  {/* Theme Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Design & Theme
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div 
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          theme === 'light' 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-dark-accent/10' 
                            : 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-dark-accent'
                        }`}
                        onClick={() => setThemeMode('light')}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Sun className="h-5 w-5 text-yellow-500" />
                          <span className="font-medium">Hell</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Klassisches helles Design</p>
                      </div>
                      <div 
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          theme === 'dark' 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-dark-accent/10' 
                            : 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-dark-accent'
                        }`}
                        onClick={() => setThemeMode('dark')}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Moon className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Dunkel</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Schonendes dunkles Design</p>
                      </div>
                      <div 
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          theme === 'system' 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-dark-accent/10' 
                            : 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-dark-accent'
                        }`}
                        onClick={() => setThemeMode('system')}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Monitor className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">System</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Folgt deinen Systemeinstellungen</p>
                      </div>
                    </div>
                  </div>

                  {/* Language Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Sprache & Region
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sprache
                        </label>
                        <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                          <option value="de">Deutsch</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zeitzone
                        </label>
                        <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                          <option value="Europe/Berlin">Berlin (UTC+1)</option>
                          <option value="Europe/London">London (UTC+0)</option>
                          <option value="America/New_York">New York (UTC-5)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sound Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Volume2 className="h-5 w-5" />
                      Audio & Benachrichtigungen
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium">Sound-Effekte</p>
                          <p className="text-sm text-gray-600">Aktiviere Audio-Feedback</p>
                        </div>
                        <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium">Erfolgs-Melodien</p>
                          <p className="text-sm text-gray-600">Spiele Melodien bei Erfolgen</p>
                        </div>
                        <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🔔 Benachrichtigungen</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium">E-Mail Benachrichtigungen</p>
                    <p className="text-sm text-gray-600">Erhalte Updates per E-Mail</p>
                  </div>
                  <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium">Push-Benachrichtigungen</p>
                    <p className="text-sm text-gray-600">Sofortige Updates auf deinem Gerät</p>
                  </div>
                  <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium">Ziel-Erinnerungen</p>
                    <p className="text-sm text-gray-600">Erinnerungen an deine gesetzten Ziele</p>
                  </div>
                  <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all"></div>
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium">Wöchentliche Zusammenfassung</p>
                    <p className="text-sm text-gray-600">Übersicht deiner Lernfortschritte</p>
                  </div>
                  <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🔒 Datenschutz & Sicherheit</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Profil-Sichtbarkeit</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">Öffentliches Profil</p>
                        <p className="text-sm text-gray-600">Andere können dein Profil sehen</p>
                      </div>
                      <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">Leaderboard-Teilnahme</p>
                        <p className="text-sm text-gray-600">Erscheine in der Bestenliste</p>
                      </div>
                      <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Daten & Analytics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">Lern-Daten teilen</p>
                        <p className="text-sm text-gray-600">Hilf uns, die App zu verbessern</p>
                      </div>
                      <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all"></div>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">Personalisierte Empfehlungen</p>
                        <p className="text-sm text-gray-600">Basiert auf deinen Lerngewohnheiten</p>
                      </div>
                      <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Account-Aktionen</h3>
                  <div className="space-y-3">
                    <button className="w-full text-left p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all">
                      <p className="font-medium text-red-700">Account löschen</p>
                      <p className="text-sm text-red-600">Permanente Löschung aller Daten</p>
                    </button>
                    
                    <button className="w-full text-left p-4 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-all">
                      <p className="font-medium text-yellow-700">Daten exportieren</p>
                      <p className="text-sm text-yellow-600">Lade alle deine Daten herunter</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && avatarFile && (
        <ImageCropper
          imageFile={avatarFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}
    </div>
  );
}
