import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';
import { 
  User,
  Mail,
  Calendar,
  Clock,
  Target,
  CheckCircle,
  TrendingUp,
  Settings,
  Camera,
  Edit3,
  Save,
  X,
  Star,
  Award,
  Activity,
  BarChart3,
  Zap,
  Crown,
  Shield,
  Heart,
  Sparkles,
  Brain,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    totalTaskHours: 0,
    totalDeepWorkHours: 0,
    deepWorkSessionsCount: 0,
    totalLearningHours: 0,
    learningSessionsCount: 0,
    currentStreak: 0,
    totalHours: 0
  });

  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    username: '',
    bio: '',
    location: '',
    website: ''
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }

      if (data) {
        setProfile(data);
        setEditForm({
          firstname: data.firstname || '',
          lastname: data.lastname || '',
          username: data.username || '',
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || ''
        });
      } else {
        // Create profile if it doesn't exist
        await createProfile();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          firstname: user.user_metadata?.full_name?.split(' ')[0] || '',
          lastname: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          username: user.email,
          avatar_url: user.user_metadata?.avatar_url,
          email: user.email
        }])
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        firstname: data.firstname || '',
        lastname: data.lastname || '',
        username: data.username || '',
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || ''
      });
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Load task statistics
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, task_statuses(name)')
        .or(`user_id.eq.${user.id},task_owner.eq.${user.id},task_assistants.cs.{${user.id}}`);

      // Load deep work sessions
      const { data: deepWorkSessions } = await supabase
        .from('deep_work_sessions')
        .select('*')
        .eq('user_id', user.id);

      // Load learning sessions (from activities)
      const { data: learningActivities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['learning', 'study', 'practice']);

      if (tasks) {
        const completedTasks = tasks.filter(task => 
          task.task_statuses?.name === 'completed' || task.status_id === 'completed'
        ).length;

        const totalTaskHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
        
        // Calculate task completion rate
        const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        // Deep work stats
        const totalDeepWorkHours = deepWorkSessions ? 
          deepWorkSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / 60 : 0;
        
        const deepWorkSessionsCount = deepWorkSessions ? deepWorkSessions.length : 0;

        // Learning stats
        const totalLearningHours = learningActivities ? 
          learningActivities.reduce((sum, activity) => sum + (activity.duration_minutes || 0), 0) / 60 : 0;
        
        const learningSessionsCount = learningActivities ? learningActivities.length : 0;

        // Calculate current streak (last 7 days with activity)
        const last7Days = Array.from({length: 7}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        });

        let currentStreak = 0;
        for (let i = 0; i < last7Days.length; i++) {
          const date = last7Days[i];
          const hasActivity = tasks.some(task => 
            new Date(task.updated_at).toISOString().split('T')[0] === date
          ) || (deepWorkSessions && deepWorkSessions.some(session => 
            new Date(session.created_at).toISOString().split('T')[0] === date
          ));
          
          if (hasActivity) {
            currentStreak++;
          } else {
            break;
          }
        }

        setStats({
          totalTasks: tasks.length,
          completedTasks,
          completionRate,
          totalTaskHours: Math.round(totalTaskHours * 10) / 10,
          totalDeepWorkHours: Math.round(totalDeepWorkHours * 10) / 10,
          deepWorkSessionsCount,
          totalLearningHours: Math.round(totalLearningHours * 10) / 10,
          learningSessionsCount,
          currentStreak,
          totalHours: Math.round((totalTaskHours + totalDeepWorkHours + totalLearningHours) * 10) / 10
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Fehler beim Hochladen des Avatars');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editForm)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...editForm }));
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Fehler beim Speichern des Profils');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const fullName = profile ? `${profile.firstname || ''} ${profile.lastname || ''}`.trim() : user.user_metadata?.full_name || user.email;
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Profil</h1>
          <p className="text-gray-600">Verwalte dein Profil und schaue dir deine Statistiken an</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              {/* Avatar Section */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={fullName}
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mt-4">{fullName}</h2>
                <p className="text-gray-600">{profile?.username || user.email}</p>
                
                {profile?.bio && (
                  <p className="text-gray-700 mt-3 italic">"{profile.bio}"</p>
                )}
              </div>

              {/* Profile Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5" />
                  <span>{user.email}</span>
                </div>
                
                {profile?.location && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Target className="w-5 h-5" />
                    <span>{profile.location}</span>
                  </div>
                )}
                
                {profile?.website && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Activity className="w-5 h-5" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {profile.website}
                    </a>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-5 h-5" />
                  <span>Mitglied seit {new Date(user.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              </div>

              {/* Edit Button */}
              <motion.button
                onClick={() => setEditing(!editing)}
                className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Edit3 className="w-5 h-5" />
                {editing ? 'Abbrechen' : 'Profil bearbeiten'}
              </motion.button>
            </div>
          </motion.div>

          {/* Stats & Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {/* Gesamtstunden - Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="md:col-span-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 shadow-lg text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-100">Gesamtstunden</p>
                    <p className="text-3xl font-bold">{stats.totalHours}h</p>
                    <p className="text-xs text-indigo-200">Tasks + Deep Work + Lernen</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gesamt Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Erledigt</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedTasks}</p>
                    <p className="text-xs text-gray-500">{stats.completionRate}%</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Task Stunden</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTaskHours}h</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Deep Work</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalDeepWorkHours}h</p>
                    <p className="text-xs text-gray-500">{stats.deepWorkSessionsCount} Sessions</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lernen</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalLearningHours}h</p>
                    <p className="text-xs text-gray-500">{stats.learningSessionsCount} Sessions</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Aktuelle Serie</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.currentStreak} Tage</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Edit Form */}
            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Profil bearbeiten
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vorname</label>
                      <input
                        type="text"
                        value={editForm.firstname}
                        onChange={(e) => setEditForm({...editForm, firstname: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Vorname"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nachname</label>
                      <input
                        type="text"
                        value={editForm.lastname}
                        onChange={(e) => setEditForm({...editForm, lastname: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Nachname"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Benutzername</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Benutzername"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Standort</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Stadt, Land"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="https://example.com"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Über mich</label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Erzähle etwas über dich..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-6">
                    <motion.button
                      onClick={saveProfile}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Save className="w-5 h-5" />
                      Speichern
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setEditing(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <X className="w-5 h-5" />
                      Abbrechen
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
