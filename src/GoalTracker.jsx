import React, { useState, useEffect, useContext } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Edit,
  Trash,
  BarChart3,
  Trophy,
  Activity,
  Zap,
  BookOpen,
  DollarSign,
  Heart,
  Brain,
  Briefcase,
  Star,
  ChevronRight,
  ChevronLeft,
  X,
  Save,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

const GoalTracker = () => {
  const { user } = useAuth();
  
  // Error state
  const [error, setError] = useState(null);
  const [goals, setGoals] = useState([]);
  const [goalStats, setGoalStats] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [view, setView] = useState('overview'); // overview, detail, create
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['health']));

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal',
    goal_metric: {
      attribute: '',
      unit: '',
      direction: 'increase',
      start_value: 0,
      target_value: 0,
      current_value: 0
    },
    start_date: '',
    target_date: '',
    check_in_frequency: 'daily',
    color: '#6366f1',
    icon: 'target',
    milestones: [],
    auto_generate_tasks: true
  });

  const [checkInData, setCheckInData] = useState({
    current_value: 0,
    notes: ''
  });

  // Metric units with categories and descriptions
  const metricUnits = {
    health: [
      { value: 'kg', label: 'Kilogramm', description: 'Gewicht in kg', icon: '⚖️' },
      { value: 'lbs', label: 'Pfund', description: 'Gewicht in lbs', icon: '⚖️' },
      { value: 'cm', label: 'Zentimeter', description: 'Größe/Länge in cm', icon: '📏' },
      { value: 'bmi', label: 'BMI', description: 'Body Mass Index', icon: '📊' },
      { value: 'steps', label: 'Schritte', description: 'Tägliche Schritte', icon: '👟' },
      { value: 'calories', label: 'Kalorien', description: 'Verbrannte Kalorien', icon: '🔥' },
      { value: 'hours_sleep', label: 'Schlafstunden', description: 'Stunden Schlaf', icon: '😴' },
      { value: 'heart_rate', label: 'Herzfrequenz', description: 'Schläge pro Minute', icon: '❤️' },
      { value: 'blood_pressure', label: 'Blutdruck', description: 'mmHg', icon: '🩸' },
      { value: 'water_liters', label: 'Wasser (L)', description: 'Liter Wasser pro Tag', icon: '💧' }
    ],
    fitness: [
      { value: 'kg', label: 'Kilogramm', description: 'Gewicht in kg', icon: '🏋️' },
      { value: 'lbs', label: 'Pfund', description: 'Gewicht in lbs', icon: '🏋️' },
      { value: 'reps', label: 'Wiederholungen', description: 'Anzahl Wiederholungen', icon: '💪' },
      { value: 'sets', label: 'Sätze', description: 'Anzahl Sätze', icon: '🔄' },
      { value: 'minutes', label: 'Minuten', description: 'Trainingszeit', icon: '⏱️' },
      { value: 'km', label: 'Kilometer', description: 'Distanz in km', icon: '🏃' },
      { value: 'miles', label: 'Meilen', description: 'Distanz in Meilen', icon: '🏃' },
      { value: 'pushups', label: 'Liegestütze', description: 'Anzahl Liegestütze', icon: '🤸' },
      { value: 'pullups', label: 'Klimmzüge', description: 'Anzahl Klimmzüge', icon: '🧗' },
      { value: 'squats', label: 'Kniebeugen', description: 'Anzahl Kniebeugen', icon: '🦵' }
    ],
    finance: [
      { value: '€', label: 'Euro', description: 'Euro', icon: '💶' },
      { value: '$', label: 'Dollar', description: 'US Dollar', icon: '💵' },
      { value: '£', label: 'Pfund', description: 'Britisches Pfund', icon: '💷' },
      { value: '¥', label: 'Yen', description: 'Japanischer Yen', icon: '💴' },
      { value: '%', label: 'Prozent', description: 'Prozentuale Rendite', icon: '📈' },
      { value: 'shares', label: 'Aktien', description: 'Anzahl Aktien', icon: '📊' },
      { value: 'crypto', label: 'Krypto', description: 'Kryptowährung', icon: '₿' },
      { value: 'savings', label: 'Ersparnisse', description: 'Gespartes Geld', icon: '💰' },
      { value: 'income', label: 'Einkommen', description: 'Monatliches Einkommen', icon: '💼' },
      { value: 'investments', label: 'Investitionen', description: 'Investiertes Kapital', icon: '📈' }
    ],
    learning: [
      { value: 'hours', label: 'Stunden', description: 'Lernzeit in Stunden', icon: '⏰' },
      { value: 'pages', label: 'Seiten', description: 'Gelesene Seiten', icon: '📖' },
      { value: 'lessons', label: 'Lektionen', description: 'Abgeschlossene Lektionen', icon: '🎓' },
      { value: 'words', label: 'Wörter', description: 'Gelernte Wörter', icon: '📝' },
      { value: 'chapters', label: 'Kapitel', description: 'Abgeschlossene Kapitel', icon: '📚' },
      { value: 'cards', label: 'Karteikarten', description: 'Gelernte Karteikarten', icon: '🗂️' },
      { value: 'videos', label: 'Videos', description: 'Geschaute Lernvideos', icon: '🎥' },
      { value: 'exercises', label: 'Übungen', description: 'Abgeschlossene Übungen', icon: '✏️' },
      { value: 'projects', label: 'Projekte', description: 'Abgeschlossene Projekte', icon: '💻' },
      { value: 'certificates', label: 'Zertifikate', description: 'Erworbene Zertifikate', icon: '🏆' }
    ],
    career: [
      { value: 'hours', label: 'Stunden', description: 'Arbeitszeit in Stunden', icon: '⏰' },
      { value: 'projects', label: 'Projekte', description: 'Abgeschlossene Projekte', icon: '📋' },
      { value: 'certifications', label: 'Zertifizierungen', description: 'Erworbene Zertifizierungen', icon: '🏆' },
      { value: 'meetings', label: 'Meetings', description: 'Anzahl Meetings', icon: '🤝' },
      { value: 'clients', label: 'Kunden', description: 'Anzahl Kunden', icon: '👥' },
      { value: 'sales', label: 'Verkäufe', description: 'Anzahl Verkäufe', icon: '💰' },
      { value: 'skills', label: 'Fähigkeiten', description: 'Neue Fähigkeiten', icon: '🎨' },
      { value: 'networking', label: 'Networking', description: 'Networking Events', icon: '🌐' },
      { value: 'promotions', label: 'Beförderungen', description: 'Anzahl Beförderungen', icon: '📈' },
      { value: 'salary', label: 'Gehalt', description: 'Gehalt in €', icon: '💼' }
    ],
    personal: [
      { value: 'items', label: 'Items', description: 'Anzahl Items', icon: '📦' },
      { value: 'times', label: 'Mal', description: 'Anzahl Male', icon: '🔄' },
      { value: 'days', label: 'Tage', description: 'Anzahl Tage', icon: '📅' },
      { value: 'weeks', label: 'Wochen', description: 'Anzahl Wochen', icon: '📆' },
      { value: 'months', label: 'Monate', description: 'Anzahl Monate', icon: '🗓️' },
      { value: 'habits', label: 'Gewohnheiten', description: 'Tage in Folge', icon: '🔄' },
      { value: 'goals', label: 'Ziele', description: 'Erreichte Ziele', icon: '🎯' },
      { value: 'experiences', label: 'Erfahrungen', description: 'Neue Erfahrungen', icon: '🌟' },
      { value: 'skills', label: 'Fähigkeiten', description: 'Gelernte Fähigkeiten', icon: '🎨' },
      { value: 'units', label: 'Einheiten', description: 'Allgemeine Einheiten', icon: '📊' }
    ]
  };

  const categoryIcons = {
    health: Heart,
    fitness: Activity,
    finance: DollarSign,
    learning: BookOpen,
    career: Briefcase,
    personal: Star
  };

  useEffect(() => {
    if (user) {
      try {
        loadGoals();
        loadTemplates();
        loadGoalStats();
      } catch (err) {
        console.error('Error in useEffect:', err);
        setError(err.message);
      }
    }
  }, [user]);

  const loadGoals = async () => {
    try {
      // Fallback: Direkte Abfrage falls RPC-Funktion noch nicht existiert
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading goals:', error);
        setGoals([]);
      } else {
        setGoals(data || []);
        
        // Update selectedGoal if it's currently being viewed
        if (selectedGoal && data) {
          const updatedGoal = data.find(g => g.id === selectedGoal.id);
          if (updatedGoal) {
            setSelectedGoal(updatedGoal);
          }
        }
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('is_public', true);

      if (error) {
        console.error('Error loading templates:', error);
        setTemplates([]);
      } else {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  const loadGoalStats = async () => {
    try {
      // Fallback: Direkte Abfrage falls RPC-Funktion noch nicht existiert
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading goal stats:', error);
        setGoalStats({});
      } else {
        const stats = {
          total_goals: data?.length || 0,
          active_goals: data?.filter(g => g.status === 'active').length || 0,
          completed_goals: data?.filter(g => g.status === 'completed').length || 0,
          on_track_goals: data?.filter(g => g.is_on_track && g.status === 'active').length || 0,
          overdue_goals: data?.filter(g => g.target_date < new Date().toISOString().split('T')[0] && g.status === 'active').length || 0,
          avg_progress: data?.length > 0 ? (data.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / data.length).toFixed(1) : 0
        };
        setGoalStats(stats);
      }
    } catch (error) {
      console.error('Error loading goal stats:', error);
      setGoalStats({});
    }
  };

  const createGoal = async () => {
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .insert([{
          user_id: user.id,
          ...formData,
          goal_metric: {
            ...formData.goal_metric,
            current_value: formData.goal_metric.start_value
          }
        }])
        .select()
        .single();

      if (error) throw error;

      // Generate tasks if enabled
      if (formData.auto_generate_tasks) {
        try {
          await supabase.rpc('generate_goal_tasks', { goal_uuid: data.id });
        } catch (taskError) {
          console.warn('Could not generate tasks:', taskError);
        }
      }

      setShowCreateModal(false);
      resetForm();
      loadGoals();
      loadGoalStats();
    } catch (error) {
      console.error('Error creating goal:', error);
      setError('Fehler beim Erstellen des Ziels: ' + error.message);
    }
  };

  const createGoalFromTemplate = async (template) => {
    setFormData({
      title: '',
      description: '',
      category: template.category,
      goal_metric: template.template_data.goal_metric,
      start_date: new Date().toISOString().split('T')[0],
      target_date: '',
      check_in_frequency: template.template_data.check_in_frequency,
      color: '#6366f1',
      icon: 'target',
      milestones: template.template_data.milestones || [],
      auto_generate_tasks: true,
      task_template: template.template_data.task_template || {}
    });
    setSelectedTemplate(template);
    setView('create');
  };

  const addCheckIn = async () => {
    try {
      const { error } = await supabase
        .from('goal_check_ins')
        .insert([{
          goal_id: selectedGoal.id,
          user_id: user.id,
          check_in_date: new Date().toISOString().split('T')[0],
          current_value: checkInData.current_value,
          notes: checkInData.notes
        }]);

      if (error) throw error;

      // Update goal's current value and recalculate progress
      const updatedMetric = {
        ...selectedGoal.goal_metric,
        current_value: checkInData.current_value
      };

      // Calculate new progress
      const startValue = selectedGoal.goal_metric?.start_value || 0;
      const targetValue = selectedGoal.goal_metric?.target_value || 0;
      const direction = selectedGoal.goal_metric?.direction || 'increase';
      
      let progressPercentage = 0;
      if (direction === 'increase') {
        progressPercentage = targetValue > startValue ? 
          ((checkInData.current_value - startValue) / (targetValue - startValue)) * 100 : 0;
      } else {
        progressPercentage = startValue > targetValue ? 
          ((startValue - checkInData.current_value) / (startValue - targetValue)) * 100 : 0;
      }
      
      progressPercentage = Math.max(0, Math.min(100, progressPercentage));

      // Calculate if on track
      const startDate = new Date(selectedGoal.start_date);
      const targetDate = new Date(selectedGoal.target_date);
      const currentDate = new Date();
      const totalDays = (targetDate - startDate) / (1000 * 60 * 60 * 24);
      const elapsedDays = (currentDate - startDate) / (1000 * 60 * 60 * 24);
      const timeProgress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
      const isOnTrack = progressPercentage >= timeProgress;

      // Check for milestones before updating
      const milestones = selectedGoal.milestones || [];
      const updatedMilestones = milestones.map(milestone => {
        if (milestone.achieved) return milestone; // Skip already achieved milestones
        
        const milestoneAchieved = direction === 'increase' 
          ? checkInData.current_value >= milestone.target_value
          : checkInData.current_value <= milestone.target_value;
        
        if (milestoneAchieved) {
          return {
            ...milestone,
            achieved: true,
            achieved_at: new Date().toISOString()
          };
        }
        
        return milestone;
      });

      // Check if any new milestones were achieved
      const newlyAchievedMilestones = updatedMilestones.filter(m => 
        m.achieved && !milestones.find(old => old.id === m.id && old.achieved)
      );

      await supabase
        .from('user_goals')
        .update({ 
          goal_metric: updatedMetric,
          progress_percentage: progressPercentage,
          is_on_track: isOnTrack,
          last_check_in_date: new Date().toISOString().split('T')[0],
          milestones: updatedMilestones
        })
        .eq('id', selectedGoal.id);

      // Show notification for newly achieved milestones
      if (newlyAchievedMilestones.length > 0) {
        newlyAchievedMilestones.forEach(milestone => {
          // Create a simple notification
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 max-w-sm';
          notification.innerHTML = `
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="font-bold text-lg">Milestone erreicht! 🎉</h4>
                <p class="font-medium">${milestone.title}</p>
                ${milestone.reward ? `<p class="text-sm opacity-90 mt-1">🏆 Belohnung: ${milestone.reward}</p>` : ''}
              </div>
            </div>
          `;
          document.body.appendChild(notification);
          
          // Remove notification after 5 seconds
          setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 300);
          }, 5000);
        });
      }

      setShowCheckInModal(false);
      setCheckInData({ current_value: 0, notes: '' });
      loadGoals();
    } catch (error) {
      console.error('Error adding check-in:', error);
      setError('Fehler beim Check-In: ' + error.message);
    }
  };

  const updateGoalStatus = async (goalId, status) => {
    try {
      await supabase
        .from('user_goals')
        .update({ status })
        .eq('id', goalId);

      loadGoals();
    } catch (error) {
      console.error('Error updating goal status:', error);
      setError('Fehler beim Aktualisieren des Status: ' + error.message);
    }
  };

  const deleteGoal = async (goalId) => {
    if (!confirm('Möchtest du dieses Ziel wirklich löschen?')) return;

    try {
      await supabase
        .from('user_goals')
        .delete()
        .eq('id', goalId);

      loadGoals();
      loadGoalStats();
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Fehler beim Löschen des Ziels: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'personal',
      goal_metric: {
        attribute: '',
        unit: '',
        direction: 'increase',
        start_value: 0,
        target_value: 0,
        current_value: 0
      },
      start_date: '',
      target_date: '',
      check_in_frequency: 'daily',
      color: '#6366f1',
      icon: 'target',
      milestones: [],
      auto_generate_tasks: true
    });
    setSelectedTemplate(null);
  };

  const addMilestone = () => {
    const newMilestone = {
      id: crypto.randomUUID(),
      title: '',
      target_value: 0,
      reward: '',
      achieved: false
    };
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone]
    }));
  };

  const updateMilestone = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => 
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };

  const removeMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const getProgressColor = (progress, isOnTrack) => {
    if (progress >= 100) return 'text-green-500';
    if (isOnTrack) return 'text-blue-500';
    return 'text-orange-500';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <RotateCcw className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'paused': return 'text-yellow-500';
      case 'completed': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error handling
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Fehler beim Laden</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nicht angemeldet</h2>
          <p className="text-gray-600">Bitte melde dich an, um deine Ziele zu verwalten.</p>
        </div>
      </div>
    );
  }

  // Check-In History Component
  const CheckInHistory = ({ goalId }) => {
    const [checkIns, setCheckIns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadCheckIns = async () => {
        try {
          const { data, error } = await supabase
            .from('goal_check_ins')
            .select('*')
            .eq('goal_id', goalId)
            .order('check_in_date', { ascending: false });

          if (error) {
            console.error('Error loading check-ins:', error);
            setCheckIns([]);
          } else {
            setCheckIns(data || []);
          }
        } catch (error) {
          console.error('Error loading check-ins:', error);
          setCheckIns([]);
        } finally {
          setLoading(false);
        }
      };

      if (goalId) {
        loadCheckIns();
      }
    }, [goalId]);

    if (loading) {
      return <div className="text-center py-4">Lade Check-Ins...</div>;
    }

    if (checkIns.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Noch keine Check-Ins vorhanden</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {checkIns.map((checkIn) => (
          <div key={checkIn.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">
                  {checkIn.current_value} {metricUnits[selectedGoal.category]?.find(u => u.value === selectedGoal?.goal_metric?.unit)?.label || selectedGoal?.goal_metric?.unit || 'units'}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(checkIn.check_in_date).toLocaleDateString('de-DE')}
              </span>
            </div>
            {checkIn.notes && (
              <p className="text-sm text-gray-600 mt-2">{checkIn.notes}</p>
            )}
            {checkIn.progress_percentage !== null && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Fortschritt: {checkIn.progress_percentage}%</span>
                  <span className={checkIn.is_on_track ? 'text-green-600' : 'text-orange-600'}>
                    {checkIn.is_on_track ? 'On Track' : 'Off Track'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${
                      checkIn.progress_percentage >= 100 ? 'bg-green-500' : 
                      checkIn.is_on_track ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(checkIn.progress_percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                <Target className="inline-block w-8 h-8 mr-3 text-blue-600" />
                Ziel-Tracker
              </h1>
              <p className="text-gray-600">Verfolge deine Ziele und erreiche deine Träume</p>
            </div>
            <button
              onClick={() => setView('create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Neues Ziel
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {view === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktive Ziele</p>
                  <p className="text-2xl font-bold text-gray-900">{goalStats.active_goals || 0}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On Track</p>
                  <p className="text-2xl font-bold text-green-600">{goalStats.on_track_goals || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Abgeschlossen</p>
                  <p className="text-2xl font-bold text-blue-600">{goalStats.completed_goals || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ø Fortschritt</p>
                  <p className="text-2xl font-bold text-purple-600">{goalStats.avg_progress || 0}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {view === 'overview' && (
          <div className="space-y-6">
            {/* Templates Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Schnellstart mit Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => createGoalFromTemplate(template)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {React.createElement(categoryIcons[template.category] || Star, { className: "w-5 h-5 text-blue-500" })}
                      <span className="font-medium text-gray-900">{template.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Goals List */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Deine Ziele</h2>
              {goals.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Ziele</h3>
                  <p className="text-gray-600 mb-4">Erstelle dein erstes Ziel und beginne deine Reise</p>
                  <button
                    onClick={() => setView('create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Erstes Ziel erstellen
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: goal.color || '#6366f1' }}></div>
                            <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                              {goal.status}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-4">{goal.description}</p>
                          
                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Fortschritt: {goal.progress_percentage || 0}%</span>
                              <span className={goal.is_on_track ? 'text-green-600' : 'text-orange-600'}>
                                {goal.is_on_track ? 'On Track' : 'Off Track'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  (goal.progress_percentage || 0) >= 100 ? 'bg-green-500' : 
                                  goal.is_on_track ? 'bg-blue-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.min(goal.progress_percentage || 0, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Goal Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Aktueller Wert</p>
                              <p className="font-medium">{goal.goal_metric?.current_value || 0} {metricUnits[goal.category]?.find(u => u.value === goal.goal_metric?.unit)?.label || goal.goal_metric?.unit || 'units'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Zielwert</p>
                              <p className="font-medium">{goal.goal_metric?.target_value || 0} {metricUnits[goal.category]?.find(u => u.value === goal.goal_metric?.unit)?.label || goal.goal_metric?.unit || 'units'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Verbleibende Tage</p>
                              <p className="font-medium">{Math.max(0, goal.target_date ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Zeit-Fortschritt</p>
                              <p className="font-medium">{goal.start_date && goal.target_date ? Math.round(((new Date() - new Date(goal.start_date)) / (new Date(goal.target_date) - new Date(goal.start_date))) * 100) : 0}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedGoal(goal);
                              setCheckInData({ current_value: goal.goal_metric?.current_value || 0, notes: '' });
                              setShowCheckInModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                            title="Check-In"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedGoal(goal);
                              setView('detail');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                            title="Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Goal View */}
        {view === 'create' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedTemplate ? `Ziel erstellen: ${selectedTemplate.name}` : 'Neues Ziel erstellen'}
              </h2>
              <button
                onClick={() => {
                  setView('overview');
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createGoal(); }} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="personal">Persönlich</option>
                    <option value="health">Gesundheit</option>
                    <option value="finance">Finanzen</option>
                    <option value="learning">Lernen</option>
                    <option value="career">Karriere</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Goal Metric */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Zielmetrik</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attribut</label>
                    <input
                      type="text"
                      value={formData.goal_metric.attribute}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        goal_metric: { ...prev.goal_metric, attribute: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. weight, savings, study_hours"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Einheit</label>
                    <button
                      type="button"
                      onClick={() => setShowUnitModal(true)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left ${
                        formData.goal_metric.unit ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {formData.goal_metric.unit ? (
                        <span className="flex items-center gap-2">
                          <span>{metricUnits[formData.category]?.find(u => u.value === formData.goal_metric.unit)?.icon || '📊'}</span>
                          <span>{metricUnits[formData.category]?.find(u => u.value === formData.goal_metric.unit)?.label || formData.goal_metric.unit}</span>
                        </span>
                      ) : (
                        'Einheit auswählen'
                      )}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Richtung</label>
                    <select
                      value={formData.goal_metric.direction}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        goal_metric: { ...prev.goal_metric, direction: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="increase">Zunahme</option>
                      <option value="decrease">Abnahme</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Startwert</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.goal_metric.start_value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        goal_metric: { ...prev.goal_metric, start_value: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zielwert</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.goal_metric.target_value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        goal_metric: { ...prev.goal_metric, target_value: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aktueller Wert</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.goal_metric.current_value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        goal_metric: { ...prev.goal_metric, current_value: parseFloat(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Timeframe */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Startdatum</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zieldatum</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check-In Frequenz</label>
                  <select
                    value={formData.check_in_frequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in_frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="monthly">Monatlich</option>
                  </select>
                </div>
              </div>

              {/* Milestones */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Milestones</h3>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Milestone hinzufügen
                  </button>
                </div>
                <div className="space-y-4">
                  {formData.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="z.B. Erste 5kg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zielwert</label>
                        <input
                          type="number"
                          step="0.01"
                          value={milestone.target_value}
                          onChange={(e) => updateMilestone(index, 'target_value', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Belohnung</label>
                        <input
                          type="text"
                          value={milestone.reward}
                          onChange={(e) => updateMilestone(index, 'reward', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="z.B. Neue Klamotten"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setView('overview');
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Ziel erstellen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Goal Detail View */}
        {view === 'detail' && selectedGoal && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView('overview')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-semibold text-gray-900">{selectedGoal.title}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateGoalStatus(selectedGoal.id, selectedGoal.status === 'active' ? 'paused' : 'active')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedGoal.status === 'active' 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {selectedGoal.status === 'active' ? 'Pausieren' : 'Aktivieren'}
                </button>
                <button
                  onClick={() => updateGoalStatus(selectedGoal.id, 'completed')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Abschließen
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Beschreibung</h3>
                  <p className="text-gray-600">{selectedGoal.description}</p>
                </div>

                {/* Progress Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Fortschritt</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedGoal.progress_percentage || 0}%</p>
                      <p className="text-sm text-gray-600">Fortschritt</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedGoal.start_date && selectedGoal.target_date ? 
                          Math.round(((new Date() - new Date(selectedGoal.start_date)) / (new Date(selectedGoal.target_date) - new Date(selectedGoal.start_date))) * 100) : 0}%
                      </p>
                      <p className="text-sm text-gray-600">Zeit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {Math.max(0, selectedGoal.target_date ? Math.ceil((new Date(selectedGoal.target_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0)}
                      </p>
                      <p className="text-sm text-gray-600">Tage übrig</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${selectedGoal.is_on_track ? 'text-green-600' : 'text-orange-600'}`}>
                        {selectedGoal.is_on_track ? 'On Track' : 'Off Track'}
                      </p>
                      <p className="text-sm text-gray-600">Status</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        (selectedGoal.progress_percentage || 0) >= 100 ? 'bg-green-500' : 
                        selectedGoal.is_on_track ? 'bg-blue-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(selectedGoal.progress_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    {selectedGoal.goal_metric?.current_value || 0} / {selectedGoal.goal_metric?.target_value || 0} {metricUnits[selectedGoal.category]?.find(u => u.value === selectedGoal.goal_metric?.unit)?.label || selectedGoal.goal_metric?.unit || 'units'}
                  </p>
                </div>

                {/* Check-In History */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Check-In Historie</h3>
                  <CheckInHistory goalId={selectedGoal.id} />
                </div>

                {/* Milestones */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Milestones</h3>
                  <div className="space-y-3">
                    {selectedGoal.milestones?.map((milestone, index) => (
                      <div
                        key={milestone.id || index}
                        className={`p-4 rounded-lg border ${
                          milestone.achieved 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {milestone.achieved ? (
                              <Trophy className="w-5 h-5 text-green-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                            )}
                            <div>
                              <p className={`font-medium ${milestone.achieved ? 'text-green-800' : 'text-gray-900'}`}>
                                {milestone.title}
                              </p>
                              <p className="text-sm text-gray-600">
                                Ziel: {milestone.target_value} {metricUnits[selectedGoal.category]?.find(u => u.value === selectedGoal.goal_metric?.unit)?.label || selectedGoal.goal_metric?.unit || 'units'}
                              </p>
                            </div>
                          </div>
                          {milestone.achieved && (
                            <span className="text-sm text-green-600 font-medium">Erreicht!</span>
                          )}
                        </div>
                        {milestone.reward && (
                          <p className="text-sm text-gray-600 mt-2">
                            Belohnung: {milestone.reward}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Schnellaktionen</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setCheckInData({ current_value: selectedGoal.goal_metric?.current_value || 0, notes: '' });
                        setShowCheckInModal(true);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      Check-In
                    </button>
                    <button
                      onClick={() => updateGoalStatus(selectedGoal.id, 'completed')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Abschließen
                    </button>
                  </div>
                </div>

                {/* Goal Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ziel-Info</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-600">Kategorie</p>
                      <p className="font-medium">{selectedGoal.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Startdatum</p>
                      <p className="font-medium">{selectedGoal.start_date ? new Date(selectedGoal.start_date).toLocaleDateString('de-DE') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Zieldatum</p>
                      <p className="font-medium">{selectedGoal.target_date ? new Date(selectedGoal.target_date).toLocaleDateString('de-DE') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Check-In Frequenz</p>
                      <p className="font-medium">{selectedGoal.check_in_frequency}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Check-In Modal */}
        {showCheckInModal && selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Check-In: {selectedGoal.title}</h3>
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); addCheckIn(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aktueller Wert ({metricUnits[selectedGoal.category]?.find(u => u.value === selectedGoal.goal_metric?.unit)?.label || selectedGoal.goal_metric?.unit || 'units'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={checkInData.current_value}
                    onChange={(e) => setCheckInData(prev => ({ ...prev, current_value: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notizen (optional)</label>
                  <textarea
                    value={checkInData.notes}
                    onChange={(e) => setCheckInData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Wie fühlst du dich? Was war heute anders?"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Check-In speichern
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Unit Selection Modal */}
        {showUnitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Einheit auswählen</h3>
                <button
                  onClick={() => setShowUnitModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {Object.entries(metricUnits).map(([category, units]) => (
                    <div key={category} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedCategories);
                          if (newExpanded.has(category)) {
                            newExpanded.delete(category);
                          } else {
                            newExpanded.add(category);
                          }
                          setExpandedCategories(newExpanded);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-xl">{categoryIcons[category] && React.createElement(categoryIcons[category], { className: "w-5 h-5" })}</div>
                          <span className="font-medium text-gray-900 capitalize">{category}</span>
                          <span className="text-sm text-gray-500">({units.length} Einheiten)</span>
                        </div>
                        <ChevronRight 
                          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                            expandedCategories.has(category) ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      
                      {expandedCategories.has(category) && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {units.map((unit) => (
                          <button
                            key={unit.value}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                goal_metric: { ...prev.goal_metric, unit: unit.value }
                              }));
                              setShowUnitModal(false);
                            }}
                            className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group text-left"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-xl">{unit.icon}</div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-800 group-hover:text-blue-700 text-sm">
                                  {unit.label}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {unit.description}
                                </p>
                              </div>
                            </div>
                          </button>
                                                 ))}
                       </div>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalTracker;
