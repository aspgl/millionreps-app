import { supabase } from './supabase';

export const dailyRoutinesService = {
  // Routinen
  async getRoutines() {
    // Erst alle Routinen holen
    const { data: routines, error: routinesError } = await supabase
      .from('daily_routines')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (routinesError) throw routinesError;
    
    // Dann für jede Routine die Habits holen (ohne habit_completions)
    const routinesWithHabits = await Promise.all(
      routines.map(async (routine) => {
        const { data: habits, error: habitsError } = await supabase
          .from('routine_habits')
          .select('*')
          .eq('routine_id', routine.id)
          .order('position_order', { ascending: true });
        
        if (habitsError) {
          console.error('Error fetching habits for routine:', routine.id, habitsError);
          return { ...routine, routine_habits: [] };
        }
        
        return { ...routine, routine_habits: habits || [] };
      })
    );
    
    return routinesWithHabits;
  },

  async getRoutine(id) {
    console.log('Getting routine:', id);
    
    // Erst die Routine holen
    const { data: routine, error: routineError } = await supabase
      .from('daily_routines')
      .select('*')
      .eq('id', id)
      .single();
    
    if (routineError) throw routineError;
    
    // Dann die Habits separat holen (ohne habit_completions)
    const { data: habits, error: habitsError } = await supabase
      .from('routine_habits')
      .select('*')
      .eq('routine_id', id)
      .order('position_order', { ascending: true });
    
    if (habitsError) throw habitsError;
    
    // Daten zusammenführen
    const result = {
      ...routine,
      routine_habits: habits || []
    };
    
    console.log('Routine data:', result);
    return result;
  },

  async createRoutine(routine) {
    console.log('Creating routine with data:', routine);
    
    // Bereite die Daten vor
    const routineData = {
      name: routine.name,
      description: routine.description || '',
      user_id: routine.user_id,
      weekdays: routine.weekdays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    };
    
    console.log('Processed routine data:', routineData);
    
    const { data, error } = await supabase
      .from('daily_routines')
      .insert(routineData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating routine:', error);
      throw error;
    }
    
    console.log('Routine created successfully:', data);
    return data;
  },

  async updateRoutine(id, updates) {
    console.log('Updating routine:', id, 'with updates:', updates);
    
    // Nur das Update durchführen, ohne select()
    const { error } = await supabase
      .from('daily_routines')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;

    // Wenn eine Routine aktiviert wird, erstelle Kalender-Events für die nächsten 7 Tage
    if (updates.is_active === true) {
      try {
        console.log('Routine activated, checking if calendar events need to be created...');
        
        // Prüfe, ob bereits Events für diese Routine existieren
        const existingEvents = await supabase
          .from('routine_calendar_events')
          .select('id')
          .eq('routine_id', id)
          .gte('event_date', new Date().toISOString().split('T')[0]);
        
        if (existingEvents.data && existingEvents.data.length > 0) {
          console.log('Calendar events already exist, skipping creation');
        } else {
          console.log('No existing calendar events found, creating new ones...');
          await this.createCalendarEventsForRoutine(id);
        }
      } catch (error) {
        console.error('Error handling calendar events for routine:', error);
      }
    }
    
    return { success: true };
  },

  async deleteRoutine(id) {
    const { error } = await supabase
      .from('daily_routines')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  // Habits
  async createHabit(habit) {
    console.log('Creating habit with data:', habit);
    
    // Bereite die Daten vor
    const habitData = {
      routine_id: habit.routine_id,
      name: habit.name,
      description: habit.description || '',
      category: habit.category || 'productivity',
      time_block: habit.time_block || 'morning',
      estimated_duration: habit.estimated_duration || 15,
      position_order: habit.position_order || 0,
      is_optional: habit.is_optional || false,
      is_custom_habit: habit.is_custom_habit || false,
      custom_icon: habit.custom_icon || 'Target'
    };
    
    console.log('Processed habit data:', habitData);
    
    const { data, error } = await supabase
      .from('routine_habits')
      .insert(habitData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
    
    console.log('Habit created successfully:', data);
    return data;
  },

  async updateHabit(id, updates) {
    const { error } = await supabase
      .from('routine_habits')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  async deleteHabit(id) {
    const { error } = await supabase
      .from('routine_habits')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  // Templates
  async getTemplates() {
    const { data, error } = await supabase
      .from('habit_templates')
      .select('*')
      .order('is_popular', { ascending: false })
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Kalender-Events
  async getCalendarEvents(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('routine_calendar_events')
      .select(`
        *,
        routine_habits (
          name,
          description,
          category,
          time_block,
          estimated_duration,
          is_custom_habit,
          custom_icon
        )
      `)
      .eq('user_id', userId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Kalender-Events für einen bestimmten Tag
  async getRoutineCalendarEvents(date) {
    const { data, error } = await supabase
      .from('routine_calendar_events')
      .select(`
        *,
        routine_habits (
          name,
          description,
          category,
          time_block,
          estimated_duration,
          is_custom_habit,
          custom_icon
        )
      `)
      .eq('event_date', date.toISOString().split('T')[0])
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    // Entferne Duplikate basierend auf habit_id und event_date
    const uniqueEvents = [];
    const seen = new Set();
    
    if (data) {
      data.forEach(event => {
        const key = `${event.habit_id}-${event.event_date}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEvents.push(event);
        }
      });
    }
    
    console.log(`Found ${data?.length || 0} events, returning ${uniqueEvents.length} unique events`);
    return uniqueEvents;
  },

  // Markiere ein Kalender-Event als abgeschlossen
  async toggleCalendarEvent(eventId, isCompleted) {
    try {
      console.log('Toggling calendar event:', eventId, 'to completed:', isCompleted);
      
      const { error } = await supabase
        .from('routine_calendar_events')
        .update({ 
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      console.log('Calendar event toggled successfully');
      return { success: true };
    } catch (error) {
      console.error('Error toggling calendar event:', error);
      throw error;
    }
  },

  // Markiere alle Events eines Habits für einen bestimmten Tag als abgeschlossen
  async toggleHabitForDate(habitId, date, isCompleted) {
    try {
      console.log('Toggling habit for date:', habitId, date, 'to completed:', isCompleted);
      
      const { error } = await supabase
        .from('routine_calendar_events')
        .update({ 
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('habit_id', habitId)
        .eq('event_date', date);
      
      if (error) throw error;
      
      console.log('Habit events toggled successfully');
      return { success: true };
    } catch (error) {
      console.error('Error toggling habit events:', error);
      throw error;
    }
  },

  // Markiere einen Habit als abgeschlossen (für temporäre Events)
  async completeHabit(completionData) {
    try {
      console.log('Completing habit:', completionData);
      
      // Erstelle ein Kalender-Event für den heutigen Tag
      const today = new Date().toISOString().split('T')[0];
      
      // Hole den Habit, um die Routine-ID zu bekommen
      const { data: habit, error: habitError } = await supabase
        .from('routine_habits')
        .select('routine_id, time_block, estimated_duration')
        .eq('id', completionData.habit_id)
        .single();
      
      if (habitError) throw habitError;
      
      // Hole die Routine, um die Wochentage zu bekommen
      const { data: routine, error: routineError } = await supabase
        .from('daily_routines')
        .select('user_id, weekdays')
        .eq('id', habit.routine_id)
        .single();
      
      if (routineError) throw routineError;
      
      // Prüfe, ob heute ein aktiver Wochentag ist
      const currentWeekday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      if (routine.weekdays && routine.weekdays.includes(currentWeekday)) {
        // Erstelle das Kalender-Event
        const startTime = this.getDefaultStartTime(habit.time_block);
        const endTime = this.getDefaultEndTime(habit.time_block, habit.estimated_duration);
        
        const { error: eventError } = await supabase
          .from('routine_calendar_events')
          .insert({
            user_id: completionData.user_id,
            routine_id: habit.routine_id,
            habit_id: completionData.habit_id,
            event_date: today,
            start_time: startTime,
            end_time: endTime,
            is_completed: true
          });
        
        if (eventError) throw eventError;
        
        console.log('Calendar event created and marked as completed');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error completing habit:', error);
      throw error;
    }
  },

  // Bereinige Duplikate in den Kalender-Events
  async cleanupDuplicateCalendarEvents() {
    try {
      console.log('Cleaning up duplicate calendar events...');
      
      // Finde Duplikate basierend auf habit_id, event_date und routine_id
      const { data: duplicates, error } = await supabase
        .rpc('find_duplicate_calendar_events');
      
      if (error) {
        console.log('RPC function not available, using manual cleanup...');
        // Fallback: Manuelle Bereinigung
        const { data: allEvents, error: fetchError } = await supabase
          .from('routine_calendar_events')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        const seen = new Set();
        const toDelete = [];
        
        allEvents.forEach(event => {
          const key = `${event.routine_id}-${event.habit_id}-${event.event_date}`;
          if (seen.has(key)) {
            toDelete.push(event.id);
          } else {
            seen.add(key);
          }
        });
        
        if (toDelete.length > 0) {
          console.log(`Deleting ${toDelete.length} duplicate events...`);
          const { error: deleteError } = await supabase
            .from('routine_calendar_events')
            .delete()
            .in('id', toDelete);
          
          if (deleteError) {
            console.error('Error deleting duplicates:', deleteError);
          } else {
            console.log('Duplicates cleaned up successfully');
          }
        }
      } else {
        console.log('Duplicates cleaned up via RPC function');
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
    }
  },

  async createCalendarEventsForRoutine(routineId) {
    try {
      console.log('Creating calendar events for routine:', routineId);
      
      const routine = await this.getRoutine(routineId);
      if (!routine || !routine.routine_habits) {
        console.log('No routine or habits found');
        return;
      }
      
      // Prüfe, ob bereits Events für diese Routine existieren
      const existingEvents = await supabase
        .from('routine_calendar_events')
        .select('id')
        .eq('routine_id', routineId)
        .gte('event_date', new Date().toISOString().split('T')[0]);
      
      if (existingEvents.data && existingEvents.data.length > 0) {
        console.log('Calendar events already exist for this routine, skipping creation');
        return;
      }
      
      console.log('Creating new calendar events for routine:', routine.name);
      
      const events = [];
      for (let i = 0; i < 7; i++) {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + i);
        
        // Prüfe, ob der Wochentag für diese Routine aktiviert ist
        const currentWeekday = eventDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        if (routine.weekdays && routine.weekdays.includes(currentWeekday)) {
          routine.routine_habits.forEach((habit) => {
            try {
              const startTime = this.getDefaultStartTime(habit.time_block);
              const endTime = this.getDefaultEndTime(habit.time_block, habit.estimated_duration);
              
              events.push({
                user_id: routine.user_id,
                routine_id: routine.id,
                habit_id: habit.id,
                event_date: eventDate.toISOString().split('T')[0],
                start_time: startTime,
                end_time: endTime
              });
            } catch (error) {
              console.error('Error creating event for habit:', habit.id, error);
            }
          });
        }
      }
      
      if (events.length > 0) {
        console.log(`Inserting ${events.length} calendar events`);
        const { error: eventsError } = await supabase
          .from('routine_calendar_events')
          .insert(events);
        
        if (eventsError) {
          console.error('Error creating calendar events:', eventsError);
        } else {
          console.log('Calendar events created successfully');
        }
      } else {
        console.log('No events to create (no matching weekdays)');
      }
    } catch (error) {
      console.error('Error creating calendar events for routine:', error);
    }
  },

  // Hilfsfunktionen
  getDefaultStartTime(timeBlock) {
    const startTimes = {
      morning: '07:00',
      forenoon: '09:00',
      noon: '12:00',
      afternoon: '15:00',
      evening: '19:00'
    };
    return startTimes[timeBlock] || '09:00';
  },

  getDefaultEndTime(timeBlock, durationMinutes = 15) {
    const startTime = this.getDefaultStartTime(timeBlock);
    const startDate = new Date(`2000-01-01T${startTime}:00`);
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
    return endDate.toTimeString().slice(0, 5);
  },

  // Wochentag-spezifische Routinen
  async getRoutinesByWeekday(weekday) {
    const { data, error } = await supabase
      .from('daily_routines')
      .select(`
        *,
        routine_habits (*)
      `)
      .contains('weekdays', [weekday])
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getWeekendRoutines() {
    const { data, error } = await supabase
      .from('daily_routines')
      .select(`
        *,
        routine_habits (*)
      `)
      .eq('is_weekend_routine', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getWeekdayRoutines() {
    const { data, error } = await supabase
      .from('daily_routines')
      .select(`
        *,
        routine_habits (*)
      `)
      .eq('is_weekday_routine', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};
