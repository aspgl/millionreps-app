import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Plus, 
  X, 
  Check, 
  Edit3, 
  Trash2, 
  Play, 
  Pause,
  BarChart3,
  Calendar,
  Target,
  Zap,
  Heart,
  Brain,
  Dumbbell,
  BookOpen,
  Briefcase,
  Sparkles,
  Sun,
  Moon,
  Coffee
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { dailyRoutinesService } from '../lib/dailyRoutines';
import DragDropRoutineEditor from './DragDropRoutineEditor';

const DailyRoutines = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [showDragDropEditor, setShowDragDropEditor] = useState(false);

  const categories = {
    spirituality: { name: 'Spiritualität', icon: Sparkles, color: 'purple' },
    fitness: { name: 'Fitness', icon: Dumbbell, color: 'blue' },
    health: { name: 'Gesundheit', icon: Heart, color: 'green' },
    learning: { name: 'Lernen', icon: BookOpen, color: 'yellow' },
    productivity: { name: 'Produktivität', icon: Briefcase, color: 'indigo' },
    wellness: { name: 'Wellness', icon: Brain, color: 'pink' }
  };

  const timeBlocks = {
    morning: { name: 'Vormittag', icon: Sun, color: 'orange' },
    forenoon: { name: 'Vormittag', icon: Coffee, color: 'amber' },
    noon: { name: 'Mittag', icon: Coffee, color: 'yellow' },
    afternoon: { name: 'Nachmittag', icon: Coffee, color: 'blue' },
    evening: { name: 'Abend', icon: Moon, color: 'purple' }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routinesData, templatesData] = await Promise.all([
        dailyRoutinesService.getRoutines(),
        dailyRoutinesService.getTemplates()
      ]);
      setRoutines(routinesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Fehler beim Laden der Routinen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutine = async (routineData) => {
    try {
      console.log('=== ROUTINE ERSTELLEN START ===');
      console.log('Routine data received:', routineData);
      console.log('User ID:', user.id);
      
      // Validiere die Daten
      if (!routineData.name || !routineData.name.trim()) {
        alert('Bitte gib einen Namen für die Routine ein.');
        return;
      }
      
      if (!routineData.habits || routineData.habits.length === 0) {
        alert('Bitte füge mindestens einen Habit hinzu.');
        return;
      }

      console.log('Validation passed, creating routine...');

      // Erstelle zuerst die Routine
      const newRoutine = await dailyRoutinesService.createRoutine({
        name: routineData.name.trim(),
        description: routineData.description?.trim() || '',
        user_id: user.id,
        weekdays: routineData.weekdays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      });

      console.log('✅ Routine created successfully:', newRoutine);

      // Dann erstelle alle Habits für diese Routine
      if (routineData.habits && routineData.habits.length > 0) {
        console.log(`Creating ${routineData.habits.length} habits...`);
        
        const habitPromises = routineData.habits.map((habit, index) => {
          console.log(`Creating habit ${index + 1}:`, habit);
          return dailyRoutinesService.createHabit({
            routine_id: newRoutine.id,
            name: habit.name,
            description: habit.description || '',
            category: habit.category || 'productivity',
            time_block: habit.time_block || 'morning',
            estimated_duration: habit.estimated_duration || 15,
            position_order: index,
            is_optional: habit.is_optional || false,
            is_custom_habit: habit.is_custom_habit || false,
            custom_icon: habit.custom_icon || 'Target'
          });
        });
        
        const createdHabits = await Promise.all(habitPromises);
        console.log('✅ All habits created successfully:', createdHabits);
      }

      console.log('Reloading data...');
      
      // Lade die Routinen neu, um die neuen Habits zu laden
      await loadData();
      
      console.log('✅ Data reloaded successfully');
      
      // Schließe den Editor
      setShowDragDropEditor(false);
      
      // Zeige Erfolgsmeldung
      alert('Routine erfolgreich erstellt!');
      
      console.log('=== ROUTINE ERSTELLEN ERFOLGREICH ===');
      
    } catch (error) {
      console.error('❌ FEHLER beim Erstellen der Routine:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert('Fehler beim Erstellen der Routine: ' + error.message);
    }
  };

  const handleEditRoutine = async (routineData) => {
    try {
      console.log('=== ROUTINE BEARBEITEN START ===');
      console.log('Editing routine with data:', routineData);
      console.log('Current editingRoutine:', editingRoutine);
      
      if (!editingRoutine) {
        alert('Keine Routine zum Bearbeiten ausgewählt.');
        return;
      }

      // Validiere die Daten
      if (!routineData.name || !routineData.name.trim()) {
        alert('Bitte gib einen Namen für die Routine ein.');
        return;
      }
      
      if (!routineData.habits || routineData.habits.length === 0) {
        alert('Bitte füge mindestens einen Habit hinzu.');
        return;
      }

      console.log('Validation passed, updating routine...');

      // Aktualisiere die Routine
      await dailyRoutinesService.updateRoutine(editingRoutine.id, {
        name: routineData.name.trim(),
        description: routineData.description?.trim() || '',
        weekdays: routineData.weekdays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      });

      console.log('✅ Routine updated successfully');

      // Lösche alle bestehenden Habits
      if (editingRoutine.routine_habits && editingRoutine.routine_habits.length > 0) {
        console.log('Deleting existing habits:', editingRoutine.routine_habits.length);
        const deletePromises = editingRoutine.routine_habits.map(habit => 
          dailyRoutinesService.deleteHabit(habit.id)
        );
        await Promise.all(deletePromises);
        console.log('✅ Existing habits deleted successfully');
      }

      // Erstelle alle neuen Habits
      if (routineData.habits && routineData.habits.length > 0) {
        console.log('Creating new habits:', routineData.habits.length);
        const habitPromises = routineData.habits.map((habit, index) => {
          console.log(`Creating habit ${index + 1}:`, habit);
          return dailyRoutinesService.createHabit({
            routine_id: editingRoutine.id,
            name: habit.name,
            description: habit.description || '',
            category: habit.category || 'productivity',
            time_block: habit.time_block || 'morning',
            estimated_duration: habit.estimated_duration || 15,
            position_order: index,
            is_optional: habit.is_optional || false,
            is_custom_habit: habit.is_custom_habit || false,
            custom_icon: habit.custom_icon || 'Target'
          });
        });
        
        const createdHabits = await Promise.all(habitPromises);
        console.log('✅ New habits created successfully:', createdHabits);
      }

      console.log('Reloading data...');
      
      // Lade die Routinen neu
      await loadData();
      
      console.log('✅ Data reloaded successfully');
      
      // Schließe den Editor
      setEditingRoutine(null);
      
      // Zeige Erfolgsmeldung
      alert('Routine erfolgreich aktualisiert!');
      
      console.log('=== ROUTINE BEARBEITEN ERFOLGREICH ===');
      
    } catch (error) {
      console.error('❌ FEHLER beim Bearbeiten der Routine:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert('Fehler beim Bearbeiten der Routine: ' + error.message);
    }
  };

  const handleToggleRoutine = async (routineId, isActive) => {
    try {
      console.log('Toggle Routine:', routineId, 'Current state:', isActive, 'New state:', !isActive);
      
      // Explizit Boolean-Wert setzen
      const newActiveState = isActive === true ? false : true;
      
      await dailyRoutinesService.updateRoutine(routineId, { is_active: newActiveState });
      
      // Update local state
      setRoutines(routines.map(r => 
        r.id === routineId ? { ...r, is_active: newActiveState } : r
      ));
      
      // Wenn Routine aktiviert wird, erstelle Kalender-Events
      if (!isActive) {
        console.log('Creating calendar events for routine:', routineId);
        await dailyRoutinesService.createCalendarEventsForRoutine(routineId);
      }
      
      console.log('Routine toggle successful');
    } catch (error) {
      console.error('Fehler beim Aktivieren/Deaktivieren:', error);
      alert('Fehler beim Aktivieren/Deaktivieren der Routine: ' + error.message);
    }
  };

  const handleDeleteRoutine = async (routineId) => {
    if (window.confirm('Möchtest du diese Routine wirklich löschen?')) {
      try {
        await dailyRoutinesService.deleteRoutine(routineId);
        setRoutines(routines.filter(r => r.id !== routineId));
      } catch (error) {
        console.error('Fehler beim Löschen der Routine:', error);
      }
    }
  };

  const calculateRoutineStats = (routine) => {
    if (!routine.routine_habits) return { total: 0, completed: 0, percentage: 0 };
    
    const total = routine.routine_habits.length;
    const completed = routine.routine_habits.filter(habit => 
      habit.habit_completions && habit.habit_completions.length > 0
    ).length;
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  const getCategoryStats = () => {
    const stats = {};
    Object.keys(categories).forEach(category => {
      const categoryHabits = templates.filter(t => t.category === category);
      const userHabits = routines.flatMap(r => 
        r.routine_habits?.filter(h => h.category === category) || []
      );
      
      stats[category] = {
        recommended: categoryHabits.length,
        added: userHabits.length,
        percentage: categoryHabits.length > 0 
          ? Math.round((userHabits.length / categoryHabits.length) * 100)
          : 0
      };
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Tagesroutinen</h2>
                  <p className="text-blue-100">Organisiere deine täglichen Gewohnheiten</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar */}
            <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Statistiken */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                    Übersicht
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Aktive Routinen</span>
                      <span className="font-semibold text-gray-900">
                        {routines.filter(r => r.is_active).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Gesamt Habits</span>
                      <span className="font-semibold text-gray-900">
                        {routines.reduce((sum, r) => sum + (r.routine_habits?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Heute erfüllt</span>
                      <span className="font-semibold text-green-600">
                        {routines.reduce((sum, r) => {
                          const stats = calculateRoutineStats(r);
                          return sum + stats.completed;
                        }, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kategorie-Statistiken */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Kategorien</h3>
                  <div className="space-y-2">
                    {Object.entries(categories).map(([key, category]) => {
                      const stats = categoryStats[key];
                      const Icon = category.icon;
                      return (
                        <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                          <div className="flex items-center space-x-2">
                            <Icon className={`w-4 h-4 text-${category.color}-600`} />
                            <span className="text-sm text-gray-700">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              {stats.added}/{stats.recommended}
                            </div>
                            <div className="text-xs font-medium text-gray-900">
                              {stats.percentage}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Lade Routinen...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header Actions */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">Deine Routinen</h3>
                    <button
                      onClick={() => setShowDragDropEditor(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Neue Routine erstellen</span>
                    </button>
                  </div>

                  {/* Routinen Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routines.map((routine) => {
                      const stats = calculateRoutineStats(routine);
                      return (
                        <div key={routine.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-900">{routine.name}</h4>
                                {routine.description && (
                                  <p className="text-sm text-gray-500 mt-1">{routine.description}</p>
                                )}
                                
                                {/* Wochentag-Anzeige */}
                                <div className="flex items-center gap-1 mt-2">
                                  {routine.weekdays && routine.weekdays.length > 0 && (
                                    <>
                                      <Calendar className="w-3 h-3 text-gray-400" />
                                      <div className="flex gap-1">
                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                          <div
                                            key={day}
                                            className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${
                                              routine.weekdays.includes(day)
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-400'
                                            }`}
                                            title={day === 'monday' ? 'Mo' : day === 'tuesday' ? 'Di' : day === 'wednesday' ? 'Mi' : day === 'thursday' ? 'Do' : day === 'friday' ? 'Fr' : day === 'saturday' ? 'Sa' : 'So'}
                                          >
                                            {day === 'monday' ? 'M' : day === 'tuesday' ? 'D' : day === 'wednesday' ? 'M' : day === 'thursday' ? 'D' : day === 'friday' ? 'F' : day === 'saturday' ? 'S' : 'S'}
                                          </div>
                                        ))}
                                      </div>
                                      {routine.is_weekend_routine && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full ml-2">
                                          Wochenende
                                        </span>
                                      )}
                                      {routine.is_weekday_routine && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full ml-2">
                                          Wochentage
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleToggleRoutine(routine.id, routine.is_active)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    routine.is_active 
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                  title={routine.is_active ? 'Routine deaktivieren' : 'Routine aktivieren'}
                                >
                                  {routine.is_active ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => setEditingRoutine(routine)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRoutine(routine.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Fortschritt</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {stats.completed}/{stats.total}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${stats.percentage}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Habits Preview */}
                            <div className="space-y-2">
                              {routine.routine_habits?.slice(0, 3).map((habit) => {
                                const CategoryIcon = categories[habit.category]?.icon;
                                const TimeIcon = timeBlocks[habit.time_block]?.icon;
                                const isCompleted = habit.habit_completions && habit.habit_completions.length > 0;
                                
                                return (
                                  <div key={habit.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                                    <div className={`w-2 h-2 rounded-full ${
                                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                    }`}></div>
                                    <div className="flex items-center space-x-1">
                                      {CategoryIcon && <CategoryIcon className="w-3 h-3 text-gray-400" />}
                                      {TimeIcon && <TimeIcon className="w-3 h-3 text-gray-400" />}
                                    </div>
                                    <span className="text-sm text-gray-700 flex-1 truncate">
                                      {habit.name}
                                      {habit.is_custom_habit && (
                                        <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                          Eigen
                                        </span>
                                      )}
                                      {habit.is_optional && (
                                        <span className="ml-1 px-1 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                          Optional
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {habit.estimated_duration || habit.duration_minutes || 15}min
                                    </span>
                                  </div>
                                );
                              })}
                              {routine.routine_habits?.length > 3 && (
                                <div className="text-center">
                                  <span className="text-xs text-gray-500">
                                    +{routine.routine_habits.length - 3} weitere
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {routines.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Routinen vorhanden</h3>
                      <p className="text-gray-500 mb-6">
                        Erstelle deine erste Tagesroutine und organisiere deine Gewohnheiten.
                      </p>
                      <button
                        onClick={() => setShowDragDropEditor(true)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Erste Routine erstellen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Drag & Drop Editor Modal */}
        <AnimatePresence>
          {(showDragDropEditor || editingRoutine) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <DragDropRoutineEditor
                routine={editingRoutine || null}
                onSave={editingRoutine ? handleEditRoutine : handleCreateRoutine}
                onClose={() => {
                  console.log('Closing editor, editingRoutine:', editingRoutine);
                  setShowDragDropEditor(false);
                  setEditingRoutine(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};



export default DailyRoutines;
