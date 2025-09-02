import React, { useState } from 'react';
import { calendarService } from './lib/calendar';
import { useAuth } from './AuthContext';

const CalendarTest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testEventCreation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing event creation...');
      console.log('User:', user);

      const testEvent = {
        title: 'Test Event',
        description: 'This is a test event',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        category: 'general',
        color: '#3B82F6',
        location: 'Test Location',
        allDay: false
      };

      console.log('Test event data:', testEvent);

      const result = await calendarService.createEvent(testEvent);
      setResult(result);
      console.log('Event created successfully:', result);
    } catch (err) {
      setError(err.message);
      console.error('Test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testGetEvents = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing get events...');
      const events = await calendarService.getEvents();
      setResult(events);
      console.log('Events retrieved:', events);
    } catch (err) {
      setError(err.message);
      console.error('Test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-4">Bitte logge dich ein, um den Kalender zu testen.</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Kalender Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">User Info</h2>
          <p>ID: {user.id}</p>
          <p>Email: {user.email}</p>
        </div>

        <div className="space-y-2">
          <button
            onClick={testEventCreation}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Event Creation'}
          </button>

          <button
            onClick={testGetEvents}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-2"
          >
            {loading ? 'Loading...' : 'Test Get Events'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <h3 className="font-bold">Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <h3 className="font-bold">Success:</h3>
            <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarTest;
