import { Bell, Search, Building2, Menu, X, CheckCircle, AlertCircle, Trophy, Target, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("avatar_url, organization(name)")
        .eq("id", user.id)
        .single()
        .then(({ data, error }) => {
          if (!error) {
            setProfile(data);
            setOrganization(data.organization?.name);
          }
        });
    }
  }, [user]);

  // Load notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      // Load goal activities and milestones
      const { data: goalActivities, error: activitiesError } = await supabase
        .from('goal_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Load overdue goals
      const { data: overdueGoals, error: goalsError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .lt('target_date', new Date().toISOString().split('T')[0]);

      // Load upcoming milestones
      const { data: upcomingMilestones, error: milestonesError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .not('milestones', 'is', null);

      if (!activitiesError && !goalsError && !milestonesError) {
        const allNotifications = [];

        // Add milestone achievements
        goalActivities?.forEach(activity => {
          if (activity.activity_type === 'milestone_achieved') {
            allNotifications.push({
              id: `milestone-${activity.id}`,
              type: 'milestone',
              title: '🏆 Milestone erreicht!',
              message: activity.title,
              timestamp: activity.created_at,
              read: false,
              data: activity
            });
          }
        });

        // Add overdue goals
        overdueGoals?.forEach(goal => {
          allNotifications.push({
            id: `overdue-${goal.id}`,
            type: 'overdue',
            title: '⚠️ Ziel überfällig',
            message: `${goal.title} sollte bis ${new Date(goal.target_date).toLocaleDateString('de-DE')} erreicht werden`,
            timestamp: goal.target_date,
            read: false,
            data: goal
          });
        });

        // Add upcoming milestones (within 3 days)
        upcomingMilestones?.forEach(goal => {
          const milestones = goal.milestones || [];
          milestones.forEach(milestone => {
            if (!milestone.achieved) {
              const currentValue = goal.goal_metric?.current_value || 0;
              const targetValue = milestone.target_value;
              const progress = ((currentValue - (goal.goal_metric?.start_value || 0)) / (targetValue - (goal.goal_metric?.start_value || 0))) * 100;
              
              if (progress >= 80) {
                allNotifications.push({
                  id: `upcoming-${goal.id}-${milestone.id}`,
                  type: 'upcoming',
                  title: '🎯 Milestone in Reichweite',
                  message: `${milestone.title} für "${goal.title}" ist fast erreicht!`,
                  timestamp: new Date().toISOString(),
                  read: false,
                  data: { goal, milestone }
                });
              }
            }
          });
        });

        // Sort by timestamp and limit to 15
        allNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setNotifications(allNotifications.slice(0, 15));
        setUnreadCount(allNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notifications-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  return (
    <header className="h-16 flex items-center justify-between border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-6 shadow-sm">
      {/* Left: Organization (if exists) or App Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-secondary hover:text-gray-900 dark:hover:text-dark-text lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {organization ? (
          <>
            <div 
              onClick={() => navigate("/organization")}
              className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-dark-accent/10 rounded-lg border border-indigo-200 dark:border-dark-accent/20 cursor-pointer hover:bg-indigo-100 dark:hover:bg-dark-accent/20 transition-colors"
            >
              <Building2 className="h-4 w-4 text-indigo-600 dark:text-dark-accent" />
              <span className="text-sm font-medium text-indigo-700 dark:text-dark-accent">{organization}</span>
            </div>
          </>
        ) : (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Dashboard</h1>
        )}
      </div>

      {/* Middle: Search */}
      <div className="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-secondary px-3 py-2 text-sm text-gray-600 dark:text-dark-text-secondary w-80">
        <Search className="h-4 w-4 text-gray-400 dark:text-dark-text-secondary" />
        <input
          placeholder="Search..."
          className="w-full bg-transparent placeholder:text-gray-400 dark:placeholder:text-dark-text-secondary focus:outline-none text-gray-900 dark:text-dark-text"
        />
      </div>

      {/* Right: Icons + Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative notifications-dropdown">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white dark:ring-dark-card">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg z-50 max-h-96 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text">Benachrichtigungen</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Alle als gelesen markieren
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-dark-text-secondary">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Keine Benachrichtigungen</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-dark-border">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-secondary cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {notification.type === 'milestone' && (
                              <Trophy className="h-5 w-5 text-yellow-500" />
                            )}
                            {notification.type === 'overdue' && (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            {notification.type === 'upcoming' && (
                              <Target className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-2">
                              {new Date(notification.timestamp).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-secondary">
                  <button
                    onClick={() => navigate('/goals')}
                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Alle Ziele anzeigen →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar mit Navigation */}
        <img
          onClick={() => navigate("/settings")}
          src={
            profile?.avatar_url || `https://i.pravatar.cc/40?u=${user?.id || "default"}`
          }
          alt="User"
          className="h-8 w-8 rounded-full cursor-pointer object-cover"
        />
      </div>
    </header>
  );
}
