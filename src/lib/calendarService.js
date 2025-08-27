import { supabase } from './supabase';

export class CalendarService {
  // Get all events for a user
  static async getEvents(userId, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (startDate && endDate) {
        query = query.gte('start_time', startDate.toISOString())
                    .lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(event => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // Get events for a specific day
  static async getEventsForDay(userId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      return data.map(event => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }));
    } catch (error) {
      console.error('Error fetching day events:', error);
      throw error;
    }
  }

  // Get events for a week
  static async getEventsForWeek(userId, startDate) {
    try {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      return data.map(event => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }));
    } catch (error) {
      console.error('Error fetching week events:', error);
      throw error;
    }
  }

  // Get upcoming events
  static async getUpcomingEvents(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      
      return data.map(event => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }));
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  // Search events
  static async searchEvents(userId, searchTerm, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      
      return data.map(event => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }));
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }

  // Create a new event
  static async createEvent(eventData) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          user_id: eventData.userId,
          title: eventData.title,
          description: eventData.description,
          start_time: eventData.start.toISOString(),
          end_time: eventData.end.toISOString(),
          category: eventData.category,
          priority: eventData.priority,
          location: eventData.location,
          attendees: eventData.attendees,
          tags: eventData.tags,
          color: eventData.color,
          icon: eventData.icon,
          is_all_day: eventData.isAllDay || false
        }])
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        start: new Date(data.start_time),
        end: new Date(data.end_time)
      };
    } catch (error) {
      console.error('Error creating event:', error);
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
          start_time: eventData.start.toISOString(),
          end_time: eventData.end.toISOString(),
          category: eventData.category,
          priority: eventData.priority,
          location: eventData.location,
          attendees: eventData.attendees,
          tags: eventData.tags,
          color: eventData.color,
          icon: eventData.icon,
          is_all_day: eventData.isAllDay || false
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        start: new Date(data.start_time),
        end: new Date(data.end_time)
      };
    } catch (error) {
      console.error('Error updating event:', error);
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

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Get event by ID
  static async getEventById(eventId) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        start: new Date(data.start_time),
        end: new Date(data.end_time)
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  }

  // Get events by category
  static async getEventsByCategory(userId, category) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      return data.map(event => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time)
      }));
    } catch (error) {
      console.error('Error fetching events by category:', error);
      throw error;
    }
  }

  // Get events count by category
  static async getEventsCountByCategory(userId) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('category, count')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString());

      if (error) throw error;
      
      // Group by category and count
      const counts = {};
      data.forEach(event => {
        counts[event.category] = (counts[event.category] || 0) + 1;
      });
      
      return counts;
    } catch (error) {
      console.error('Error fetching events count:', error);
      throw error;
    }
  }
}
