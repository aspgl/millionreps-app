import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Tag,
  MoreHorizontal,
  Edit,
  Trash2,
  Share2,
  Bell,
  Star,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  Brain,
  BookOpen,
  Briefcase,
  Heart,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Grid3X3,
  List,
  Settings,
  Download,
  Upload,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { CalendarService } from './lib/calendarService';
import { DeepWorkService } from './lib/deepworkService';
import DeepWorkEventDetails from './components/DeepWorkEventDetails';
import DailyRoutineView from './components/DailyRoutineView';

const Kalender = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day, agenda
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    category: 'work',
    priority: 'medium',
    location: '',
    attendees: '',
    tags: ''
  });
  const [filters, setFilters] = useState({
    work: true,
    personal: true,
    health: true,
    learning: true,
    finance: true,
    deepwork: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deepworkStats, setDeepworkStats] = useState({
    totalSessions: 0,
    totalDuration: 0,
    averageFocusScore: 0,
    totalTasksCompleted: 0,
    totalTasksPlanned: 0
  });



  // Load events when view or date changes
  useEffect(() => {
    const loadEventsForView = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let eventsData = [];
        
        // Try to load calendar events from database
        try {
          console.log('Loading calendar events from database...');
          eventsData = await CalendarService.getEvents(user.id);
          console.log('Calendar events loaded from database:', eventsData.length);
        } catch (dbError) {
          console.error('Database error loading events, trying localStorage:', dbError);
          
          // Fallback: Load from localStorage
          const localEvents = JSON.parse(localStorage.getItem('calendar_events') || '[]');
          eventsData = localEvents.filter(event => event.user_id === user.id);
          console.log('Calendar events loaded from localStorage:', eventsData.length);
        }
        
        // Load deep work sessions for the same date range
        console.log('Loading deep work sessions for view:', view);
        let deepworkSessions = [];
        
        try {
          switch (view) {
            case 'month':
              const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
              deepworkSessions = await DeepWorkService.getSessionsForDateRange(user.id, monthStart, monthEnd);
              break;
            case 'week':
              const weekStartDate = getWeekStart(currentDate);
              const weekEndDate = new Date(weekStartDate);
              weekEndDate.setDate(weekStartDate.getDate() + 6);
              deepworkSessions = await DeepWorkService.getSessionsForDateRange(user.id, weekStartDate, weekEndDate);
              break;
            case 'day':
              const dayStart = new Date(currentDate);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(currentDate);
              dayEnd.setHours(23, 59, 59, 999);
              deepworkSessions = await DeepWorkService.getSessionsForDateRange(user.id, dayStart, dayEnd);
              break;
            default:
              deepworkSessions = await DeepWorkService.getUserSessions(user.id);
          }
          
          console.log('Deep work sessions loaded for view:', deepworkSessions?.length || 0);
          
          // Additional client-side filtering to ensure no demo sessions
          deepworkSessions = deepworkSessions.filter(session => {
            const isDemo = 
              session.title?.includes('Demo') ||
              session.title?.includes('Test') ||
              session.title?.startsWith('Deep Work Session -') ||
              session.description?.includes('Demo') ||
              session.description?.includes('Test') ||
              session.description?.includes('Intensive') ||
              session.description?.includes('Studium') ||
              session.description?.includes('Strategische') ||
              (session.tags && session.tags.includes('demo')) ||
              (session.tags && session.tags.includes('test'));
            
            if (isDemo) {
              console.log('Filtering out demo session in calendar:', session.title);
            }
            
            return !isDemo;
          });
          
          console.log('Deep work sessions after filtering:', deepworkSessions?.length || 0);
        } catch (error) {
          console.error('Error loading deep work sessions:', error);
          deepworkSessions = [];
        }
        
        console.log('Deep work sessions for view:', deepworkSessions?.length || 0);
        const deepworkEvents = DeepWorkService.convertSessionsToEvents(deepworkSessions);
        console.log('Deep work events for view:', deepworkEvents?.length || 0);
        
        // Combine all events
        const allEvents = [...eventsData, ...deepworkEvents];
        console.log('Total events for view:', allEvents?.length || 0);
        console.log('Calendar events:', eventsData.map(e => ({ title: e.title, category: e.category, start: e.start })));
        console.log('Deep work events:', deepworkEvents.map(e => ({ title: e.title, category: e.category, start: e.start })));
        
        // Debug: Check if events have correct structure
        allEvents.forEach((event, index) => {
          console.log(`Event ${index}:`, {
            id: event.id,
            title: event.title,
            category: event.category,
            start: event.start,
            startType: typeof event.start,
            startString: event.start?.toString(),
            end: event.end,
            endType: typeof event.end,
            endString: event.end?.toString(),
            isValidStart: event.start instanceof Date && !isNaN(event.start.getTime()),
            isValidEnd: event.end instanceof Date && !isNaN(event.end.getTime())
          });
        });
        
        setEvents(allEvents);
        
        // Update deep work stats for current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const stats = await DeepWorkService.getSessionStats(user.id, startOfMonth, endOfMonth);
        setDeepworkStats(stats);
        
      } catch (error) {
        console.error('Error loading events for view:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadEventsForView();
    }
  }, [user, view, currentDate]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add previous month's days
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push({ date: currentDate, isCurrentMonth: true });
    }
    
    // Add next month's days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    console.log('Getting events for date:', date.toDateString());
    console.log('Filtered events available:', filteredEvents.length);
    console.log('Available events:', filteredEvents.map(e => ({ title: e.title, start: e.start, category: e.category })));
    
    const eventsForDate = filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      const matches = eventDate.toDateString() === date.toDateString();
      if (matches) {
        console.log('Event matches date:', event.title, 'date:', eventDate.toDateString(), 'target:', date.toDateString());
      }
      return matches;
    });
    
    console.log('Events for date', date.toDateString(), ':', eventsForDate.length, eventsForDate.map(e => e.title));
    return eventsForDate;
  };

  const getEventsForWeek = (startDate) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    console.log('Getting events for week:', {
      startDate: startDate.toDateString(),
      endDate: endDate.toDateString(),
      totalEvents: filteredEvents.length
    });
    
    const weekEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      const isInWeek = eventDate >= startDate && eventDate <= endDate;
      
      if (isInWeek) {
        console.log('Week event found:', event.title, 'date:', eventDate.toDateString(), 'time:', eventDate.toLocaleTimeString());
      }
      
      return isInWeek;
    });
    
    // Validate and fix event times
    const validatedEvents = weekEvents.map(event => {
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);
      
      // Ensure end time is after start time
      if (endTime <= startTime) {
        console.warn('Invalid event time, fixing:', event.title, 'start:', startTime, 'end:', endTime);
        endTime.setTime(startTime.getTime() + (60 * 60 * 1000)); // Add 1 hour
      }
      
      return {
        ...event,
        start: startTime,
        end: endTime
      };
    });
    
    console.log('Week events found:', validatedEvents.length, validatedEvents.map(e => ({ 
      title: e.title, 
      start: e.start.toLocaleTimeString(),
      end: e.end.toLocaleTimeString()
    })));
    return validatedEvents;
  };

  const getEventsForDay = (date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  };

  const getWeekDays = (startDate) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      work: 'Briefcase',
      health: 'Heart',
      learning: 'BookOpen',
      finance: 'DollarSign',
      personal: 'Star',
      deepwork: 'Brain'
    };
    return icons[category] || 'Calendar';
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      'Brain': Brain,
      'Heart': Heart,
      'BookOpen': BookOpen,
      'Users': Users,
      'DollarSign': DollarSign,
      'Briefcase': Briefcase,
      'Star': Star,
      'Calendar': Calendar
    };
    return iconMap[iconName] || Calendar;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const formatTime = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date passed to formatTime:', date);
      return '00:00';
    }
    
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const navigateWeek = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * 7));
      return newDate;
    });
  };

  const navigateDay = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + direction);
      return newDate;
    });
  };

  const navigateView = (direction) => {
    console.log('Navigating view:', view, 'direction:', direction);
    
    switch (view) {
      case 'month':
        console.log('Navigating month by', direction, 'months');
        navigateMonth(direction);
        break;
      case 'week':
        console.log('Navigating week by', direction * 7, 'days');
        navigateWeek(direction);
        break;
      case 'day':
        console.log('Navigating day by', direction, 'days');
        navigateDay(direction);
        break;
      case 'agenda':
        console.log('Navigating agenda by', direction, 'days');
        navigateDay(direction);
        break;
      default:
        console.log('Default navigation: month by', direction, 'months');
        navigateMonth(direction);
    }
  };

  const openEventModal = (date = null, event = null) => {
    if (event) {
      // Edit existing event
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        description: event.description,
        start: event.start.toISOString().slice(0, 16),
        end: event.end.toISOString().slice(0, 16),
        category: event.category,
        priority: event.priority,
        location: event.location || '',
        attendees: event.attendees.join(', '),
        tags: event.tags.join(', ')
      });
    } else {
      // Create new event
      setEditingEvent(null);
      const defaultDate = date || selectedDate || new Date();
      setEventForm({
        title: '',
        description: '',
        start: defaultDate.toISOString().slice(0, 16),
        end: new Date(defaultDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
        category: 'work',
        priority: 'medium',
        location: '',
        attendees: '',
        tags: ''
      });
    }
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !user) return;

    try {
      const eventData = {
        user_id: user.id, // Changed from userId to user_id
        title: eventForm.title,
        description: eventForm.description,
        start: new Date(eventForm.start),
        end: new Date(eventForm.end),
        category: eventForm.category,
        priority: eventForm.priority,
        location: eventForm.location,
        attendees: eventForm.attendees.split(',').map(a => a.trim()).filter(a => a),
        tags: eventForm.tags.split(',').map(t => t.trim()).filter(t => t),
        color: getCategoryColor(eventForm.category),
        icon: getCategoryIcon(eventForm.category)
      };

      console.log('Saving event data:', eventData);

      let savedEvent;
      if (editingEvent) {
        // Update existing event
        savedEvent = await CalendarService.updateEvent(editingEvent.id, eventData);
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? savedEvent : e));
      } else {
        // Create new event
        try {
          savedEvent = await CalendarService.createEvent(eventData);
          setEvents(prev => [...prev, savedEvent]);
        } catch (dbError) {
          console.error('Database error, trying fallback:', dbError);
          
          // Fallback: Create event in localStorage
          const fallbackEvent = {
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...eventData,
            start: eventData.start,
            end: eventData.end,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Save to localStorage
          const existingEvents = JSON.parse(localStorage.getItem('calendar_events') || '[]');
          existingEvents.push(fallbackEvent);
          localStorage.setItem('calendar_events', JSON.stringify(existingEvents));
          
          savedEvent = fallbackEvent;
          setEvents(prev => [...prev, savedEvent]);
          
          alert('Event wurde lokal gespeichert (Datenbank nicht verfügbar)');
        }
      }

      console.log('Event saved successfully:', savedEvent);

      setShowEventModal(false);
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        start: '',
        end: '',
        category: 'work',
        priority: 'medium',
        location: '',
        attendees: '',
        tags: ''
      });
    } catch (error) {
      console.error('Error saving event:', error);
      alert(`Fehler beim Speichern des Events: ${error.message}`);
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await CalendarService.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Fehler beim Löschen des Events');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      work: '#6366f1',
      health: '#10b981',
      learning: '#f59e0b',
      finance: '#ef4444',
      personal: '#8b5cf6'
    };
    return colors[category] || '#6366f1';
  };

  const filteredEvents = events.filter(event => {
    console.log('Filtering event:', event.title, 'category:', event.category, 'filters:', filters);
    
    // Apply category filters
    if (!filters[event.category]) {
      console.log('Event filtered out by category:', event.title, 'category:', event.category);
      return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matches = (
        event.title.toLowerCase().includes(searchLower) ||
        (event.description && event.description.toLowerCase().includes(searchLower)) ||
        (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
      if (!matches) {
        console.log('Event filtered out by search:', event.title);
        return false;
      }
    }
    
    console.log('Event passed filter:', event.title);
    return true;
  });

  // Search events in Supabase
  const searchEvents = async (searchTerm) => {
    if (!user || !searchTerm.trim()) return;

    try {
      const searchResults = await CalendarService.searchEvents(user.id, searchTerm);
      setEvents(searchResults);
    } catch (error) {
      console.error('Error searching events:', error);
    }
  };

  const today = new Date();
  const days = getDaysInMonth(currentDate);
  const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {/* Week day headers */}
      {weekDays.map(day => (
        <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <span className="hidden sm:inline">{day}</span>
          <span className="sm:hidden">{day.charAt(0)}</span>
        </div>
      ))}
      
      {/* Calendar days */}
      {days.map((day, index) => {
        const dayEvents = getEventsForDate(day.date);
        const isToday = day.date.toDateString() === today.toDateString();
        const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
        
        return (
          <motion.div
            key={index}
            onDoubleClick={() => openEventModal(day.date)}
            onClick={() => setSelectedDate(day.date)}
            className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
              isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
            } ${
              !isCurrentMonth ? 'opacity-50' : ''
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className={`text-xs sm:text-sm font-medium ${
                isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
              }`}>
                {day.date.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1 sm:px-1.5 py-0.5 rounded-full">
                  {dayEvents.length}
                </span>
              )}
            </div>
            
            {/* Events */}
            <div className="space-y-1">
              {dayEvents.slice(0, 2).map(event => (
                <motion.div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                  }}
                  className="p-1 sm:p-1.5 rounded-md text-xs cursor-pointer transition-all hover:scale-105"
                  style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <div className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${getPriorityColor(event.priority)}`}></div>
                    <span className="font-medium text-gray-900 dark:text-white truncate text-xs">
                      {event.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="text-xs">{formatTime(event.start)}</span>
                  </div>
                </motion.div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{dayEvents.length - 2} weitere
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays = getWeekDays(weekStart);
    const weekEvents = getEventsForWeek(weekStart);
    
    return (
      <div className="space-y-2 sm:space-y-4">
        {/* Week header - Fixed */}
        <div className="grid grid-cols-8 gap-1 sm:gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 sm:p-2 shadow-sm">
          <div className="p-1 sm:p-2"></div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-1 sm:p-2 text-center">
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                <span className="hidden sm:inline">{day.toLocaleDateString('de-DE', { weekday: 'short' })}</span>
                <span className="sm:hidden">{day.toLocaleDateString('de-DE', { weekday: 'short' }).charAt(0)}</span>
              </div>
              <div className={`text-sm sm:text-lg font-bold ${
                day.toDateString() === today.toDateString() 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        
        {/* Time slots - Scrollable */}
        <div className="grid grid-cols-8 gap-1 sm:gap-2 h-[400px] sm:h-[600px] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-1 sm:p-2 shadow-sm">
          <div className="space-y-0">
            {getTimeSlots().map(hour => (
              <div key={hour} className="h-12 text-xs text-gray-500 dark:text-gray-400 text-right pr-1 sm:pr-2 pt-1">
                <span className="hidden sm:inline">{hour.toString().padStart(2, '0')}:00</span>
                <span className="sm:hidden">{hour.toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
          
          {weekDays.map((day, dayIndex) => (
            <div 
              key={dayIndex} 
              className="relative space-y-0"
              onDoubleClick={() => openEventModal(day)}
            >
              {getTimeSlots().map(hour => (
                <div key={hour} className="h-12 border-t border-gray-200 dark:border-gray-700 relative">
                  {/* Half-hour markers */}
                  <div className="absolute top-6 left-0 right-0 border-t border-gray-100 dark:border-gray-600"></div>
                </div>
              ))}
              
              {/* Events for this day */}
              {weekEvents
                .filter(event => {
                  const eventDate = new Date(event.start);
                  const matches = eventDate.toDateString() === day.toDateString();
                  if (matches) {
                    console.log('Week view: Event matches day:', event.title, 'date:', eventDate.toDateString(), 'target:', day.toDateString());
                  }
                  return matches;
                })
                .map(event => {
                  // Calculate exact position based on time
                  const startTime = new Date(event.start);
                  const endTime = new Date(event.end);
                  
                  // Convert to hours since midnight
                  const startHour = startTime.getHours() + (startTime.getMinutes() / 60);
                  const endHour = endTime.getHours() + (endTime.getMinutes() / 60);
                  const duration = Math.max(endHour - startHour, 0.25); // Minimum 15 minutes
                  
                  // Calculate pixel positions (48px per hour)
                  const topPosition = startHour * 48;
                  const height = duration * 48;
                  
                  console.log('Week view: Positioning event:', event.title, {
                    startTime: startTime.toLocaleTimeString(),
                    endTime: endTime.toLocaleTimeString(),
                    startHour,
                    endHour,
                    duration,
                    topPosition,
                    height
                  });
                  
                  return (
                    <motion.div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="absolute left-0 right-0 mx-0.5 sm:mx-1 rounded-md text-xs cursor-pointer overflow-hidden shadow-sm z-10"
                      style={{
                        top: `${topPosition}px`,
                        height: `${height}px`,
                        backgroundColor: `${event.color}20`,
                        borderLeft: `3px solid ${event.color}`,
                        minHeight: '12px' // Minimum height for visibility
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="p-0.5 sm:p-1 h-full flex flex-col justify-between">
                        <div className="font-medium text-gray-900 dark:text-white truncate text-xs">
                          <span className="hidden sm:inline">{event.title}</span>
                          <span className="sm:hidden">{event.title.substring(0, 8)}...</span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">
                          <span className="hidden sm:inline">{startTime.getHours().toString().padStart(2, '0')}:{startTime.getMinutes().toString().padStart(2, '0')}</span>
                          <span className="sm:hidden">{startTime.getHours().toString().padStart(2, '0')}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    
    return (
      <div className="p-6">
        {/* Day header */}
        <div 
          className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-colors mb-6"
          onDoubleClick={() => openEventModal(currentDate)}
        >
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('de-DE', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {dayEvents.length} Events geplant
          </p>
          <p className="text-xs text-gray-500 mt-2">Doppelklick zum Event hinzufügen</p>
        </div>
        
        {/* Daily Routine View */}
        <DailyRoutineView date={currentDate} />
        
        {/* Regular Events list */}
        {dayEvents.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zusätzliche Termine</h3>
            <div className="space-y-2 sm:space-y-3">
              {dayEvents.map(event => (
                <motion.div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-lg transition-all bg-white dark:bg-gray-800"
                  style={{ borderLeft: `4px solid ${event.color}` }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${getPriorityColor(event.priority)}`}></div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                          {event.title}
                        </h3>
                        {event.category === 'deepwork' && (
                          <Brain className="h-3 sm:h-4 w-3 sm:w-4 text-purple-500" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {event.description}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {event.tags && event.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAgendaView = () => {
    const agendaEvents = filteredEvents
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 50); // Show next 50 events
    
    return (
      <div className="space-y-3 sm:space-y-4">
        <div 
          className="text-center p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-colors"
          onDoubleClick={() => openEventModal()}
        >
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Agenda - Nächste Events
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Übersicht über alle geplanten Events ({agendaEvents.length} Events)
          </p>
          <p className="text-xs text-gray-500 mt-2">Doppelklick zum Event hinzufügen</p>
        </div>
        
        <div className="space-y-2 sm:space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
          {agendaEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Events geplant</p>
              <p className="text-sm">Doppelklick auf einen Tag um ein Event hinzuzufügen</p>
            </div>
          ) : (
            agendaEvents.map(event => (
              <motion.div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-lg transition-all bg-white dark:bg-gray-800"
                style={{ borderLeft: `4px solid ${event.color}` }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${getPriorityColor(event.priority)}`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                        {event.title}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full capitalize">
                        {event.category}
                      </span>
                      {event.category === 'deepwork' && (
                        <Brain className="h-3 sm:h-4 w-3 sm:w-4 text-purple-500" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {event.description}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{event.start.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {event.tags && event.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Lade Kalender...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
            {/* Left: Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Kalender</h1>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateView(-1)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(today)}
                  className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  Heute
                </button>
                <button
                  onClick={() => navigateView(1)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {view === 'month' && currentDate.toLocaleDateString('de-DE', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
                {view === 'week' && (() => {
                  const weekStart = getWeekStart(currentDate);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  return `${weekStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                })()}
                {view === 'day' && currentDate.toLocaleDateString('de-DE', { 
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric' 
                })}
                {view === 'agenda' && 'Agenda - Nächste Events'}
              </h2>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* View Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { key: 'month', label: 'Monat', icon: Grid3X3 },
                  { key: 'week', label: 'Woche', icon: Calendar },
                  { key: 'day', label: 'Tag', icon: Clock },
                  { key: 'agenda', label: 'Agenda', icon: List }
                ].map((viewOption) => (
                  <button
                    key={viewOption.key}
                    onClick={() => setView(viewOption.key)}
                    className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      view === viewOption.key
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <viewOption.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">{viewOption.label}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Events suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>






            </div>
          </div>
        </div>
      </div>

      {/* Filters and Stats */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([category, enabled]) => (
                  <button
                    key={category}
                    onClick={() => setFilters(prev => ({ ...prev, [category]: !enabled }))}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                      enabled
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {React.createElement(getCategoryIcon(category), { className: "h-3 w-3 sm:h-4 sm:w-4" })}
                    <span className="capitalize">{category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Deep Work Stats */}
            {deepworkStats.totalSessions > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Deep Work:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                  <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                    <span className="text-purple-700 dark:text-purple-300 font-medium">
                      {deepworkStats.totalSessions} Sessions
                    </span>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      {Math.round(deepworkStats.totalDuration / 60)}h
                    </span>
                  </div>
                  {deepworkStats.averageFocusScore > 0 && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                      <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                        {Math.round(deepworkStats.averageFocusScore)}/100 Fokus
                      </span>
                    </div>
                  )}
                  {deepworkStats.totalTasksCompleted > 0 && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {deepworkStats.totalTasksCompleted} Aufgaben
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Calendar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Render different views */}
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
          {view === 'agenda' && renderAgendaView()}
        </div>

        {/* Event Details Modal */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedEvent(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Show Deep Work details if it's a deep work event */}
                {selectedEvent.category === 'deepwork' ? (
                  <DeepWorkEventDetails 
                    event={selectedEvent} 
                    onClose={() => setSelectedEvent(null)} 
                  />
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${selectedEvent.color}20` }}
                        >
                          {React.createElement(getIconComponent(selectedEvent.icon), { 
                            className: "h-5 w-5",
                            style: { color: selectedEvent.color }
                          })}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedEvent.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedEvent.category}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedEvent(null)}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <p className="text-gray-700 dark:text-gray-300">
                        {selectedEvent.description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}
                          </span>
                        </div>

                        {selectedEvent.location && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {selectedEvent.location}
                            </span>
                          </div>
                        )}

                        {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {selectedEvent.attendees.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedEvent.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button 
                          onClick={() => {
                            setSelectedEvent(null);
                            openEventModal(null, selectedEvent);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          Bearbeiten
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Share2 className="h-4 w-4" />
                          Teilen
                        </button>
                        <button 
                          onClick={() => {
                            deleteEvent(selectedEvent.id);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event Creation/Edit Modal */}
        <AnimatePresence>
          {showEventModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowEventModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editingEvent ? 'Event bearbeiten' : 'Neues Event'}
                  </h3>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); saveEvent(); }} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Titel *
                    </label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Event Titel"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Beschreibung
                    </label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Event Beschreibung"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start *
                      </label>
                      <input
                        type="datetime-local"
                        value={eventForm.start}
                        onChange={(e) => setEventForm(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ende *
                      </label>
                      <input
                        type="datetime-local"
                        value={eventForm.end}
                        onChange={(e) => setEventForm(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Category & Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kategorie
                      </label>
                      <select
                        value={eventForm.category}
                        onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="work">Arbeit</option>
                        <option value="health">Gesundheit</option>
                        <option value="learning">Lernen</option>
                        <option value="finance">Finanzen</option>
                        <option value="personal">Persönlich</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priorität
                      </label>
                      <select
                        value={eventForm.priority}
                        onChange={(e) => setEventForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Niedrig</option>
                        <option value="medium">Mittel</option>
                        <option value="high">Hoch</option>
                      </select>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ort
                    </label>
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. Home Office, Zoom, etc."
                    />
                  </div>

                  {/* Attendees */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Teilnehmer
                    </label>
                    <input
                      type="text"
                      value={eventForm.attendees}
                      onChange={(e) => setEventForm(prev => ({ ...prev, attendees: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Max, Anna, Team A (kommagetrennt)"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={eventForm.tags}
                      onChange={(e) => setEventForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="fokus, produktivität, meeting (kommagetrennt)"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                    >
                      {editingEvent ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Kalender;
