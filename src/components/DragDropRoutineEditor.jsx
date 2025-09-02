import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Clock, 
  Plus, 
  X, 
  Check, 
  Edit3, 
  Trash2,
  GripVertical,
  Sun,
  Coffee,
  Moon,
  Sparkles,
  Dumbbell,
  Heart,
  BookOpen,
  Briefcase,
  Brain,
  Target,
  Calendar,
  Settings
} from 'lucide-react';
import { dailyRoutinesService } from '../lib/dailyRoutines';

const DragDropRoutineEditor = ({ routine, onSave, onClose }) => {
  const [habits, setHabits] = useState([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [routineName, setRoutineName] = useState(routine?.name || '');
  const [routineDescription, setRoutineDescription] = useState(routine?.description || '');
  const [weekdays, setWeekdays] = useState(routine?.weekdays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
  const [showCustomHabitModal, setShowCustomHabitModal] = useState(false);
  const [customHabit, setCustomHabit] = useState({
    name: '',
    description: '',
    category: 'productivity',
    time_block: 'morning',
    estimated_duration: 15,
    is_optional: false
  });

  const timeBlocks = {
    morning: { name: 'Vormittag', icon: Sun, color: 'orange', time: '07:00-09:00' },
    forenoon: { name: 'Vormittag', icon: Coffee, color: 'amber', time: '09:00-12:00' },
    noon: { name: 'Mittag', icon: Coffee, color: 'yellow', time: '12:00-14:00' },
    afternoon: { name: 'Nachmittag', icon: Coffee, color: 'blue', time: '14:00-18:00' },
    evening: { name: 'Abend', icon: Moon, color: 'purple', time: '18:00-22:00' }
  };

  const categories = {
    spirituality: { name: 'Spiritualität', icon: Sparkles, color: 'purple' },
    fitness: { name: 'Fitness', icon: Dumbbell, color: 'blue' },
    health: { name: 'Gesundheit', icon: Heart, color: 'green' },
    learning: { name: 'Lernen', icon: BookOpen, color: 'yellow' },
    productivity: { name: 'Produktivität', icon: Briefcase, color: 'indigo' },
    wellness: { name: 'Wellness', icon: Brain, color: 'pink' }
  };

  const weekdayLabels = {
    monday: 'Mo',
    tuesday: 'Di', 
    wednesday: 'Mi',
    thursday: 'Do',
    friday: 'Fr',
    saturday: 'Sa',
    sunday: 'So'
  };

  const weekdayNames = {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag'
  };

  useEffect(() => {
    console.log('DragDropRoutineEditor useEffect - routine:', routine);
    loadTemplates();
    
    if (routine) {
      console.log('Loading existing routine data:', {
        name: routine.name,
        description: routine.description,
        weekdays: routine.weekdays,
        habits: routine.routine_habits
      });
      
      // Setze die Routine-Daten
      setRoutineName(routine.name || '');
      setRoutineDescription(routine.description || '');
      setWeekdays(routine.weekdays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
      
      // Setze die Habits
      if (routine.routine_habits && routine.routine_habits.length > 0) {
        console.log('Setting existing habits:', routine.routine_habits);
        const sortedHabits = routine.routine_habits
          .sort((a, b) => (a.position_order || 0) - (b.position_order || 0))
          .map(habit => ({
            ...habit,
            estimated_duration: habit.estimated_duration || habit.duration_minutes || 15,
            is_optional: habit.is_optional || false,
            is_custom_habit: habit.is_custom_habit || false,
            custom_icon: habit.custom_icon || 'Target'
          }));
        setHabits(sortedHabits);
      } else {
        console.log('No existing habits found, starting with empty habits array');
        setHabits([]);
      }
    } else {
      console.log('No routine provided, starting fresh');
      setRoutineName('');
      setRoutineDescription('');
      setWeekdays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
      setHabits([]);
    }
  }, [routine]);

  const loadTemplates = async () => {
    try {
      const data = await dailyRoutinesService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
    }
  };

  const handleAddHabit = (template) => {
    const newHabit = {
      id: `temp-${Date.now()}`,
      name: template.name,
      description: template.description,
      category: template.category,
      time_block: template.time_block,
      estimated_duration: template.duration_minutes,
      position_order: habits.length,
      is_optional: false,
      is_custom_habit: false
    };
    setHabits([...habits, newHabit]);
  };

  const handleAddCustomHabit = () => {
    const newHabit = {
      id: `custom-${Date.now()}`,
      name: customHabit.name,
      description: customHabit.description,
      category: customHabit.category,
      time_block: customHabit.time_block,
      estimated_duration: customHabit.estimated_duration,
      position_order: habits.length,
      is_optional: customHabit.is_optional,
      is_custom_habit: true,
      custom_icon: 'Target'
    };
    setHabits([...habits, newHabit]);
    setShowCustomHabitModal(false);
    setCustomHabit({
      name: '',
      description: '',
      category: 'productivity',
      time_block: 'morning',
      estimated_duration: 15,
      is_optional: false
    });
  };

  const handleRemoveHabit = (habitId) => {
    setHabits(habits.filter(h => h.id !== habitId));
  };

  const handleUpdateHabit = (habitId, updates) => {
    setHabits(habits.map(h => 
      h.id === habitId ? { ...h, ...updates } : h
    ));
  };

  const handleReorder = async (newOrder) => {
    setHabits(newOrder);
    
    // Update position_order für alle Habits
    const updates = newOrder.map((habit, index) => ({
      ...habit,
      position_order: index
    }));
    setHabits(updates);
  };

  const handleMoveToTimeBlock = async (habitId, newTimeBlock) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Entferne das Habit aus der aktuellen Liste
    const filteredHabits = habits.filter(h => h.id !== habitId);
    
    // Füge es zum neuen Zeitblock hinzu
    const newHabit = { ...habit, time_block: newTimeBlock };
    const newHabits = [...filteredHabits, newHabit];
    
    setHabits(newHabits);
  };

  const handleWeekdayToggle = (weekday) => {
    if (weekdays.includes(weekday)) {
      setWeekdays(weekdays.filter(w => w !== weekday));
    } else {
      setWeekdays([...weekdays, weekday]);
    }
  };

  const handleSave = async () => {
    try {
      if (!routineName.trim()) {
        alert('Bitte gib einen Namen für die Routine ein.');
        return;
      }
      
      // Speichere die Routine mit den aktualisierten Habits
      const routineData = {
        name: routineName,
        description: routineDescription,
        weekdays: weekdays,
        habits: habits.map((habit, index) => ({
          ...habit,
          position_order: index
        }))
      };
      
      await onSave(routineData);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  const getHabitsByTimeBlock = (timeBlock) => {
    return habits.filter(habit => habit.time_block === timeBlock);
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const getWeekdayPresets = () => [
    {
      name: 'Alle Tage',
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      description: 'Routine läuft jeden Tag'
    },
    {
      name: 'Wochentage',
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      description: 'Nur Montag bis Freitag'
    },
    {
      name: 'Wochenende',
      weekdays: ['saturday', 'sunday'],
      description: 'Nur Samstag und Sonntag'
    },
    {
      name: 'Arbeitswoche',
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      description: 'Montag bis Freitag'
    }
  ];

  const applyWeekdayPreset = (preset) => {
    setWeekdays(preset.weekdays);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <input
                type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder="Routine-Name eingeben..."
                className="text-2xl font-bold bg-transparent border-none outline-none text-white placeholder-white/70"
              />
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
              >
                {showTemplates ? 'Templates verstecken' : 'Templates anzeigen'}
              </button>
            </div>
            <textarea
              value={routineDescription}
              onChange={(e) => setRoutineDescription(e.target.value)}
              placeholder="Beschreibung der Routine (optional)..."
              className="w-full bg-transparent border-none outline-none text-blue-100 placeholder-blue-200/70 resize-none"
              rows={1}
            />
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Speichern
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(90vh-120px)]">
        {/* Templates Sidebar */}
        {showTemplates && (
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Habits hinzufügen</h3>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Alle Kategorien</option>
                  {Object.entries(categories).map(([key, category]) => (
                    <option key={key} value={key}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {filteredTemplates.map((template) => {
                  const CategoryIcon = categories[template.category]?.icon;
                  const TimeIcon = timeBlocks[template.time_block]?.icon;
                  
                  return (
                    <motion.div
                      key={template.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => handleAddHabit(template)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        {CategoryIcon && <CategoryIcon className="w-4 h-4 text-gray-500" />}
                        {TimeIcon && <TimeIcon className="w-4 h-4 text-gray-500" />}
                        <span className="text-sm font-medium text-gray-900">{template.name}</span>
                      </div>
                      <p className="text-xs text-gray-500">{template.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{template.duration_minutes}min</span>
                        <span className="text-xs text-blue-600">Klicken zum Hinzufügen</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Eigenen Habit erstellen Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCustomHabitModal(true)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Eigenen Habit erstellen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Wochentag-Auswahl */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Wochentage für diese Routine</h3>
            
            {/* Wochentag-Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {getWeekdayPresets().map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyWeekdayPreset(preset)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    JSON.stringify(weekdays.sort()) === JSON.stringify(preset.weekdays.sort())
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Einzelne Wochentage */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(weekdayLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleWeekdayToggle(key)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    weekdays.includes(key)
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                  title={weekdayNames[key]}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              Aktive Tage: {weekdays.map(w => weekdayNames[w]).join(', ')}
            </p>
          </div>

          <div className="space-y-6">
            {Object.entries(timeBlocks).map(([timeKey, timeBlock]) => {
              const TimeIcon = timeBlock.icon;
              const timeBlockHabits = getHabitsByTimeBlock(timeKey);
              
              return (
                <div key={timeKey} className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-${timeBlock.color}-100 rounded-lg flex items-center justify-center`}>
                        <TimeIcon className={`w-5 h-5 text-${timeBlock.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{timeBlock.name}</h3>
                        <p className="text-sm text-gray-600">{timeBlock.time}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {timeBlockHabits.length} Habit{timeBlockHabits.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <Reorder.Group
                    axis="y"
                    values={timeBlockHabits}
                    onReorder={(newOrder) => {
                      const updatedHabits = habits.map(habit => {
                        if (habit.time_block === timeKey) {
                          const newIndex = newOrder.findIndex(h => h.id === habit.id);
                          return { ...habit, position_order: newIndex };
                        }
                        return habit;
                      });
                      setHabits(updatedHabits);
                    }}
                    className="space-y-3"
                  >
                    {timeBlockHabits.map((habit) => {
                      const CategoryIcon = categories[habit.category]?.icon;
                      
                      return (
                        <Reorder.Item
                          key={habit.id}
                          value={habit}
                          className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                        >
                          <div className="flex items-center space-x-3">
                            <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                            <div className="flex items-center space-x-2">
                              {habit.is_custom_habit ? (
                                <Target className="w-4 h-4 text-green-600" />
                              ) : (
                                CategoryIcon && <CategoryIcon className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="font-medium text-gray-900">{habit.name}</span>
                              {habit.is_custom_habit && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  Eigen
                                </span>
                              )}
                              {habit.is_optional && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                  Optional
                                </span>
                              )}
                            </div>
                            <div className="flex-1" />
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={habit.estimated_duration || 15}
                                onChange={(e) => handleUpdateHabit(habit.id, { 
                                  estimated_duration: parseInt(e.target.value) 
                                })}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                min="5"
                                max="180"
                              />
                              <span className="text-sm text-gray-500">min</span>
                              <select
                                value={habit.time_block}
                                onChange={(e) => handleMoveToTimeBlock(habit.id, e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                {Object.entries(timeBlocks).map(([key, block]) => (
                                  <option key={key} value={key}>{block.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleRemoveHabit(habit.id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {habit.description && (
                            <p className="text-sm text-gray-500 mt-2 ml-8">{habit.description}</p>
                          )}
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>

                  {timeBlockHabits.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="w-8 h-8 mx-auto mb-2" />
                      <p>Ziehe Habits hierher oder füge sie aus den Templates hinzu</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal für eigenen Habit */}
      {showCustomHabitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Eigenen Habit erstellen</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={customHabit.name}
                  onChange={(e) => setCustomHabit({...customHabit, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Meditation, Joggen..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={customHabit.description}
                  onChange={(e) => setCustomHabit({...customHabit, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Beschreibe deinen Habit..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={customHabit.category}
                    onChange={(e) => setCustomHabit({...customHabit, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(categories).map(([key, category]) => (
                      <option key={key} value={key}>{category.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zeitblock
                  </label>
                  <select
                    value={customHabit.time_block}
                    onChange={(e) => setCustomHabit({...customHabit, time_block: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(timeBlocks).map(([key, block]) => (
                      <option key={key} value={key}>{block.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dauer (Minuten)
                </label>
                <input
                  type="number"
                  value={customHabit.estimated_duration}
                  onChange={(e) => setCustomHabit({...customHabit, estimated_duration: parseInt(e.target.value) || 15})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="180"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_optional"
                  checked={customHabit.is_optional}
                  onChange={(e) => setCustomHabit({...customHabit, is_optional: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_optional" className="text-sm text-gray-700">
                  Als optional markieren
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCustomHabitModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddCustomHabit}
                disabled={!customHabit.name.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                Habit hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropRoutineEditor;
