import { supabase } from './supabase';

export class DeepWorkService {
  // Fetch all deep work sessions for a user
  static async getUserSessions(userId) {
    try {
      console.log('Fetching deep work sessions for user:', userId);
      
      const { data, error } = await supabase
        .from('deepwork_sessions')
        .select(`
          *,
          deepwork_session_types(name, color, icon)
        `)
        .eq('user_id', userId)
        .not('title', 'like', '%Demo%')
        .not('title', 'like', '%Test%')
        .not('title', 'like', 'Deep Work Session - %')
        .not('description', 'like', '%Demo%')
        .not('description', 'like', '%Test%')
        .not('description', 'like', '%Intensive%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deep work sessions:', error);
        throw error;
      }

      // Additional client-side filtering to remove demo sessions
      const filteredData = (data || []).filter(session => {
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
          console.log('Filtering out demo session:', session.title);
        }
        
        return !isDemo;
      });

      console.log('Deep work sessions loaded:', filteredData?.length || 0, 'sessions (filtered from', data?.length || 0, 'total)');
      console.log('Sample session:', filteredData?.[0]);
      
      return filteredData;
    } catch (error) {
      console.error('DeepWorkService getUserSessions error:', error);
      return [];
    }
  }

  // Convert deep work sessions to calendar events
  static convertSessionsToEvents(sessions) {
    console.log('Converting sessions to events:', sessions?.length || 0, 'sessions');
    
    const events = sessions.map(session => {
      console.log('Processing session:', session);
      
      const startTime = session.started_at || session.created_at;
      const endTime = session.completed_at || 
        (startTime ? new Date(new Date(startTime).getTime() + (session.actual_duration || session.planned_duration) * 60 * 1000) : null);

      const event = {
        id: `deepwork_${session.id}`,
        title: session.title,
        description: session.description || session.goal,
        start: startTime ? new Date(startTime) : new Date(session.created_at),
        end: endTime ? new Date(endTime) : new Date(session.created_at),
        allDay: false,
        category: 'deepwork',
        color: session.deepwork_session_types?.color || '#8B5CF6',
        location: null,
        url: null,
        status: session.status,
        isRecurring: false,
        recurrenceRule: null,
        user_id: session.user_id,
        shared_with: [],
        created_at: session.created_at,
        updated_at: session.updated_at,
        icon: 'Brain',
        // Deep work specific data
        deepwork_data: {
          session_id: session.id,
          session_type: session.deepwork_session_types?.name,
          planned_duration: session.planned_duration,
          actual_duration: session.actual_duration,
          break_duration: session.break_duration,
          focus_score: session.focus_score,
          distractions_count: session.distractions_count,
          tasks_completed: session.tasks_completed,
          total_tasks: session.total_tasks,
          goal: session.goal,
          tags: session.tags || []
        }
      };
      
      console.log('Created event:', event);
      return event;
    });
    
    console.log('Converted events:', events?.length || 0, 'events');
    return events;
  }

  // Get sessions for a specific date range
  static async getSessionsForDateRange(userId, startDate, endDate) {
    try {
      console.log('Fetching deep work sessions for date range:', { userId, startDate, endDate });
      
      const { data, error } = await supabase
        .from('deepwork_sessions')
        .select(`
          *,
          deepwork_session_types(name, color, icon)
        `)
        .eq('user_id', userId)
        .not('title', 'like', '%Demo%')
        .not('title', 'like', '%Test%')
        .not('title', 'like', 'Deep Work Session - %')
        .not('description', 'like', '%Demo%')
        .not('description', 'like', '%Test%')
        .not('description', 'like', '%Intensive%')
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .order('started_at', { ascending: true });

      if (error) {
        console.error('Error fetching deep work sessions for date range:', error);
        throw error;
      }

      // Additional client-side filtering to remove demo sessions
      const filteredData = (data || []).filter(session => {
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
          console.log('Filtering out demo session from date range:', session.title);
        }
        
        return !isDemo;
      });

      console.log('Deep work sessions for date range:', filteredData?.length || 0, 'sessions (filtered from', data?.length || 0, 'total)');
      return filteredData;
    } catch (error) {
      console.error('DeepWorkService getSessionsForDateRange error:', error);
      return [];
    }
  }

  // Get session statistics
  static async getSessionStats(userId, startDate, endDate) {
    try {
      console.log('Getting session stats for user:', userId, 'from', startDate, 'to', endDate);
      
      const { data, error } = await supabase
        .from('deepwork_sessions')
        .select('actual_duration, focus_score, status, tasks_completed, total_tasks, title, description')
        .eq('user_id', userId)
        .not('title', 'like', '%Demo%')
        .not('title', 'like', '%Test%')
        .not('title', 'like', 'Deep Work Session - %')
        .not('description', 'like', '%Demo%')
        .not('description', 'like', '%Test%')
        .not('description', 'like', '%Intensive%')
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching session stats:', error);
        throw error;
      }

      // Additional client-side filtering to remove demo sessions
      const filteredData = (data || []).filter(session => {
        const isDemo = 
          session.title?.includes('Demo') ||
          session.title?.includes('Test') ||
          session.title?.startsWith('Deep Work Session -') ||
          session.description?.includes('Demo') ||
          session.description?.includes('Test') ||
          session.description?.includes('Intensive') ||
          session.description?.includes('Studium') ||
          session.description?.includes('Strategische');
        
        if (isDemo) {
          console.log('Filtering out demo session from stats:', session.title);
        }
        
        return !isDemo;
      });

      console.log('Session stats data (filtered):', filteredData);

      const stats = {
        totalSessions: filteredData.length,
        totalDuration: filteredData.reduce((sum, session) => sum + (session.actual_duration || 0), 0),
        averageFocusScore: filteredData.length > 0 ? 
          filteredData.reduce((sum, session) => sum + (session.focus_score || 0), 0) / filteredData.length : 0,
        totalTasksCompleted: filteredData.reduce((sum, session) => sum + (session.tasks_completed || 0), 0),
        totalTasksPlanned: filteredData.reduce((sum, session) => sum + (session.total_tasks || 0), 0)
      };

      console.log('Calculated stats:', stats);
      return stats;
    } catch (error) {
      console.error('DeepWorkService getSessionStats error:', error);
      return {
        totalSessions: 0,
        totalDuration: 0,
        averageFocusScore: 0,
        totalTasksCompleted: 0,
        totalTasksPlanned: 0
      };
    }
  }


}
