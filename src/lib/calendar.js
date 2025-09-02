import { supabase } from './supabase';

// Calendar Service
export const calendarService = {
  // Get all events for current user
  async getEvents(filters = {}) {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('start_time', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('start_time', filters.endDate);
      }
      
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // Get single event by ID
  async getEvent(id) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  },

  // Create new event
  async createEvent(eventData) {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Creating event with data:', eventData);
      console.log('User ID:', user.id);

      const newEvent = {
        title: eventData.title,
        description: eventData.description || '',
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        all_day: eventData.allDay || false,
        category: eventData.category || 'general',
        color: eventData.color || '#3B82F6',
        location: eventData.location || '',
        url: eventData.url || '',
        status: eventData.status || 'confirmed',
        is_public: eventData.isPublic || false,
        is_recurring: eventData.isRecurring || false,
        recurrence_rule: eventData.recurrenceRule || null,
        shared_with: eventData.sharedWith || [],
        user_id: user.id
      };

      console.log('Formatted event data:', newEvent);

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(newEvent)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Event created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Update event
  async updateEvent(id, updates) {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id) // Sicherheit: nur eigene Events bearbeiten
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  // Delete event
  async deleteEvent(id) {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Sicherheit: nur eigene Events löschen

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },

  // Get events for a specific date range
  async getEventsByDateRange(startDate, endDate) {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching events by date range:', error);
      throw error;
    }
  },

  // Get events for today
  async getTodayEvents() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return this.getEventsByDateRange(startOfDay.toISOString(), endOfDay.toISOString());
  },

  // Get events for this week
  async getWeekEvents() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sonntag
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Samstag
    endOfWeek.setHours(23, 59, 59, 999);
    
    return this.getEventsByDateRange(startOfWeek.toISOString(), endOfWeek.toISOString());
  },

  // Get events for this month
  async getMonthEvents() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    return this.getEventsByDateRange(startOfMonth.toISOString(), endOfMonth.toISOString());
  },

  // Share event with other users
  async shareEvent(eventId, userIds) {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('calendar_events')
        .update({ shared_with: userIds })
        .eq('id', eventId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error sharing event:', error);
      throw error;
    }
  },

  // Get event categories
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('category, color')
        .not('category', 'is', null);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map(event => event.category))];
      return categories.map(category => {
        const event = data.find(e => e.category === category);
        return {
          name: category,
          color: event?.color || '#3B82F6'
        };
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Test function for debugging
  async testEventCreation() {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Testing event creation with user:', user.id);

      const testEvent = {
        title: 'Test Event',
        description: 'This is a test event',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        category: 'general',
        color: '#3B82F6',
        location: 'Test Location',
        allDay: false
      };

      console.log('Test event data:', testEvent);

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(testEvent)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Event created successfully:', data);
      return data;
    } catch (error) {
      console.error('Test event creation failed:', error);
      throw error;
    }
  }
};

// Real-time subscriptions
export const calendarRealtime = {
  // Subscribe to user's events
  subscribeToEvents(callback) {
    return supabase
      .channel('user_calendar_events')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events'
      }, callback)
      .subscribe();
  },

  // Subscribe to specific event
  subscribeToEvent(eventId, callback) {
    return supabase
      .channel(`calendar_event:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
        filter: `id=eq.${eventId}`
      }, callback)
      .subscribe();
  }
};
