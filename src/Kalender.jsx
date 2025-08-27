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
    finance: true
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Load events from Supabase
  useEffect(() => {
    const loadEvents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const eventsData = await CalendarService.getEvents(user.id);
        setEvents(eventsData);
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [user]);

  // Load events when view or date changes
  useEffect(() => {
    const loadEventsForView = async () => {
      if (!user) return;

      try {
        let eventsData = [];
        
        switch (view) {
          case 'month':
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            eventsData = await CalendarService.getEvents(user.id, startOfMonth, endOfMonth);
            break;
          case 'week':
            const weekStart = getWeekStart(currentDate);
            eventsData = await CalendarService.getEventsForWeek(user.id, weekStart);
            break;
          case 'day':
            eventsData = await CalendarService.getEventsForDay(user.id, currentDate);
            break;
          case 'agenda':
            eventsData = await CalendarService.getUpcomingEvents(user.id, 20);
            break;
          default:
            eventsData = await CalendarService.getEvents(user.id);
        }
        
        setEvents(eventsData);
      } catch (error) {
        console.error('Error loading events for view:', error);
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
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventsForWeek = (startDate) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= startDate && eventDate <= endDate;
    });
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
      personal: 'Star'
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
        userId: user.id,
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

      let savedEvent;
      if (editingEvent) {
        // Update existing event
        savedEvent = await CalendarService.updateEvent(editingEvent.id, eventData);
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? savedEvent : e));
      } else {
        // Create new event
        savedEvent = await CalendarService.createEvent(eventData);
        setEvents(prev => [...prev, savedEvent]);
      }

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
      alert('Fehler beim Speichern des Events');
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
    // Apply category filters
    if (!filters[event.category]) return false;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
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
        <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {day}
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
            className={`min-h-[120px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
              isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
            } ${
              !isCurrentMonth ? 'opacity-50' : ''
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
              }`}>
                {day.date.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                  {dayEvents.length}
                </span>
              )}
            </div>
            
            {/* Events */}
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map(event => (
                <motion.div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                  }}
                  className="p-1.5 rounded-md text-xs cursor-pointer transition-all hover:scale-105"
                  style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(event.priority)}`}></div>
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {event.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(event.start)}</span>
                  </div>
                </motion.div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{dayEvents.length - 3} weitere
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
      <div className="space-y-4">
        {/* Week header */}
        <div className="grid grid-cols-8 gap-2">
          <div className="p-2"></div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-2 text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {day.toLocaleDateString('de-DE', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold ${
                day.toDateString() === today.toDateString() 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        
        {/* Time slots */}
        <div className="grid grid-cols-8 gap-2">
          <div className="space-y-2">
            {getTimeSlots().map(hour => (
              <div key={hour} className="h-12 text-xs text-gray-500 dark:text-gray-400 text-right pr-2 pt-1">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          
          {weekDays.map((day, dayIndex) => (
            <div 
              key={dayIndex} 
              className="relative space-y-2"
              onDoubleClick={() => openEventModal(day)}
            >
              {getTimeSlots().map(hour => (
                <div key={hour} className="h-12 border-t border-gray-200 dark:border-gray-700"></div>
              ))}
              
              {/* Events for this day */}
              {weekEvents
                .filter(event => event.start.toDateString() === day.toDateString())
                .map(event => {
                  const startHour = event.start.getHours() + event.start.getMinutes() / 60;
                  const endHour = event.end.getHours() + event.end.getMinutes() / 60;
                  const duration = endHour - startHour;
                  
                  return (
                    <motion.div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="absolute left-0 right-0 mx-1 rounded-md text-xs cursor-pointer overflow-hidden"
                      style={{
                        top: `${startHour * 48}px`,
                        height: `${duration * 48}px`,
                        backgroundColor: `${event.color}20`,
                        borderLeft: `3px solid ${event.color}`
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="p-1">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {event.title}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {formatTime(event.start)}
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
      <div className="space-y-4">
        {/* Day header */}
        <div 
          className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-colors"
          onDoubleClick={() => openEventModal(currentDate)}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('de-DE', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {dayEvents.length} Events geplant
          </p>
          <p className="text-xs text-gray-500 mt-2">Doppelklick zum Event hinzufügen</p>
        </div>
        
        {/* Events list */}
        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Events für heute</p>
              <p className="text-sm">Doppelklick auf einen Tag um ein Event hinzuzufügen</p>
            </div>
          ) : (
            dayEvents.map(event => (
              <motion.div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                style={{ borderLeft: `4px solid ${event.color}` }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(event.priority)}`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {event.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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
                  <div className="flex items-center gap-1">
                    {event.tags.map(tag => (
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
            ))
          )}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const agendaEvents = filteredEvents
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 20); // Show next 20 events
    
    return (
      <div className="space-y-4">
        <div 
          className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-colors"
          onDoubleClick={() => openEventModal()}
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Agenda - Nächste Events
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Übersicht über alle geplanten Events
          </p>
          <p className="text-xs text-gray-500 mt-2">Doppelklick zum Event hinzufügen</p>
        </div>
        
        <div className="space-y-3">
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
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                style={{ borderLeft: `4px solid ${event.color}` }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(event.priority)}`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {event.title}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {event.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{event.start.toLocaleDateString('de-DE')}</span>
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
                    <div className="flex items-center gap-1">
                      {event.tags.map(tag => (
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
                  onClick={() => navigateMonth(-1)}
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
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('de-DE', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h2>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      view === viewOption.key
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <viewOption.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{viewOption.label}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Events suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            {Object.entries(filters).map(([category, enabled]) => (
              <button
                key={category}
                onClick={() => setFilters(prev => ({ ...prev, [category]: !enabled }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  enabled
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {React.createElement(getCategoryIcon(category), { className: "h-4 w-4" })}
                <span className="capitalize">{category}</span>
              </button>
            ))}
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

                    {selectedEvent.attendees.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {selectedEvent.attendees.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedEvent.tags.length > 0 && (
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
