import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';
import { 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  Clock, 
  Tag, 
  Flag, 
  Folder,
  Edit3,
  Trash2,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Eye,
  Archive,
  Circle,
  MessageSquare,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  MoreHorizontal,
  List,
  BarChart3,
  Target,
  Zap,
  TrendingUp,
  Users,
  Star,
  Sparkles,
  FileText,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Aufgaben = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban'); // 'kanban', 'list'
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'today', 'this_week', 'overdue', 'backlog'
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityType, setActivityType] = useState('');
  const [activityData, setActivityData] = useState({});

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project_id: '',
    status_id: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    tags: [],
    task_owner: '',
    task_assistants: []
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    icon: 'folder'
  });

  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    next_action: '',
    next_action_date: '',
    hours_spent: 0
  });

  const [showInlineActivity, setShowInlineActivity] = useState(false);
  const [inlineActivityType, setInlineActivityType] = useState('');
  const [taskActivities, setTaskActivities] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load statuses
      const { data: statusData } = await supabase
        .from('task_statuses')
        .select('*')
        .order('sort_order');
      
      setStatuses(statusData || []);

      // Load projects
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      
      setProjects(projectData || []);

      // Load available users (for collaboration)
      try {
        console.log('Loading profiles for user:', user.id);
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, firstname, lastname, username, avatar_url')
          .neq('id', user.id)
          .order('firstname');
        
        console.log('Profiles data:', usersData);
        console.log('Profiles error:', usersError);
        
        if (usersError) {
          console.warn('Could not load profiles, using fallback:', usersError);
          setAvailableUsers([]);
        } else {
          // Transform data to match expected format
          const transformedUsers = (usersData || []).map(user => ({
            id: user.id,
            full_name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'Unbekannter User',
            avatar_url: user.avatar_url,
            email: user.username // Using username as email fallback
          }));
          console.log('Transformed users:', transformedUsers);
          setAvailableUsers(transformedUsers);
          
          // Create user cache for quick lookups
          const cache = {};
          transformedUsers.forEach(user => {
            cache[user.id] = user;
          });
          
          // Add current user to cache
          cache[user.id] = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email || 'Du',
            avatar_url: user.user_metadata?.avatar_url,
            email: user.email
          };
          
          console.log('User cache created:', cache);
          setUserCache(cache);
        }
      } catch (error) {
        console.warn('Error loading users:', error);
        setAvailableUsers([]);
      }

      // Load tasks with related data
      console.log('Loading tasks for user:', user.id);
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(name, color, icon),
          task_statuses(name, display_name, color, icon)
        `)
        .or(`user_id.eq.${user.id},task_owner.eq.${user.id},task_assistants.cs.{${user.id}}`)
        .order('created_at', { ascending: false });
      
      if (taskError) {
        console.error('Error loading tasks:', taskError);
        // Fallback: Try simple query without complex joins
        console.log('Trying fallback query...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          setTasks([]);
        } else {
          console.log('Fallback loaded tasks:', fallbackData?.length || 0);
          setTasks(fallbackData || []);
        }
      } else {
        console.log('Loaded tasks:', taskData?.length || 0);
        setTasks(taskData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get user data
  const getUserData = (userId) => {
    if (userId === user.id) {
      return {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
        email: user.email
      };
    }
    
    const cachedUser = userCache[userId];
    if (cachedUser) {
      console.log(`Found user ${userId} in cache:`, cachedUser);
      return cachedUser;
    }
    
    console.log(`User ${userId} not found in cache, returning unknown`);
    return {
      id: userId,
      full_name: 'Unbekannt',
      avatar_url: null,
      email: 'unbekannt@example.com'
    };
  };

  const loadTaskActivities = async (taskId) => {
    try {
      // Load from JSON activities in tasks table (primary method)
      const { data: task } = await supabase
        .from('tasks')
        .select('activities')
        .eq('id', taskId)
        .single();

      if (task && task.activities && Array.isArray(task.activities)) {
        // Convert JSON activities to the same format as table activities
        const jsonActivities = task.activities.map(activity => {
          // Ensure user_data is available
          let userData = activity.user_data;
          if (!userData && activity.user_id) {
            userData = getUserData(activity.user_id);
          }
          
          // Ensure we have a proper user_id
          const userId = activity.user_id || user.id;
          
          // If still no user_data, try to get it from cache
          if (!userData && userId) {
            userData = getUserData(userId);
          }
          
          return {
            id: activity.id || `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            task_id: taskId,
            user_id: userId,
            user_data: userData,
            activity_type: activity.type,
            title: activity.title,
            description: activity.description,
            metadata: activity.data || {},
            created_at: activity.timestamp
          };
        });
        
        console.log('Loaded activities from JSON:', jsonActivities.length);
        setTaskActivities(jsonActivities);
      } else {
        console.log('No activities found in JSON, checking task_activities table...');
        
        // Fallback: Try task_activities table
        const { data: activities } = await supabase
          .from('task_activities')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });
        
        if (activities && activities.length > 0) {
          console.log('Loaded activities from table:', activities.length);
          setTaskActivities(activities);
        } else {
          console.log('No activities found in table either');
          setTaskActivities([]);
        }
      }
    } catch (error) {
      console.error('Error loading task activities:', error);
      setTaskActivities([]);
    }
  };

  const createTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...taskForm,
          user_id: user.id,
          task_owner: taskForm.task_owner || user.id, // Default to current user if not specified
          task_assistants: taskForm.task_assistants || [],
          status_id: taskForm.status_id || statuses.find(s => s.name === 'not_started')?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setShowCreateTask(false);
      setTaskForm({
        title: '',
        description: '',
        project_id: '',
        status_id: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        tags: [],
        task_owner: '',
        task_assistants: []
      });
      loadData();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const createProject = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          ...projectForm,
          user_id: user.id
        }]);

      if (error) throw error;

      setShowCreateProject(false);
      setProjectForm({
        name: '',
        description: '',
        color: '#6366f1',
        icon: 'folder'
      });
      loadData();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const updateTaskStatus = async (taskId, newStatusId) => {
    try {
      const oldStatus = tasks.find(t => t.id === taskId)?.task_statuses;
      const newStatus = statuses.find(s => s.id === newStatusId);

      const { error } = await supabase
        .from('tasks')
        .update({ status_id: newStatusId })
        .eq('id', taskId);

      if (error) throw error;

      // Add activity
      await supabase
        .from('task_activities')
        .insert([{
          task_id: taskId,
          user_id: user.id,
          activity_type: 'status_change',
          title: 'Status geändert',
          description: `Status von "${oldStatus?.display_name}" zu "${newStatus?.display_name}" geändert`,
          metadata: { 
            old_status: oldStatus?.name,
            new_status: newStatus?.name
          }
        }]);

      loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

    const addActivity = async (isInline = false) => {
    try {
      console.log('Adding activity:', { isInline, inlineActivityType, activityType, activityForm });

      // Create new activity with unique ID
      const newActivity = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: isInline ? inlineActivityType : activityType,
        title: activityForm.title,
        description: activityForm.description,
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email,
        user_data: {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email,
          avatar_url: user.user_metadata?.avatar_url,
          email: user.email
        },
        data: {
          hours_spent: (isInline && inlineActivityType === 'pause') ? 0 : (parseFloat(activityForm.hours_spent) || 0),
          next_action: activityForm.next_action || null,
          next_action_date: activityForm.next_action_date || null
        }
      };

      // Validate that we don't have duplicate activities (same title and timestamp within 5 seconds)
      const currentActivities = Array.isArray(selectedTask.activities) ? selectedTask.activities : [];
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      
      const isDuplicate = currentActivities.some(activity => 
        activity.title === newActivity.title && 
        activity.timestamp > fiveSecondsAgo
      );
      
      if (isDuplicate) {
        console.warn('Duplicate activity detected, skipping...');
        return;
      }
      
      // Add new activity to the beginning (most recent first)
      const updatedActivities = [newActivity, ...currentActivities];
      
      // Ensure activities are sorted by timestamp (newest first)
      updatedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Remove any duplicate activities based on ID
      const uniqueActivities = updatedActivities.filter((activity, index, self) => 
        index === self.findIndex(a => a.id === activity.id)
      );
      
      // Use unique activities
      const finalActivities = uniqueActivities;

      // Prepare update data
      const updateData = {
        activities: finalActivities
      };

      // Update hours if provided
      if (activityForm.hours_spent > 0 && !(isInline && inlineActivityType === 'pause')) {
        updateData.actual_hours = (selectedTask.actual_hours || 0) + parseFloat(activityForm.hours_spent);
      }

      // Update next_action_date if provided
      if (activityForm.next_action_date) {
        updateData.next_action_date = activityForm.next_action_date;
      }

      // Handle add_person activity
      if (isInline && inlineActivityType === 'add_person' && activityForm.person_to_add) {
        const personToAdd = activityForm.person_to_add;
        const currentAssistants = selectedTask.task_assistants || [];
        
        // Add person to assistants if not already there
        if (!currentAssistants.includes(personToAdd)) {
          updateData.task_assistants = [...currentAssistants, personToAdd];
        }
        
        // Update activity description
        const personData = getUserData(personToAdd);
        newActivity.description = `${personData.full_name} wurde zur Aufgabe hinzugefügt`;
        newActivity.data.person_added = personToAdd;
        newActivity.data.person_name = personData.full_name;
      }

      // Auto-update status based on activity type
      if (currentActivities.length === 0) {
        // First activity: set to "In Progress"
        const inProgressStatus = statuses.find(s => s.name === 'in_progress');
        if (inProgressStatus) {
          updateData.status_id = inProgressStatus.id;
        }
      } else if (isInline && inlineActivityType === 'pause') {
        // Pause activity: set to "Paused"
        const pausedStatus = statuses.find(s => s.name === 'paused');
        if (pausedStatus) {
          updateData.status_id = pausedStatus.id;
        }
      }

      // Update task with new activities
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', selectedTask.id)
        .select()
        .single();

      if (updateError) {
        console.error('Task update error:', updateError);
        throw updateError;
      }

      console.log('Task updated successfully:', updatedTask);
      console.log('Activities in updated task:', updatedTask.activities?.length || 0);

      console.log('Activity saved successfully:', newActivity);
      console.log('Total activities now:', updatedActivities.length);
      console.log('Updated task data:', updateData);

      // Close modal/form
      if (isInline) {
        setShowInlineActivity(false);
      } else {
        setShowActivityModal(false);
      }
      
      // Reset form
      setActivityForm({
        title: '',
        description: '',
        next_action: '',
        next_action_date: '',
        hours_spent: 0,
        person_to_add: ''
      });

      // Reload the complete task data from database to ensure consistency
      if (selectedTask) {
        const { data: refreshedTask } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', selectedTask.id)
          .single();
        
        if (refreshedTask) {
          console.log('Refreshed task data:', refreshedTask);
          console.log('Activities in refreshed task:', refreshedTask.activities?.length || 0);
          setSelectedTask(refreshedTask);
          await loadTaskActivities(refreshedTask.id);
        }
      }
      
      // Reload data
      await loadData();

      console.log('Activity added successfully!');
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Fehler beim Speichern der Activity: ' + error.message);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesProject = selectedProject === 'all' || task.project_id === selectedProject;
    const matchesStatus = selectedStatus === 'all' || task.status_id === selectedStatus;
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by next_action_date
    let matchesFilter = true;
    if (selectedFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextActionDate = task.next_action_date ? new Date(task.next_action_date) : null;
      
      switch (selectedFilter) {
        case 'today':
          matchesFilter = nextActionDate && nextActionDate.toDateString() === today.toDateString();
          break;
        case 'this_week':
          const endOfWeek = new Date(today);
          endOfWeek.setDate(today.getDate() + 7);
          matchesFilter = nextActionDate && nextActionDate >= today && nextActionDate <= endOfWeek;
          break;
        case 'overdue':
          matchesFilter = nextActionDate && nextActionDate < today;
          break;
        case 'backlog':
          matchesFilter = !nextActionDate;
          break;
        default:
          matchesFilter = true;
      }
    }
    
    return matchesProject && matchesStatus && matchesSearch && matchesFilter;
  });

  const getStatusIcon = (statusName) => {
    switch (statusName) {
      case 'backlog': return <Archive className="w-4 h-4" />;
      case 'not_started': return <Circle className="w-4 h-4" />;
      case 'in_progress': return <PlayCircle className="w-4 h-4" />;
      case 'paused': return <PauseCircle className="w-4 h-4" />;
      case 'review': return <Eye className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-700';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚡';
      case 'medium': return '📌';
      case 'low': return '🌱';
      default: return '📌';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'urgent': return 'Dringend';
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return 'Mittel';
    }
  };

  const getPriorityGradient = (priority) => {
    switch (priority) {
      case 'urgent': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'low': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusGradient = (statusName) => {
    switch (statusName) {
      case 'backlog': return 'from-gray-500 to-gray-600';
      case 'not_started': return 'from-red-500 to-red-600';
      case 'in_progress': return 'from-blue-500 to-blue-600';
      case 'paused': return 'from-purple-500 to-purple-600';
      case 'review': return 'from-cyan-500 to-cyan-600';
      case 'completed': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };



  // Enhanced Kanban View
  const renderKanbanView = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        {statuses.map(status => (
          <motion.div 
            key={status.id} 
            className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r ${getStatusGradient(status.name)}`}></div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{status.display_name}</h3>
              <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm">
                {filteredTasks.filter(task => task.status_id === status.id).length}
              </span>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              {filteredTasks
                .filter(task => task.status_id === status.id)
                .map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-600"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDetail(true);
                      loadTaskActivities(task.id);
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm line-clamp-2">
                          {task.title}
                        </h4>
                        {/* Show task owner avatar if different from current user */}
                        {task.task_owner && task.task_owner.id !== user.id && (
                          <div className="flex items-center gap-1 mt-1">
                            {task.task_owner.avatar_url ? (
                              <img 
                                src={task.task_owner.avatar_url} 
                                alt={task.task_owner.full_name}
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                                                                                             <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                  {getUserData(task.task_owner.id).full_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                                                                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                   {getUserData(task.task_owner.id).full_name}
                                 </span>
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} ml-2`}>
                        {getPriorityIcon(task.priority)}
                      </span>
                    </div>
                    
                    {task.projects && (
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <div 
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: task.projects.color }}
                        ></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {task.projects.name}
                        </span>
                      </div>
                    )}
                    
                    {task.due_date && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="font-medium">
                          Fällig: {new Date(task.due_date).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                    
                    {task.next_action_date && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                        <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="font-medium">
                          Nächste Aktion: {new Date(task.next_action_date).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>{task.actual_hours || 0}h / {task.estimated_hours || 0}h</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            setShowActivityModal(true);
                          }}
                          className="p-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Aufgaben
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">Verwalte deine Tasks und Projekte mit innovativen Views</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <motion.button
              onClick={() => setShowCreateProject(true)}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Folder className="w-4 h-4" />
              <span className="hidden sm:inline">Projekt</span>
              <span className="sm:hidden">+ Projekt</span>
            </motion.button>
            <motion.button
              onClick={() => setShowCreateTask(true)}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Neue Aufgabe</span>
              <span className="sm:hidden">+ Aufgabe</span>
            </motion.button>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 sm:px-4 py-3 flex-1 min-w-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Aufgaben suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-gray-900 dark:text-white flex-1 text-sm sm:text-base min-w-0"
              />
            </div>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
            >
              <option value="all">Alle Projekte</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
            >
              <option value="all">Alle Status</option>
              {statuses.map(status => (
                <option key={status.id} value={status.id}>{status.display_name}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex flex-wrap gap-2 mt-4">
            <motion.button
              onClick={() => setView('kanban')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                view === 'kanban' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
              <span className="sm:hidden">K</span>
            </motion.button>
            <motion.button
              onClick={() => setView('list')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                view === 'list' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Liste</span>
              <span className="sm:hidden">L</span>
            </motion.button>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <motion.button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                selectedFilter === 'all' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Alle</span>
              <span className="sm:hidden">Alle</span>
            </motion.button>
            <motion.button
              onClick={() => setSelectedFilter('today')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                selectedFilter === 'today' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Steht heute an</span>
              <span className="sm:hidden">Heute</span>
            </motion.button>
            <motion.button
              onClick={() => setSelectedFilter('this_week')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                selectedFilter === 'this_week' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Diese Woche</span>
              <span className="sm:hidden">Woche</span>
            </motion.button>
            <motion.button
              onClick={() => setSelectedFilter('overdue')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                selectedFilter === 'overdue' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Überfällig</span>
              <span className="sm:hidden">Überf.</span>
            </motion.button>
            <motion.button
              onClick={() => setSelectedFilter('backlog')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                selectedFilter === 'backlog' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Backlog</span>
              <span className="sm:hidden">Backlog</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 sm:space-y-6">
        {view === 'kanban' && renderKanbanView()}
        {view === 'list' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Aufgabe
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Projekt
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Priorität
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Fällig
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Nächste Aktion
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Zeit
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTasks.map(task => (
                    <motion.tr 
                      key={task.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        {task.projects && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full shadow-sm"
                              style={{ backgroundColor: task.projects.color }}
                            ></div>
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {task.projects.name}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getStatusGradient(task.task_statuses?.name)}`}></div>
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {task.task_statuses?.display_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)} {getPriorityText(task.priority)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('de-DE') : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {task.next_action_date ? new Date(task.next_action_date).toLocaleDateString('de-DE') : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {task.actual_hours || 0}h / {task.estimated_hours || 0}h
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => {
                              setSelectedTask(task);
                              setShowTaskDetail(true);
                              loadTaskActivities(task.id);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              setSelectedTask(task);
                              setShowActivityModal(true);
                            }}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Activity className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {filteredTasks.map(task => (
                  <motion.div
                    key={task.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getPriorityColor(task.priority)}`}>
                        {getPriorityIcon(task.priority)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {task.projects && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: task.projects.color }}
                          ></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {task.projects.name}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getStatusGradient(task.task_statuses?.name)}`}></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {task.task_statuses?.display_name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Fällig: {new Date(task.due_date).toLocaleDateString('de-DE')}</span>
                          </div>
                        )}
                        {task.next_action_date && (
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            <span>Nächste Aktion: {new Date(task.next_action_date).toLocaleDateString('de-DE')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.actual_hours || 0}h / {task.estimated_hours || 0}h</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <motion.button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowTaskDetail(true);
                            loadTaskActivities(task.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowActivityModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Activity className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Detail Modal - High End Design */}
      <AnimatePresence>
        {showTaskDetail && selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTaskDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
                      <p className="text-indigo-100 text-sm">
                        Erstellt am {new Date(selectedTask.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => setShowTaskDetail(false)}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="flex h-[calc(90vh-120px)]">
                {/* Main Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Task Details */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Description */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          Beschreibung
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {selectedTask.description || 'Keine Beschreibung vorhanden'}
                        </p>
                      </div>

                      {/* Activity Log */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-green-600" />
                          Aktivitäts-Log
                        </h3>
                        <div className="space-y-4">
                          {/* Task Created Activity */}
                          <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-600 rounded-lg">
                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center flex-shrink-0">
                              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 dark:text-white">Task erstellt</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(selectedTask.created_at).toLocaleString('de-DE')}
                                </span>
                                {/* Show user avatar for task creation */}
                                {(selectedTask.task_owner || selectedTask.user_id) && (
                                  <div className="flex items-center gap-1">
                                    {getUserData(selectedTask.task_owner || selectedTask.user_id).avatar_url ? (
                                      <img 
                                        src={getUserData(selectedTask.task_owner || selectedTask.user_id).avatar_url} 
                                        alt={getUserData(selectedTask.task_owner || selectedTask.user_id).full_name}
                                        className="w-4 h-4 rounded-full"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                        {getUserData(selectedTask.task_owner || selectedTask.user_id).full_name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      von {getUserData(selectedTask.task_owner || selectedTask.user_id).full_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                Task "{selectedTask.title}" wurde erstellt
                              </p>
                            </div>
                          </div>

                          {/* Real Activities */}
                          {taskActivities.map((activity, index) => (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-start gap-4 p-4 bg-white dark:bg-gray-600 rounded-lg border-l-4 border-indigo-500"
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                activity.activity_type === 'pause' 
                                  ? 'bg-red-100 dark:bg-red-900' 
                                  : 'bg-green-100 dark:bg-green-900'
                              }`}>
                                {activity.activity_type === 'progress_update' && <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />}
                                {activity.activity_type === 'pause' && <PauseCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                                {activity.activity_type === 'next_action' && <Flag className="w-4 h-4 text-green-600 dark:text-green-400" />}
                                {activity.activity_type === 'comment' && <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />}
                                {activity.activity_type === 'status_change' && <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />}
                                {activity.activity_type === 'add_person' && <UserPlus className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 dark:text-white">{activity.title}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(activity.timestamp || activity.created_at).toLocaleString('de-DE')}
                                  </span>
                                                                    {/* Show user avatar for activities */}
                                  {activity.user_id && (
                                    <div className="flex items-center gap-2 ml-auto">
                                      {/* Get user data from activity or cache */}
                                      {(() => {
                                        const userData = activity.user_data || getUserData(activity.user_id);
                                        const isCurrentUser = userData.id === user.id;
                                        
                                        return (
                                          <div className="flex items-center gap-1">
                                            {/* Avatar */}
                                            {userData.avatar_url ? (
                                              <img 
                                                src={userData.avatar_url} 
                                                alt={userData.full_name}
                                                className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                              />
                                            ) : (
                                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm ${
                                                isCurrentUser ? 'bg-blue-500' : 'bg-green-500'
                                              }`}>
                                                {userData.full_name.charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                            
                                            {/* User name */}
                                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                              {isCurrentUser ? 'Du' : userData.full_name}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {activity.description}
                                </p>
                                
                                {/* Activity Metadata */}
                                {(activity.data || activity.metadata) && (
                                  <div className="space-y-1 mt-2">
                                    {/* Hours spent */}
                                    {((activity.data?.hours_spent > 0) || (activity.metadata?.hours_spent > 0)) && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        <span>{(activity.data?.hours_spent || activity.metadata?.hours_spent)}h verbracht</span>
                                      </div>
                                    )}
                                    
                                    {/* Next action */}
                                    {(activity.data?.next_action || activity.metadata?.next_action) && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Flag className="w-3 h-3" />
                                        <span>Next Action: {activity.data?.next_action || activity.metadata?.next_action}</span>
                                      </div>
                                    )}
                                    
                                    {/* Next action date */}
                                    {(activity.data?.next_action_date || activity.metadata?.next_action_date) && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-3 h-3" />
                                        <span>Datum: {new Date(activity.data?.next_action_date || activity.metadata?.next_action_date).toLocaleDateString('de-DE')}</span>
                                      </div>
                                    )}
                                    
                                    {/* Status change */}
                                    {activity.metadata?.old_status && activity.metadata?.new_status && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>Status: {activity.metadata.old_status} → {activity.metadata.new_status}</span>
                                      </div>
                                    )}
                                    
                                    {/* Person added */}
                                    {activity.data?.person_added && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <UserPlus className="w-3 h-3" />
                                        <span>{activity.data.person_name || 'Person'} hinzugefügt</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-yellow-600" />
                          Schnell-Aktionen
                        </h3>
                        
                        {!showInlineActivity ? (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <motion.button
                              onClick={() => {
                                setInlineActivityType('progress_update');
                                setShowInlineActivity(true);
                                setActivityForm({
                                  title: '',
                                  description: '',
                                  next_action: '',
                                  next_action_date: '',
                                  hours_spent: 0
                                });
                              }}
                              className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Fortschritt</span>
                            </motion.button>
                            
                            <motion.button
                              onClick={() => {
                                setInlineActivityType('pause');
                                setShowInlineActivity(true);
                                setActivityForm({
                                  title: 'Aufgabe pausieren',
                                  description: '',
                                  next_action: '',
                                  next_action_date: '',
                                  hours_spent: 0
                                });
                              }}
                              className="flex flex-col items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <PauseCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                              <span className="text-xs text-red-700 dark:text-red-300 font-medium">Pausieren</span>
                            </motion.button>
                            
                            <motion.button
                              onClick={() => {
                                setInlineActivityType('next_action');
                                setShowInlineActivity(true);
                                setActivityForm({
                                  title: '',
                                  description: '',
                                  next_action: '',
                                  next_action_date: '',
                                  hours_spent: 0
                                });
                              }}
                              className="flex flex-col items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Flag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                              <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Next Action</span>
                            </motion.button>
                            
                            <motion.button
                              onClick={() => {
                                setInlineActivityType('comment');
                                setShowInlineActivity(true);
                                setActivityForm({
                                  title: '',
                                  description: '',
                                  next_action: '',
                                  next_action_date: '',
                                  hours_spent: 0
                                });
                              }}
                              className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <MessageSquare className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Kommentar</span>
                            </motion.button>
                            
                            <motion.button
                              onClick={() => {
                                setInlineActivityType('add_person');
                                setShowInlineActivity(true);
                                setActivityForm({
                                  title: '',
                                  description: '',
                                  next_action: '',
                                  next_action_date: '',
                                  hours_spent: 0,
                                  person_to_add: ''
                                });
                              }}
                              className="flex flex-col items-center gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <UserPlus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                              <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">Person hinzufügen</span>
                            </motion.button>
                          </div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white dark:bg-gray-600 rounded-xl p-6 border border-gray-200 dark:border-gray-500"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {inlineActivityType === 'progress_update' && 'Fortschritt festhalten'}
                                {inlineActivityType === 'pause' && 'Aufgabe pausieren'}
                                {inlineActivityType === 'next_action' && 'Next Action festlegen'}
                                {inlineActivityType === 'comment' && 'Kommentar hinzufügen'}
                                {inlineActivityType === 'add_person' && 'Person zur Aufgabe hinzufügen'}
                              </h4>
                              <motion.button
                                onClick={() => setShowInlineActivity(false)}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-400 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <X className="w-4 h-4" />
                              </motion.button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {inlineActivityType === 'progress_update' ? 'Was wurde erreicht?' :
                                   inlineActivityType === 'pause' ? 'Warum wird pausiert?' :
                                   inlineActivityType === 'next_action' ? 'Nächster Schritt' :
                                   'Kommentar Titel'}
                                </label>
                                <input
                                  type="text"
                                  value={activityForm.title}
                                  onChange={(e) => setActivityForm({...activityForm, title: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  placeholder={
                                    inlineActivityType === 'progress_update' ? 'Was wurde erreicht?' :
                                    inlineActivityType === 'pause' ? 'Warum wird pausiert?' :
                                    inlineActivityType === 'next_action' ? 'Nächster Schritt' :
                                    'Kommentar Titel'
                                  }
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Beschreibung
                                </label>
                                <textarea
                                  value={activityForm.description}
                                  onChange={(e) => setActivityForm({...activityForm, description: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  rows="3"
                                  placeholder="Detaillierte Beschreibung..."
                                />
                              </div>

                              {inlineActivityType === 'progress_update' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Stunden verbracht
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.25"
                                      min="0"
                                      max="24"
                                      value={activityForm.hours_spent}
                                      onChange={(e) => setActivityForm({...activityForm, hours_spent: parseFloat(e.target.value) || 0})}
                                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium"
                                      placeholder="0.0"
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                                      h
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    {[0.25, 0.5, 1, 2, 4, 8].map(hours => (
                                      <button
                                        key={hours}
                                        type="button"
                                        onClick={() => setActivityForm({...activityForm, hours_spent: hours})}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                          activityForm.hours_spent === hours
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                                        }`}
                                      >
                                        {hours}h
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(inlineActivityType === 'progress_update' || inlineActivityType === 'next_action') && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Next Action
                                    </label>
                                    <input
                                      type="text"
                                      value={activityForm.next_action}
                                      onChange={(e) => setActivityForm({...activityForm, next_action: e.target.value})}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                      placeholder="Was ist der nächste konkrete Schritt?"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      Datum für Next Action
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="date"
                                        value={activityForm.next_action_date}
                                        onChange={(e) => setActivityForm({...activityForm, next_action_date: e.target.value})}
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium"
                                        min={new Date().toISOString().split('T')[0]}
                                      />
                                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-5 h-5" />
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      {[
                                        { label: 'Heute', value: new Date().toISOString().split('T')[0] },
                                        { label: 'Morgen', value: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] },
                                        { label: 'Übermorgen', value: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0] },
                                        { label: 'Nächste Woche', value: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0] }
                                      ].map(date => (
                                        <button
                                          key={date.value}
                                          type="button"
                                          onClick={() => setActivityForm({...activityForm, next_action_date: date.value})}
                                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                            activityForm.next_action_date === date.value
                                              ? 'bg-indigo-500 text-white'
                                              : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                                          }`}
                                        >
                                          {date.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {inlineActivityType === 'add_person' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" />
                                    Person auswählen
                                  </label>
                                  <select
                                    value={activityForm.person_to_add}
                                    onChange={(e) => setActivityForm({...activityForm, person_to_add: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  >
                                    <option value="">Person auswählen...</option>
                                    {availableUsers.map(user => (
                                      <option key={user.id} value={user.id}>
                                        {user.full_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              <div className="flex gap-3 pt-4">
                                <motion.button
                                  onClick={() => setShowInlineActivity(false)}
                                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  Abbrechen
                                </motion.button>
                                <motion.button
                                  onClick={() => addActivity(true)}
                                  disabled={!activityForm.title}
                                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  Speichern
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Task Info */}
                    <div className="space-y-6">
                      {/* Status & Priority */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600" />
                          Status & Priorität
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Status
                            </label>
                            <select
                              value={selectedTask.status_id}
                              onChange={(e) => updateTaskStatus(selectedTask.id, e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              {statuses.map(status => (
                                <option key={status.id} value={status.id}>{status.display_name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Priorität
                            </label>
                                                    <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium ${getPriorityColor(selectedTask.priority)}`}>
                          {getPriorityIcon(selectedTask.priority)} {getPriorityText(selectedTask.priority)}
                        </div>
                          </div>
                        </div>
                      </div>

                      {/* Collaboration Info */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-600" />
                          Kollaboration
                        </h3>
                        <div className="space-y-3">
                          {/* Task Owner */}
                          <div className="p-3 bg-white dark:bg-gray-600 rounded-lg">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Verantwortlicher</div>
                            <div className="flex items-center gap-2">
                              {getUserData(selectedTask.task_owner || user.id).avatar_url ? (
                                <img 
                                  src={getUserData(selectedTask.task_owner || user.id).avatar_url} 
                                  alt={getUserData(selectedTask.task_owner || user.id).full_name}
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                 <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                   {getUserData(selectedTask.task_owner || user.id).full_name.charAt(0).toUpperCase()}
                                 </div>
                              )}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {getUserData(selectedTask.task_owner || user.id).full_name}
                              </span>
                            </div>
                          </div>

                          {/* Task Assistants */}
                          {selectedTask.task_assistants && selectedTask.task_assistants.length > 0 && (
                            <div className="p-3 bg-white dark:bg-gray-600 rounded-lg">
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Assistenten</div>
                              <div className="flex flex-wrap gap-2">
                                {selectedTask.task_assistants.map((assistantId, index) => {
                                  const assistant = getUserData(assistantId);
                                  return (
                                    <div key={index} className="flex items-center gap-2">
                                      {assistant.avatar_url ? (
                                        <img 
                                          src={assistant.avatar_url} 
                                          alt={assistant.full_name}
                                          className="w-5 h-5 rounded-full"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                                          {assistant.full_name.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="text-sm text-gray-900 dark:text-white">
                                        {assistant.full_name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Project Info */}
                      {selectedTask.projects && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Folder className="w-5 h-5 text-indigo-600" />
                            Projekt
                          </h3>
                          <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-600 rounded-lg">
                            <div 
                              className="w-8 h-8 rounded-full shadow-sm"
                              style={{ backgroundColor: selectedTask.projects.color }}
                            ></div>
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {selectedTask.projects.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Time Tracking */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-indigo-600" />
                          Zeit-Tracking
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Geschätzt</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedTask.estimated_hours || 0}h
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-600 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Verbracht</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedTask.actual_hours || 0}h
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Verbleibend</span>
                            <span className="font-bold text-indigo-700 dark:text-indigo-300">
                              {Math.max((selectedTask.estimated_hours || 0) - (selectedTask.actual_hours || 0), 0)}h
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Due Date */}
                      {selectedTask.due_date && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            Fälligkeitsdatum
                          </h3>
                          <div className="p-4 bg-white dark:bg-gray-600 rounded-lg">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {new Date(selectedTask.due_date).toLocaleDateString('de-DE')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {(() => {
                                  const dueDate = new Date(selectedTask.due_date);
                                  const today = new Date();
                                  const diffTime = dueDate - today;
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  
                                  if (diffDays < 0) {
                                    return <span className="text-red-500">Überfällig ({Math.abs(diffDays)} Tage)</span>;
                                  } else if (diffDays === 0) {
                                    return <span className="text-orange-500">Heute fällig</span>;
                                  } else if (diffDays === 1) {
                                    return <span className="text-yellow-500">Morgen fällig</span>;
                                  } else {
                                    return <span className="text-green-500">In {diffDays} Tagen</span>;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Next Action Date */}
                      {selectedTask.next_action_date && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-600" />
                            Nächste Aktion
                          </h3>
                          <div className="p-4 bg-white dark:bg-gray-600 rounded-lg">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {new Date(selectedTask.next_action_date).toLocaleDateString('de-DE')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {(() => {
                                  const nextActionDate = new Date(selectedTask.next_action_date);
                                  const today = new Date();
                                  const diffTime = nextActionDate - today;
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  
                                  if (diffDays < 0) {
                                    return <span className="text-red-500">Überfällig ({Math.abs(diffDays)} Tage)</span>;
                                  } else if (diffDays === 0) {
                                    return <span className="text-purple-500">Heute anstehen</span>;
                                  } else if (diffDays === 1) {
                                    return <span className="text-purple-500">Morgen anstehen</span>;
                                  } else {
                                    return <span className="text-purple-500">In {diffDays} Tagen</span>;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {selectedTask.tags && selectedTask.tags.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-indigo-600" />
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedTask.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Modals */}
      <AnimatePresence>
        {showCreateTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCreateTask(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Neue Aufgabe</h2>
                <button
                  onClick={() => setShowCreateTask(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Aufgabe Titel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                    placeholder="Beschreibung der Aufgabe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Projekt
                    </label>
                    <select
                      value={taskForm.project_id}
                      onChange={(e) => setTaskForm({...taskForm, project_id: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Kein Projekt</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Priorität
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="low">Niedrig</option>
                      <option value="medium">Mittel</option>
                      <option value="high">Hoch</option>
                      <option value="urgent">Dringend</option>
                    </select>
                  </div>
                </div>

                {/* Collaboration Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Task Owner (Verantwortlicher)
                    </label>
                    <select
                      value={taskForm.task_owner}
                      onChange={(e) => setTaskForm({...taskForm, task_owner: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Ich selbst</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Assistenten (Helfer) {availableUsers.length > 0 ? `(${availableUsers.length} verfügbar)` : '(keine verfügbar)'}
                    </label>
                    <div className="space-y-2">
                      {availableUsers.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                          Keine anderen User verfügbar. Erstelle zuerst ein Profil in der profiles Tabelle.
                        </div>
                      ) : (
                        availableUsers.map(user => (
                        <label key={user.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={taskForm.task_assistants.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTaskForm({
                                  ...taskForm, 
                                  task_assistants: [...taskForm.task_assistants, user.id]
                                });
                              } else {
                                setTaskForm({
                                  ...taskForm, 
                                  task_assistants: taskForm.task_assistants.filter(id => id !== user.id)
                                });
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <div className="flex items-center gap-2">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.full_name}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm text-gray-900 dark:text-white">{user.full_name}</span>
                          </div>
                        </label>
                      ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Fälligkeitsdatum
                    </label>
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>


                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Geschätzte Stunden
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={taskForm.estimated_hours}
                      onChange={(e) => setTaskForm({...taskForm, estimated_hours: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <motion.button
                    onClick={() => setShowCreateTask(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Abbrechen
                  </motion.button>
                  <motion.button
                    onClick={createTask}
                    disabled={!taskForm.title}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Erstellen
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Creation Modal */}
      <AnimatePresence>
        {showCreateProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCreateProject(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Neues Projekt</h2>
                <button
                  onClick={() => setShowCreateProject(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Projektname
                  </label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Projektname eingeben"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                    placeholder="Projektbeschreibung (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Farbe
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      '#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
                      '#8b5cf6', '#ec4899', '#84cc16', '#f59e0b', '#10b981', '#3b82f6'
                    ].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setProjectForm({...projectForm, color})}
                        className={`w-12 h-12 rounded-xl border-2 transition-all ${
                          projectForm.color === color 
                            ? 'border-gray-900 dark:border-white scale-110' 
                            : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <motion.button
                    onClick={() => setShowCreateProject(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Abbrechen
                  </motion.button>
                  <motion.button
                    onClick={createProject}
                    disabled={!projectForm.name}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Projekt erstellen
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Modal */}
      <AnimatePresence>
        {showActivityModal && selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowActivityModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activityType === 'progress_update' && 'Fortschritt festhalten'}
                  {activityType === 'time_log' && 'Zeit loggen'}
                  {activityType === 'next_action' && 'Next Action festlegen'}
                  {activityType === 'comment' && 'Kommentar hinzufügen'}
                </h2>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={activityForm.title}
                    onChange={(e) => setActivityForm({...activityForm, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={
                      activityType === 'progress_update' ? 'Was wurde erreicht?' :
                      activityType === 'time_log' ? 'Was wurde gemacht?' :
                      activityType === 'next_action' ? 'Nächster Schritt' :
                      'Kommentar Titel'
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={activityForm.description}
                    onChange={(e) => setActivityForm({...activityForm, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                    placeholder="Detaillierte Beschreibung..."
                  />
                </div>

                {(activityType === 'time_log' || activityType === 'progress_update') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Stunden verbracht
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={activityForm.hours_spent}
                      onChange={(e) => setActivityForm({...activityForm, hours_spent: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                )}

                {activityType === 'next_action' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Next Action
                    </label>
                    <input
                      type="text"
                      value={activityForm.next_action}
                      onChange={(e) => setActivityForm({...activityForm, next_action: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Was ist der nächste konkrete Schritt?"
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-6">
                  <motion.button
                    onClick={() => setShowActivityModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Abbrechen
                  </motion.button>
                  <motion.button
                    onClick={addActivity}
                    disabled={!activityForm.title}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Speichern
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Aufgaben;
