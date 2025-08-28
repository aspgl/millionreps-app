import { supabase } from './supabase';

export class CalendarService {
  // Get all events for a user
  static async getEvents(userId, startDate = null, endDate = null) {
    try {
      console.log('CalendarService getEvents called with:', { userId, startDate, endDate });
      
      // Try RPC function first
      try {
        const { data, error } = await supabase
          .rpc('get_user_events', {
            user_uuid: userId,
            start_date: startDate,
            end_date: endDate
          });

        if (error) {
          console.error('RPC function error, trying direct query:', error);
          throw error;
        }

        console.log('Raw data from get_user_events:', data);

        // Convert to the format expected by the calendar component
        const convertedEvents = (data || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          allDay: event.all_day,
          category: event.category,
          color: event.color,
          location: event.location,
          url: event.url,
          status: event.status,
          isRecurring: event.is_recurring,
          recurrenceRule: event.recurrence_rule,
          priority: event.priority,
          attendees: event.attendees || [],
          tags: event.tags || [],
          icon: event.icon,
          user_id: userId,
          shared_with: [],
          created_at: event.created_at,
          updated_at: event.updated_at
        }));

        console.log('Converted events:', convertedEvents);
        return convertedEvents;
      } catch (rpcError) {
        console.log('RPC failed, trying direct query...');
        
        // Fallback: Direct query
        let query = supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId);
        
        if (startDate) {
          query = query.gte('start_time', startDate.toISOString());
        }
        if (endDate) {
          query = query.lte('start_time', endDate.toISOString());
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Direct query error:', error);
          throw error;
        }
        
        console.log('Raw data from direct query:', data);
        
        // Convert to the format expected by the calendar component
        const convertedEvents = (data || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          allDay: event.all_day,
          category: event.category,
          color: event.color,
          location: event.location,
          url: event.url,
          status: event.status,
          isRecurring: event.is_recurring,
          recurrenceRule: event.recurrence_rule,
          priority: event.priority,
          attendees: event.attendees || [],
          tags: event.tags || [],
          icon: event.icon,
          user_id: userId,
          shared_with: [],
          created_at: event.created_at,
          updated_at: event.updated_at
        }));
        
        console.log('Converted events from direct query:', convertedEvents);
        return convertedEvents;
      }
    } catch (error) {
      console.error('CalendarService getEvents error:', error);
      return [];
    }
  }

  // Get events for a specific week
  static async getEventsForWeek(userId, weekStart) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_events_for_week', {
          user_uuid: userId,
          week_start: weekStart
        });

      if (error) {
        console.error('Error fetching week events:', error);
        throw error;
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        allDay: event.all_day,
        category: event.category,
        color: event.color,
        location: event.location,
        url: event.url,
        status: event.status,
        isRecurring: event.is_recurring,
        recurrenceRule: event.recurrence_rule,
        priority: event.priority,
        attendees: event.attendees || [],
        tags: event.tags || [],
        icon: event.icon,
        user_id: userId,
        shared_with: [],
        created_at: event.created_at,
        updated_at: event.updated_at
      }));
    } catch (error) {
      console.error('CalendarService getEventsForWeek error:', error);
      return [];
    }
  }

  // Get events for a specific day
  static async getEventsForDay(userId, dayDate) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_events_for_day', {
          user_uuid: userId,
          day_date: dayDate
        });

      if (error) {
        console.error('Error fetching day events:', error);
        throw error;
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        allDay: event.all_day,
        category: event.category,
        color: event.color,
        location: event.location,
        url: event.url,
        status: event.status,
        isRecurring: event.is_recurring,
        recurrenceRule: event.recurrence_rule,
        priority: event.priority,
        attendees: event.attendees || [],
        tags: event.tags || [],
        icon: event.icon,
        user_id: userId,
        shared_with: [],
        created_at: event.created_at,
        updated_at: event.updated_at
      }));
    } catch (error) {
      console.error('CalendarService getEventsForDay error:', error);
      return [];
    }
  }

  // Get upcoming events
  static async getUpcomingEvents(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .rpc('get_upcoming_events', {
          user_uuid: userId,
          limit_count: limit
        });

      if (error) {
        console.error('Error fetching upcoming events:', error);
        throw error;
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        allDay: event.all_day,
        category: event.category,
        color: event.color,
        location: event.location,
        url: event.url,
        status: event.status,
        isRecurring: event.is_recurring,
        recurrenceRule: event.recurrence_rule,
        priority: event.priority,
        attendees: event.attendees || [],
        tags: event.tags || [],
        icon: event.icon,
        user_id: userId,
        shared_with: [],
        created_at: event.created_at,
        updated_at: event.updated_at
      }));
    } catch (error) {
      console.error('CalendarService getUpcomingEvents error:', error);
      return [];
    }
  }

  // Search events
  static async searchEvents(userId, searchTerm) {
    try {
      const { data, error } = await supabase
        .rpc('search_events', {
          user_uuid: userId,
          search_term: searchTerm
        });

      if (error) {
        console.error('Error searching events:', error);
        throw error;
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        allDay: event.all_day,
        category: event.category,
        color: event.color,
        location: event.location,
        url: event.url,
        status: event.status,
        isRecurring: event.is_recurring,
        recurrenceRule: event.recurrence_rule,
        priority: event.priority,
        attendees: event.attendees || [],
        tags: event.tags || [],
        icon: event.icon,
        user_id: userId,
        shared_with: [],
        created_at: event.created_at,
        updated_at: event.updated_at
      }));
    } catch (error) {
      console.error('CalendarService searchEvents error:', error);
      return [];
    }
  }

  // Create a new event
  static async createEvent(eventData) {
    try {
      console.log('CalendarService createEvent called with:', eventData);
      
      // Validate required fields
      if (!eventData.user_id) {
        throw new Error('user_id is required');
      }
      if (!eventData.title) {
        throw new Error('title is required');
      }
      if (!eventData.start || !eventData.end) {
        throw new Error('start and end times are required');
      }

      const insertData = {
        user_id: eventData.user_id,
        title: eventData.title,
        description: eventData.description || '',
        start_time: eventData.start,
        end_time: eventData.end,
        all_day: eventData.allDay || false,
        category: eventData.category || 'general',
        color: eventData.color || '#3B82F6',
        location: eventData.location || '',
        url: eventData.url || '',
        status: eventData.status || 'confirmed',
        is_public: eventData.isPublic || false,
        is_recurring: eventData.isRecurring || false,
        recurrence_rule: eventData.recurrenceRule || '',
        priority: eventData.priority || 'medium',
        attendees: eventData.attendees || [],
        tags: eventData.tags || [],
        icon: eventData.icon || 'calendar'
      };

      console.log('Inserting event data:', insertData);

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating event:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      console.log('Event created successfully:', data);

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        start: new Date(data.start_time),
        end: new Date(data.end_time),
        allDay: data.all_day,
        category: data.category,
        color: data.color,
        location: data.location,
        url: data.url,
        status: data.status,
        isRecurring: data.is_recurring,
        recurrenceRule: data.recurrence_rule,
        priority: data.priority,
        attendees: data.attendees || [],
        tags: data.tags || [],
        icon: data.icon,
        user_id: data.user_id,
        shared_with: [],
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('CalendarService createEvent error:', error);
      throw error;
    }
  }

  // Update an existing event
  static async updateEvent(eventId, eventData) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          title: eventData.title,
          description: eventData.description,
          start_time: eventData.start,
          end_time: eventData.end,
          all_day: eventData.allDay || false,
          category: eventData.category,
          color: eventData.color,
          location: eventData.location,
          url: eventData.url,
          status: eventData.status,
          is_public: eventData.isPublic || false,
          is_recurring: eventData.isRecurring || false,
          recurrence_rule: eventData.recurrenceRule,
          priority: eventData.priority,
          attendees: eventData.attendees || [],
          tags: eventData.tags || [],
          icon: eventData.icon
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        throw error;
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        start: new Date(data.start_time),
        end: new Date(data.end_time),
        allDay: data.all_day,
        category: data.category,
        color: data.color,
        location: data.location,
        url: data.url,
        status: data.status,
        isRecurring: data.is_recurring,
        recurrenceRule: data.recurrence_rule,
        priority: data.priority,
        attendees: data.attendees || [],
        tags: data.tags || [],
        icon: data.icon,
        user_id: data.user_id,
        shared_with: [],
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('CalendarService updateEvent error:', error);
      throw error;
    }
  }

  // Delete an event
  static async deleteEvent(eventId) {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('CalendarService deleteEvent error:', error);
      throw error;
    }
  }
}
