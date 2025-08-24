import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Timer, 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Target,
  Zap,
  CheckCircle,
  BookOpen,
  Plus,
  Settings,
  BarChart3,
  Clock,
  Flame,
  Trophy,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  CheckSquare
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { supabase } from "./lib/supabase";
import { useTheme } from "./ThemeContext";

export default function DeepWorkTracker() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState("constructor"); // constructor, timer, analytics
  const [sessionTypes, setSessionTypes] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    goal: "",
    tags: [],
    sessionTypeId: null,
    duration: 25,
    breakDuration: 5,
    totalCycles: 4
  });
  const [timer, setTimer] = useState({
    timeLeft: 0,
    isRunning: false,
    isBreak: false,
    phase: "work", // work, break, long-break
    currentCycle: 1,
    totalCycles: 4,
    completedCycles: 0
  });
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalDuration: 0,
    avgFocusScore: 0,
    currentStreak: 0,
    bestStreak: 0
  });
  const [focusScore, setFocusScore] = useState(100);
  const [distractions, setDistractions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [sessionReflection, setSessionReflection] = useState("");
  
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  // Load session types and stats on mount
  useEffect(() => {
    loadSessionTypes();
    loadStats();
  }, [user]);

  // Timer logic
  useEffect(() => {
    if (timer.isRunning && timer.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev.timeLeft <= 1) {
            // Phase completed - handle cycle transitions
            handlePhaseCompletion();
            return { ...prev, isRunning: false, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [timer.isRunning, timer.timeLeft]);

  const loadSessionTypes = async () => {
    const { data, error } = await supabase
      .from("deepwork_session_types")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setSessionTypes(data);
      if (data.length > 0 && !sessionForm.sessionTypeId) {
        setSessionForm(prev => ({ ...prev, sessionTypeId: data[0].id }));
      }
    }
  };

  const loadStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .rpc('get_user_deepwork_stats', { user_uuid: user.id, days_back: 30 });

    if (!error && data && data.length > 0) {
      setStats(data[0]);
    }
  };

  const createSession = async () => {
    if (!user || !sessionForm.sessionTypeId) return;

    // Show task popup before starting
    setShowTaskPopup(true);
  };

  const startSessionWithTasks = async () => {
    const { data, error } = await supabase
      .from("deepwork_sessions")
      .insert([{
        user_id: user.id,
        session_type_id: sessionForm.sessionTypeId,
        title: sessionForm.title || "Deep Work Session",
        description: sessionForm.description,
        goal: sessionForm.goal,
        tags: sessionForm.tags,
        planned_duration: sessionForm.duration * sessionForm.totalCycles,
        status: "planned"
      }])
      .select()
      .single();

    if (!error && data) {
      setCurrentSession(data);
      setTimer({
        timeLeft: sessionForm.duration * 60,
        isRunning: false,
        isBreak: false,
        phase: "work",
        currentCycle: 1,
        totalCycles: sessionForm.totalCycles,
        completedCycles: 0
      });
      setShowTaskPopup(false);
      setActiveView("timer");
      
      // Keep tasks for the session
      console.log("Tasks for session:", tasks);
      
      // Reset form
      setSessionForm({
        title: "",
        description: "",
        goal: "",
        tags: [],
        sessionTypeId: sessionForm.sessionTypeId,
        duration: sessionForm.duration,
        breakDuration: sessionForm.breakDuration,
        totalCycles: sessionForm.totalCycles
      });
    }
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { id: Date.now(), text: newTask.trim(), completed: false }]);
      setNewTask("");
    }
  };

  const removeTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const startSession = async () => {
    if (!currentSession) return;

    setTimer(prev => ({ ...prev, isRunning: true }));
    
    // Update session status
    await supabase
      .from("deepwork_sessions")
      .update({ 
        status: "active", 
        started_at: new Date().toISOString() 
      })
      .eq("id", currentSession.id);

    // Log session start event
    await supabase
      .from("deepwork_session_events")
      .insert([{
        session_id: currentSession.id,
        event_type: "start",
        data: { focus_score: focusScore }
      }]);
  };

  const pauseSession = async () => {
    if (!currentSession) return;

    setTimer(prev => ({ ...prev, isRunning: false }));
    
    // Update session status
    await supabase
      .from("deepwork_sessions")
      .update({ 
        status: "paused", 
        paused_at: new Date().toISOString() 
      })
      .eq("id", currentSession.id);

    // Log pause event
    await supabase
      .from("deepwork_session_events")
      .insert([{
        session_id: currentSession.id,
        event_type: "pause",
        data: { focus_score: focusScore, distractions: distractions }
      }]);
  };

  const completeSession = async () => {
    if (!currentSession) return;

    // Show session summary instead of immediately completing
    setShowSessionSummary(true);
  };

  const finishSessionWithReflection = async () => {
    if (!currentSession) return;

    const actualDuration = (sessionForm.duration * 60 - timer.timeLeft) / 60;
    
    // Update session with reflection
    await supabase
      .from("deepwork_sessions")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString(),
        actual_duration: Math.round(actualDuration),
        focus_score: focusScore,
        description: sessionReflection // Save reflection as description
      })
      .eq("id", currentSession.id);

    // Log completion event
    await supabase
      .from("deepwork_session_events")
      .insert([{
        session_id: currentSession.id,
        event_type: "complete",
        data: { 
          focus_score: focusScore, 
          distractions: distractions,
          actual_duration: actualDuration,
          tasks_completed: tasks.filter(t => t.completed).length,
          total_tasks: tasks.length,
          reflection: sessionReflection
        }
      }]);

    // Reset state
    setCurrentSession(null);
    setTimer({ timeLeft: 0, isRunning: false, isBreak: false, phase: "work" });
    setFocusScore(100);
    setDistractions(0);
    setTasks([]);
    setSessionReflection("");
    setShowSessionSummary(false);
    setActiveView("constructor");
    
    // Reload stats
    loadStats();
  };

  const cancelSession = async () => {
    if (!currentSession) return;

    await supabase
      .from("deepwork_sessions")
      .update({ 
        status: "cancelled", 
        completed_at: new Date().toISOString() 
      })
      .eq("id", currentSession.id);

    setCurrentSession(null);
    setTimer({ timeLeft: 0, isRunning: false, isBreak: false, phase: "work" });
    setActiveView("constructor");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePhaseCompletion = () => {
    if (timer.phase === "work") {
      // Work phase completed
      const newCompletedCycles = timer.completedCycles + 1;
      
      if (newCompletedCycles >= timer.totalCycles) {
        // All cycles completed
        completeSession();
      } else {
        // Start break
        const isLongBreak = newCompletedCycles % 4 === 0; // Long break every 4 cycles
        const breakDuration = isLongBreak ? Math.max(sessionForm.breakDuration * 2, 15) : sessionForm.breakDuration;
        
        setTimer(prev => ({
          ...prev,
          timeLeft: breakDuration * 60,
          isRunning: false,
          isBreak: true,
          phase: isLongBreak ? "long-break" : "break",
          completedCycles: newCompletedCycles
        }));
        
        // Show notification
        if (Notification.permission === "granted") {
          new Notification("Deep Work", {
            body: `Zyklus ${newCompletedCycles} abgeschlossen! Pause starten?`,
            icon: "/favicon.ico"
          });
        }
      }
    } else {
      // Break completed - start next work cycle
      setTimer(prev => ({
        ...prev,
        timeLeft: sessionForm.duration * 60,
        isRunning: false,
        isBreak: false,
        phase: "work",
        currentCycle: prev.currentCycle + 1
      }));
      
      // Show notification
      if (Notification.permission === "granted") {
        new Notification("Deep Work", {
          body: `Pause beendet! Zyklus ${timer.currentCycle + 1} starten?`,
          icon: "/favicon.ico"
        });
      }
    }
  };

  const getProgressPercentage = () => {
    if (!currentSession) return 0;
    const totalTime = sessionForm.duration * 60;
    const elapsed = totalTime - timer.timeLeft;
    return (elapsed / totalTime) * 100;
  };

  const getOverallProgressPercentage = () => {
    if (!currentSession) return 0;
    const totalWorkTime = sessionForm.duration * sessionForm.totalCycles * 60;
    const completedWorkTime = timer.completedCycles * sessionForm.duration * 60;
    const currentPhaseTime = (sessionForm.duration * 60) - timer.timeLeft;
    const totalElapsed = completedWorkTime + currentPhaseTime;
    return (totalElapsed / totalWorkTime) * 100;
  };

  const getSessionTypeIcon = (iconName) => {
    const icons = {
      brain: Brain,
      timer: Timer,
      zap: Zap,
      "check-circle": CheckCircle,
      target: Target,
      "book-open": BookOpen
    };
    return icons[iconName] || Brain;
  };

  const calculateTotalSessionTime = () => {
    const workTime = sessionForm.duration * sessionForm.totalCycles;
    const shortBreaks = sessionForm.totalCycles - 1; // Pausen zwischen Zyklen
    const shortBreakTime = shortBreaks * sessionForm.breakDuration;
    
    // Lange Pausen alle 4 Zyklen
    const longBreakCycles = Math.floor((sessionForm.totalCycles - 1) / 4);
    const longBreakTime = longBreakCycles * Math.max(sessionForm.breakDuration * 2, 15);
    
    return workTime + shortBreakTime + longBreakTime;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-primary dark:to-dark-secondary">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-dark-accent dark:to-purple-600 rounded-xl text-white">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">Deep Work Tracker</h1>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Maximiere deine Produktivität</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView("analytics")}
                className={`p-2 rounded-lg transition-colors ${
                  activeView === "analytics" 
                    ? "bg-indigo-100 dark:bg-dark-accent/10 text-indigo-600 dark:text-dark-accent" 
                    : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-secondary"
                }`}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeView === "constructor" && (
            <motion.div
              key="constructor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Session Constructor */}
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-6">Session Constructor</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Session Types */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Session Typ wählen</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sessionTypes.map((type) => {
                        const Icon = getSessionTypeIcon(type.icon);
                        return (
                          <button
                            key={type.id}
                                                         onClick={() => {
                               const isPomodoro = type.name === "Pomodoro";
                               const isDeepWork = type.name === "Deep Work";
                               const isFlowState = type.name === "Flow State";
                               
                               setSessionForm(prev => ({ 
                                 ...prev, 
                                 sessionTypeId: type.id,
                                 duration: type.default_duration,
                                 breakDuration: type.default_break_duration,
                                 totalCycles: isPomodoro ? 4 : isDeepWork ? 2 : isFlowState ? 1 : 1
                               }));
                             }}
                            className={`p-4 rounded-xl border transition-all ${
                              sessionForm.sessionTypeId === type.id
                                ? "border-indigo-500 dark:border-dark-accent bg-indigo-50 dark:bg-dark-accent/10"
                                : "border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-dark-accent/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: type.color + '20', color: type.color }}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-gray-900 dark:text-dark-text">{type.name}</div>
                                <div className="text-sm text-gray-600 dark:text-dark-text-secondary">{type.description}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                        Session Titel
                      </label>
                      <input
                        type="text"
                        value={sessionForm.title}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                        placeholder="z.B. Klausur lernen, Projekt arbeiten..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                        Ziel/Goal
                      </label>
                      <input
                        type="text"
                        value={sessionForm.goal}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, goal: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                        placeholder="Was möchtest du erreichen?"
                      />
                    </div>

                                         <div className="grid grid-cols-3 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                           Dauer (Min)
                         </label>
                         <input
                           type="number"
                           value={sessionForm.duration}
                           onChange={(e) => setSessionForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 25 }))}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                           min="5"
                           max="240"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                           Zyklen
                         </label>
                         <input
                           type="number"
                           value={sessionForm.totalCycles}
                           onChange={(e) => setSessionForm(prev => ({ ...prev, totalCycles: parseInt(e.target.value) || 4 }))}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                           min="1"
                           max="12"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                           Pause (Min)
                         </label>
                         <input
                           type="number"
                           value={sessionForm.breakDuration}
                           onChange={(e) => setSessionForm(prev => ({ ...prev, breakDuration: parseInt(e.target.value) || 5 }))}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                           min="1"
                           max="30"
                         />
                       </div>
                     </div>

                     {/* Session Info */}
                     <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                       <div className="flex items-start gap-3">
                         <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-lg">
                           <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                         </div>
                         <div>
                           <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Session Übersicht</h4>
                           <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                             Nach jedem Zyklus: <strong>{sessionForm.breakDuration} Min</strong> Pause<br/>
                             Gesamte Sessionlänge: <strong>{calculateTotalSessionTime()} Min</strong>
                           </p>
                         </div>
                       </div>
                     </div>

                    <button
                      onClick={createSession}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-dark-accent dark:to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 dark:hover:from-dark-accent-hover dark:hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Play className="h-5 w-5" />
                      Session starten
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{Math.round(stats.totalDuration)}h</div>
                      <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Gesamtzeit</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{stats.totalSessions}</div>
                      <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Sessions</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{stats.avgFocusScore}%</div>
                      <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Fokus Score</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{stats.currentStreak}</div>
                      <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Tage Streak</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === "timer" && currentSession && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Timer Interface */}
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-8 shadow-sm">
                <div className="text-center space-y-6">
                                                        {/* Session Info */}
                   <div>
                     <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
                       {currentSession.title}
                     </h2>
                     {currentSession.goal && (
                       <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
                         🎯 {currentSession.goal}
                       </p>
                     )}
                   </div>

                   {/* Timer Display */}
                   <div className="relative p-8">
                     {/* Progress Ring */}
                     <div className="absolute inset-0 flex items-center justify-center">
                       <svg className="w-96 h-96 transform -rotate-90">
                         <circle
                           cx="192"
                           cy="192"
                           r="180"
                           stroke="currentColor"
                           strokeWidth="8"
                           fill="none"
                           className="text-gray-200 dark:text-gray-700"
                         />
                         <circle
                           cx="192"
                           cy="192"
                           r="180"
                           stroke="currentColor"
                           strokeWidth="8"
                           fill="none"
                           strokeDasharray={`${2 * Math.PI * 180}`}
                           strokeDashoffset={`${2 * Math.PI * 180 * (1 - getOverallProgressPercentage() / 100)}`}
                           className={`transition-all duration-1000 ${
                             timer.phase === "work" 
                               ? "text-indigo-600 dark:text-dark-accent"
                               : timer.phase === "break"
                               ? "text-green-500"
                               : "text-orange-500"
                           }`}
                         />
                       </svg>
                     </div>

                     {/* Timer Content */}
                     <div className="relative z-10 flex flex-col items-center justify-center h-80">
                       {/* Phase Info */}
                       <div className="flex items-center gap-4 mb-6">
                         <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                           timer.phase === "work" 
                             ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                             : timer.phase === "break"
                             ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                             : "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                         }`}>
                           {timer.phase === "work" ? "Arbeit" : timer.phase === "break" ? "Pause" : "Lange Pause"}
                         </div>
                         <div className="px-4 py-2 bg-gray-100 dark:bg-dark-secondary rounded-full text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                           Zyklus {timer.currentCycle} von {timer.totalCycles}
                         </div>
                       </div>

                       {/* Timer */}
                       <div className="text-7xl font-bold text-gray-900 dark:text-dark-text mb-8">
                         {formatTime(timer.timeLeft)}
                       </div>

                       {/* Focus Stats */}
                       <div className="flex items-center gap-8">
                         <div className="text-center">
                           <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{focusScore}%</div>
                           <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Fokus</div>
                         </div>
                         <div className="text-center">
                           <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">{distractions}</div>
                           <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Ablenkungen</div>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Cycle Overview */}
                   <div className="flex items-center justify-center gap-3 mt-6">
                     {Array.from({ length: timer.totalCycles }, (_, i) => (
                       <div
                         key={i}
                         className={`w-4 h-4 rounded-full transition-all ${
                           i < timer.completedCycles
                             ? "bg-green-500"
                             : i === timer.currentCycle - 1 && timer.phase === "work"
                             ? "bg-indigo-500 animate-pulse"
                             : "bg-gray-300 dark:bg-gray-600"
                         }`}
                       />
                     ))}
                   </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    {!timer.isRunning ? (
                      <button
                        onClick={startSession}
                        className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
                      >
                        <Play className="h-6 w-6" />
                      </button>
                    ) : (
                      <button
                        onClick={pauseSession}
                        className="p-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all shadow-lg"
                      >
                        <Pause className="h-6 w-6" />
                      </button>
                    )}
                    
                    <button
                      onClick={cancelSession}
                      className="p-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all shadow-lg"
                    >
                      <Square className="h-6 w-6" />
                    </button>
                    
                    <button
                      onClick={() => setActiveView("constructor")}
                      className="p-4 bg-gray-100 dark:bg-dark-secondary text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-gray-200 dark:hover:bg-dark-primary transition-all"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Focus Controls */}
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Fokus Management</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                      Fokus Score: {focusScore}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={focusScore}
                      onChange={(e) => setFocusScore(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                      <span>Niedrig</span>
                      <span>Hoch</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                      Ablenkungen: {distractions}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDistractions(prev => Math.max(0, prev - 1))}
                        className="p-2 bg-gray-100 dark:bg-dark-secondary text-gray-600 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-primary transition-all"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setDistractions(prev => prev + 1)}
                        className="p-2 bg-gray-100 dark:bg-dark-secondary text-gray-600 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-primary transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Tasks */}
              {console.log("Rendering tasks:", tasks)}
              {tasks.length > 0 && (
                <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Session Tasks</h3>
                    <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                      {tasks.filter(t => t.completed).length} von {tasks.length} erledigt
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          task.completed 
                            ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" 
                            : "bg-gray-50 dark:bg-dark-secondary border-gray-200 dark:border-dark-border"
                        }`}
                      >
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`p-1 rounded-lg transition-all ${
                            task.completed 
                              ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" 
                              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {task.completed ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>
                        <span className={`flex-1 text-sm ${task.completed ? "line-through text-gray-500 dark:text-dark-text-secondary" : "text-gray-700 dark:text-dark-text"}`}>
                          {task.text}
                        </span>
                        {task.completed && (
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Erledigt
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeView === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Deep Work Analytics</h2>
                  <button
                    onClick={() => setActiveView("constructor")}
                    className="p-2 bg-gray-100 dark:bg-dark-secondary text-gray-600 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-primary transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
                    <div className="text-3xl font-bold">{Math.round(stats.totalDuration)}h</div>
                    <div className="text-blue-100">Gesamtzeit</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white">
                    <div className="text-3xl font-bold">{stats.totalSessions}</div>
                    <div className="text-green-100">Sessions</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl text-white">
                    <div className="text-3xl font-bold">{stats.avgFocusScore}%</div>
                    <div className="text-purple-100">Fokus Score</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white">
                    <div className="text-3xl font-bold">{stats.currentStreak}</div>
                    <div className="text-orange-100">Tage Streak</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task Popup Modal */}
      {showTaskPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Session Tasks definieren</h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Definiere konkrete Aufgaben für deine {sessionForm.title || "Deep Work"} Session
                </p>
              </div>
              <button
                onClick={() => setShowTaskPopup(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Task Input */}
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  placeholder="z.B. Kapitel 3 lesen, Aufgaben 1-5 lösen..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all"
                />
                <button
                  onClick={addTask}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Hinzufügen
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Tasks ({tasks.length})
              </h4>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Noch keine Tasks definiert</p>
                  <p className="text-sm">Füge konkrete Aufgaben hinzu, um fokussiert zu bleiben</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-secondary rounded-xl border border-gray-200 dark:border-dark-border"
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`p-1 rounded-lg transition-all ${
                          task.completed 
                            ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" 
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {task.completed ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                      <span className={`flex-1 text-sm ${task.completed ? "line-through text-gray-500 dark:text-dark-text-secondary" : "text-gray-700 dark:text-dark-text"}`}>
                        {task.text}
                      </span>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowTaskPopup(false)}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text rounded-xl hover:bg-gray-50 dark:hover:bg-dark-secondary transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={startSessionWithTasks}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4" />
                Session starten
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Session Summary Modal */}
      {showSessionSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Session abgeschlossen! 🎉</h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Wie war deine Deep Work Session?
              </p>
            </div>
            
            {/* Session Summary */}
            <div className="bg-gray-50 dark:bg-dark-secondary rounded-xl p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-3">Session Übersicht</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-dark-text-secondary">Dauer</div>
                  <div className="font-medium text-gray-900 dark:text-dark-text">
                    {Math.round((sessionForm.duration * 60 - timer.timeLeft) / 60)} Min
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-dark-text-secondary">Fokus Score</div>
                  <div className="font-medium text-gray-900 dark:text-dark-text">{focusScore}%</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-dark-text-secondary">Ablenkungen</div>
                  <div className="font-medium text-gray-900 dark:text-dark-text">{distractions}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-dark-text-secondary">Tasks erledigt</div>
                  <div className="font-medium text-gray-900 dark:text-dark-text">
                    {tasks.filter(t => t.completed).length} von {tasks.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Reflection Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Session Reflexion (optional)
              </label>
              <textarea
                value={sessionReflection}
                onChange={(e) => setSessionReflection(e.target.value)}
                placeholder="Wie war die Session? Was hast du gelernt? Was könntest du nächstes Mal besser machen?"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSessionSummary(false)}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text rounded-xl hover:bg-gray-50 dark:hover:bg-dark-secondary transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={finishSessionWithReflection}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Session beenden
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Deep Work Einstellungen</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-dark-text">Auto-Start Pausen</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-dark-text">Benachrichtigungen</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-dark-text">Fokus Erinnerungen</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
