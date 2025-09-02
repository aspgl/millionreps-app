import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Clock, 
  Calendar,
  Sun,
  Coffee,
  Moon,
  Sparkles,
  Dumbbell,
  Heart,
  BookOpen,
  Briefcase,
  Brain,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { dailyRoutinesService } from '../lib/dailyRoutines';

const RoutineCalendarView = ({ date, onAddEvent }) => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);

  const categories = {
    spirituality: { name: 'Spiritualität', icon: Sparkles, color: 'purple' },
    fitness: { name: 'Fitness', icon: Dumbbell, color: 'blue' },
    health: { name: 'Gesundheit', icon: Heart, color: 'green' },
    learning: { name: 'Lernen', icon: BookOpen, color: 'yellow' },
    productivity: { name: 'Produktivität', icon: Briefcase, color: 'indigo' },
    wellness: { name: 'Wellness', icon: Brain, color: 'pink' }
  };

  const timeBlocks = {
    morning: { name: 'Vormittag', icon: Sun, color: 'orange', time: '07:00-09:00' },
    forenoon: { name: 'Vormittag', icon: Coffee, color: 'amber', time: '09:00-12:00' },
    noon: { name: 'Mittag', icon: Coffee, color: 'yellow', time: '12:00-14:00' },
    afternoon: { name: 'Nachmittag', icon: Coffee, color: 'blue', time: '14:00-18:00' },
    evening: { name: 'Abend', icon: Moon, color: 'purple', time: '18:00-22:00' }
  };

  useEffect(() => {
    if (date) {
      loadDailyData();
    }
  }, [date]);

  const loadDailyData = async () => {
    try {
      setLoading(true);
      console.log('Loading daily data for date:', date.toISOString().split('T')[0]);
      
      const [routinesData, eventsData] = await Promise.all([
        dailyRoutinesService.getRoutines(),
        dailyRoutinesService.getRoutineCalendarEvents(date)
      ]);
      
      const activeRoutines = routinesData.filter(r => r.is_active);
      console.log('Active routines:', activeRoutines.length);
      activeRoutines.forEach(routine => {
        console.log(`Routine "${routine.name}" has ${routine.routine_habits?.length || 0} habits`);
      });
      
      console.log('Calendar events:', eventsData.length);
      
      setRoutines(activeRoutines);
      setCalendarEvents(eventsData);
    } catch (error) {
      console.error('Fehler beim Laden der Tagesdaten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Erstelle Kalender-Events aus Routinen, falls keine existieren
  const getEventsFromRoutines = () => {
    // Wenn echte Kalender-Events existieren, verwende diese
    if (calendarEvents.length > 0) {
      console.log('Using real calendar events:', calendarEvents.length);
      // Stelle sicher, dass is_completed korrekt gesetzt ist
      return calendarEvents.map(event => ({
        ...event,
        is_completed: event.is_completed || false
      }));
    }
    
    // Ansonsten erstelle temporäre Events aus den Routinen
    const events = [];
    const processedHabitIds = new Set(); // Verhindert Duplikate
    
    routines.forEach(routine => {
      routine.routine_habits?.forEach(habit => {
        // Verhindere Duplikate basierend auf habit.id
        if (processedHabitIds.has(habit.id)) {
          console.log('Skipping duplicate habit:', habit.id, habit.name);
          return;
        }
        
        processedHabitIds.add(habit.id);
        
        const startTime = getDefaultStartTime(habit.time_block);
        const endTime = addMinutesToTime(startTime, habit.estimated_duration || 15);
        
        events.push({
          id: `temp-${habit.id}`,
          routine_habits: habit,
          start_time: startTime,
          end_time: endTime,
          is_completed: false
        });
      });
    });
    
    console.log('Using fallback events from routines:', events.length);
    return events;
  };

  const getDefaultStartTime = (timeBlock) => {
    const times = {
      morning: '07:00',
      forenoon: '09:00',
      noon: '12:00',
      afternoon: '15:00',
      evening: '19:00'
    };
    return times[timeBlock] || '09:00';
  };

  const addMinutesToTime = (time, minutes) => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  const handleToggleHabit = async (eventId, isCompleted) => {
    try {
      console.log('Toggling habit:', eventId, 'from completed:', isCompleted, 'to:', !isCompleted);
      
      // Wenn es ein temporäres Event ist, erstelle ein echtes Kalender-Event
      if (eventId.startsWith('temp-')) {
        const habitId = eventId.replace('temp-', '');
        const habit = routines.flatMap(r => r.routine_habits || []).find(h => h.id === habitId);
        
        if (habit) {
          console.log('Creating real calendar event for temp habit:', habitId);
          await dailyRoutinesService.completeHabit({
            user_id: user.id,
            habit_id: habitId
          });
        }
      } else {
        // Verwende die neue toggleCalendarEvent Funktion
        console.log('Toggling real calendar event:', eventId);
        await dailyRoutinesService.toggleCalendarEvent(eventId, !isCompleted);
      }
      
      console.log('Habit toggled successfully, reloading data...');
      await loadDailyData();
    } catch (error) {
      console.error('Fehler beim Umschalten des Habits:', error);
      alert('Fehler beim Umschalten des Habits: ' + error.message);
    }
  };

  const handleAddCustomEvent = async (eventData) => {
    try {
      await dailyRoutinesService.createCalendarEvent({
        user_id: user.id,
        event_date: date.toISOString().split('T')[0],
        ...eventData
      });
      await loadDailyData();
      setShowAddEvent(false);
    } catch (error) {
      console.error('Fehler beim Erstellen des Events:', error);
    }
  };

  const getEventsByTimeBlock = (timeBlock) => {
    const allEvents = getEventsFromRoutines();
    const timeBlockEvents = allEvents.filter(event => {
      const habit = event.routine_habits;
      return habit && habit.time_block === timeBlock;
    });
    
    // Entferne Duplikate basierend auf habit.id
    const uniqueEvents = [];
    const seenHabitIds = new Set();
    
    timeBlockEvents.forEach(event => {
      const habitId = event.routine_habits?.id;
      if (habitId && !seenHabitIds.has(habitId)) {
        seenHabitIds.add(habitId);
        uniqueEvents.push(event);
      } else if (!habitId) {
        // Events ohne habit (custom events) immer hinzufügen
        uniqueEvents.push(event);
      }
    });
    
    console.log(`Time block ${timeBlock}: ${timeBlockEvents.length} total, ${uniqueEvents.length} unique`);
    
    return uniqueEvents.sort((a, b) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const calculateDailyProgress = () => {
    const allEvents = getEventsFromRoutines();
    
    // Entferne Duplikate für die Progress-Berechnung
    const uniqueEvents = [];
    const seenHabitIds = new Set();
    
    allEvents.forEach(event => {
      const habitId = event.routine_habits?.id;
      if (habitId && !seenHabitIds.has(habitId)) {
        seenHabitIds.add(habitId);
        uniqueEvents.push(event);
      } else if (!habitId) {
        // Events ohne habit (custom events) immer hinzufügen
        uniqueEvents.push(event);
      }
    });
    
    const totalEvents = uniqueEvents.length;
    const completedEvents = uniqueEvents.filter(event => event.is_completed).length;
    
    console.log(`Progress calculation: ${totalEvents} total unique events, ${completedEvents} completed`);
    
    return {
      total: totalEvents,
      completed: completedEvents,
      percentage: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0
    };
  };

  const progress = calculateDailyProgress();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Tagesplan</h3>
              <p className="text-sm text-gray-600">
                {date.toLocaleDateString('de-DE', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Termin hinzufügen</span>
            </button>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {progress.completed}/{progress.total}
              </div>
              <div className="text-sm text-gray-600 font-medium">Erledigt</div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/50 rounded-full h-4 shadow-inner">
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full shadow-lg"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        
        <div className="mt-3 text-sm text-gray-700 font-medium">
          {progress.percentage}% des Tagesplans erledigt
        </div>
      </div>

      {/* Time Blocks mit Events */}
      <div className="space-y-6">
        {Object.entries(timeBlocks).map(([timeKey, timeBlock]) => {
          const TimeIcon = timeBlock.icon;
          const timeBlockEvents = getEventsByTimeBlock(timeKey);
          
          if (timeBlockEvents.length === 0) return null;

          return (
            <div key={timeKey} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition-all">
              <div className={`bg-gradient-to-r from-${timeBlock.color}-50 to-${timeBlock.color}-100 px-6 py-5 border-b border-${timeBlock.color}-200`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 bg-gradient-to-r from-${timeBlock.color}-500 to-${timeBlock.color}-600 rounded-xl flex items-center justify-center shadow-lg`}>
                      <TimeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{timeBlock.name}</h4>
                      <p className="text-sm text-gray-600 font-medium">{timeBlock.time}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium bg-white/70 px-3 py-1 rounded-full">
                    {timeBlockEvents.length} Event{timeBlockEvents.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {timeBlockEvents.map((event) => {
                    const habit = event.routine_habits;
                    const CategoryIcon = categories[habit?.category]?.icon;
                    const isCompleted = event.is_completed;
                    
                    return (
                      <motion.div
                        key={event.id}
                        className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all cursor-pointer ${
                          isCompleted 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg' 
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
                        }`}
                        onClick={() => handleToggleHabit(event.id, isCompleted)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-gray-100 to-gray-200'
                          }`}>
                            {CategoryIcon && (
                              <CategoryIcon className={`w-6 h-6 ${
                                isCompleted ? 'text-white' : 'text-gray-600'
                              }`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`text-lg font-semibold ${
                              isCompleted 
                                ? 'text-green-800 line-through' 
                                : 'text-gray-900'
                            }`}>
                              {habit?.name || event.title || 'Unbekanntes Event'}
                            </div>
                            {habit?.description && (
                              <div className={`text-sm mt-1 ${
                                isCompleted ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {habit.description}
                              </div>
                            )}
                            {event.start_time && event.end_time && (
                              <div className="text-xs text-gray-400 mt-2 font-medium">
                                ⏰ {event.start_time} - {event.end_time}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {habit?.estimated_duration && (
                            <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                              {habit.estimated_duration}min
                            </div>
                          )}
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 shadow-lg' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}>
                            {isCompleted && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Events */}
      {getEventsFromRoutines().filter(e => !e.routine_habits).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Zusätzliche Termine</h4>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {getEventsFromRoutines().filter(e => !e.routine_habits).map((event) => (
                <motion.div
                  key={event.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    event.is_completed 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => handleToggleHabit(event.id, event.is_completed)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className={`w-5 h-5 ${
                      event.is_completed ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                    <div>
                      <div className={`font-medium ${
                        event.is_completed ? 'text-blue-800 line-through' : 'text-gray-900'
                      }`}>
                        {event.title || 'Termin'}
                      </div>
                      {event.notes && (
                        <div className={`text-sm ${
                          event.is_completed ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {event.notes}
                        </div>
                      )}
                      {event.start_time && event.end_time && (
                        <div className="text-xs text-gray-400 mt-1">
                          {event.start_time} - {event.end_time}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    event.is_completed 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {event.is_completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <AddEventModal
          onSave={handleAddCustomEvent}
          onClose={() => setShowAddEvent(false)}
        />
      )}
    </div>
  );
};

// Add Event Modal Component
const AddEventModal = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    start_time: '09:00',
    end_time: '10:00'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Termin hinzufügen</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ende</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoutineCalendarView;
