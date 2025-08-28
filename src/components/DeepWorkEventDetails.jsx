import React from 'react';
import { 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle, 
  Star, 
  Tag, 
  TrendingUp,
  Brain,
  Timer,
  Coffee
} from 'lucide-react';

const DeepWorkEventDetails = ({ event, onClose }) => {
  const deepworkData = event.deepwork_data;
  
  if (!deepworkData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deep Work Session</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300">Keine Deep Work Daten verfügbar</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'in_progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'paused': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'planned': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <TrendingUp className="w-4 h-4" />;
      case 'paused': return <Timer className="w-4 h-4" />;
      case 'planned': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getFocusScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deep Work Session</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Title and Status */}
      <div className="mb-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{event.title}</h4>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
          {getStatusIcon(event.status)}
          {event.status === 'completed' && 'Abgeschlossen'}
          {event.status === 'in_progress' && 'In Bearbeitung'}
          {event.status === 'paused' && 'Pausiert'}
          {event.status === 'planned' && 'Geplant'}
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-gray-600 dark:text-gray-300 mb-4">{event.description}</p>
      )}

      {/* Session Type */}
      {deepworkData.session_type && (
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {deepworkData.session_type}
          </span>
        </div>
      )}

      {/* Duration Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Geplant</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDuration(deepworkData.planned_duration)}
          </span>
        </div>
        
        {deepworkData.actual_duration && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Tatsächlich</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDuration(deepworkData.actual_duration)}
            </span>
          </div>
        )}
      </div>

      {/* Focus Score */}
      {deepworkData.focus_score && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Fokus-Score</span>
            </div>
            <span className={`text-lg font-bold ${getFocusScoreColor(deepworkData.focus_score)}`}>
              {deepworkData.focus_score}/100
            </span>
          </div>
        </div>
      )}

      {/* Tasks Progress */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-purple-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Aufgaben</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-900 dark:text-white">
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {deepworkData.tasks_completed || 0}
            </span> von {deepworkData.total_tasks || 0} erledigt
          </span>
          {deepworkData.total_tasks > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {Math.round((deepworkData.tasks_completed || 0) / deepworkData.total_tasks * 100)}%
            </span>
          )}
        </div>
        {deepworkData.total_tasks > 0 && (
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((deepworkData.tasks_completed || 0) / deepworkData.total_tasks * 100, 100)}%` }}
            />
          </div>
        )}
        {(!deepworkData.tasks_completed && !deepworkData.total_tasks) && (
          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
            Keine Aufgaben definiert
          </div>
        )}
      </div>

      {/* Distractions */}
      {deepworkData.distractions_count > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Coffee className="w-4 h-4 text-red-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {deepworkData.distractions_count} Ablenkung{deepworkData.distractions_count !== 1 ? 'en' : ''}
          </span>
        </div>
      )}

      {/* Tags */}
      {deepworkData.tags && deepworkData.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {deepworkData.tags.map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Time Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div>Start: {new Date(event.start).toLocaleString('de-DE')}</div>
          {event.end && <div>Ende: {new Date(event.end).toLocaleString('de-DE')}</div>}
        </div>
      </div>
    </div>
  );
};

export default DeepWorkEventDetails;
