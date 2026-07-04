import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import AlarmEngine from './components/AlarmEngine';
import { Settings, LayoutGrid, LogOut } from 'lucide-react';

export interface UserSettings {
  ringtone: string;
  alarmOffset: number;
}

export interface User {
  _id: string;
  email: string;
  token?: string;
  settings: UserSettings;
}

export interface Period {
  _id: string;
  day: string;
  subject: string;
  startTime: string;
  endTime: string;
  room?: string;
  teacher?: string;
  color?: string;
}

const API_URL = 'http://localhost:5000/api';

const DEFAULT_MOCK_PERIODS: Period[] = [
  {
    _id: 'mock-1',
    day: 'Monday',
    subject: 'Advanced AI Coding',
    startTime: '09:00',
    endTime: '10:30',
    room: 'Hall A',
    teacher: 'Dr. Gemini',
    color: '#8b5cf6'
  },
  {
    _id: 'mock-2',
    day: 'Monday',
    subject: 'Human-Agent Collaboration',
    startTime: '11:00',
    endTime: '12:30',
    room: 'Lab 3',
    teacher: 'Prof. Antigravity',
    color: '#06b6d4'
  },
  {
    _id: 'mock-3',
    day: 'Tuesday',
    subject: '3D Web Graphics',
    startTime: '10:00',
    endTime: '11:30',
    room: 'VR Lab',
    teacher: 'Dr. Three',
    color: '#f43f5e'
  },
  {
    _id: 'mock-4',
    day: 'Wednesday',
    subject: 'Neural Networks',
    startTime: '14:00',
    endTime: '15:30',
    room: 'Tech Seminar',
    teacher: 'Prof. Brain',
    color: '#10b981'
  },
  {
    _id: 'mock-5',
    day: 'Thursday',
    subject: 'Advanced AI Coding',
    startTime: '09:00',
    endTime: '10:30',
    room: 'Hall A',
    teacher: 'Dr. Gemini',
    color: '#8b5cf6'
  },
  {
    _id: 'mock-6',
    day: 'Friday',
    subject: 'Database Architectures',
    startTime: '16:00',
    endTime: '17:30',
    room: 'Database Suite',
    teacher: 'Mr. Mongo',
    color: '#f59e0b'
  }
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isOffline, setIsOffline] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile' | 'auth'>('auth');
  const [isCheckingApi, setIsCheckingApi] = useState(true);

  // Check backend server availability
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:5000/health');
        if (res.ok) {
          setIsOffline(false);
          console.log('Connected to backend server.');
        } else {
          setIsOffline(true);
        }
      } catch (err) {
        setIsOffline(true);
        console.warn('Backend server is offline. Running in Standalone Local Mode.');
      } finally {
        setIsCheckingApi(false);
      }
    };
    checkBackend();
  }, []);

  // Sync authentication state from localStorage on load
  useEffect(() => {
    const storedUser = localStorage.getItem('timetable_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setCurrentView('dashboard');
    } else {
      setCurrentView('auth');
    }
  }, []);

  // Fetch periods when user logs in or isOffline status changes
  useEffect(() => {
    if (!user) {
      setPeriods([]);
      return;
    }

    const loadPeriods = async () => {
      if (isOffline) {
        // Load from local storage
        const stored = localStorage.getItem(`periods_${user.email}`);
        if (stored) {
          setPeriods(JSON.parse(stored));
        } else {
          // Initialize mock periods for new user
          localStorage.setItem(`periods_${user.email}`, JSON.stringify(DEFAULT_MOCK_PERIODS));
          setPeriods(DEFAULT_MOCK_PERIODS);
        }
      } else {
        // Fetch from Express API
        try {
          const response = await fetch(`${API_URL}/timetable`, {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setPeriods(data);
          } else if (response.status === 401) {
            // Token expired or invalid
            handleLogout();
          }
        } catch (err) {
          console.error('Error fetching periods:', err);
        }
      }
    };

    loadPeriods();
  }, [user, isOffline]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('timetable_user', JSON.stringify(loggedInUser));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('timetable_user');
    setCurrentView('auth');
  };

  const handleAddPeriod = async (periodData: Omit<Period, '_id'>) => {
    if (!user) return;

    if (isOffline) {
      const newPeriod: Period = {
        ...periodData,
        _id: `local-${Date.now()}`
      };
      const updated = [...periods, newPeriod].sort((a, b) => a.startTime.localeCompare(b.startTime));
      setPeriods(updated);
      localStorage.setItem(`periods_${user.email}`, JSON.stringify(updated));
    } else {
      try {
        const response = await fetch(`${API_URL}/timetable`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(periodData)
        });
        if (response.ok) {
          const newPeriod = await response.json();
          const updated = [...periods, newPeriod].sort((a, b) => a.startTime.localeCompare(b.startTime));
          setPeriods(updated);
        }
      } catch (err) {
        console.error('Error adding period:', err);
      }
    }
  };

  const handleUpdatePeriod = async (id: string, periodData: Partial<Period>) => {
    if (!user) return;

    if (isOffline) {
      const updated = periods.map(p => (p._id === id ? { ...p, ...periodData } : p))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      setPeriods(updated);
      localStorage.setItem(`periods_${user.email}`, JSON.stringify(updated));
    } else {
      try {
        const response = await fetch(`${API_URL}/timetable/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(periodData)
        });
        if (response.ok) {
          const updatedPeriod = await response.json();
          const updated = periods.map(p => (p._id === id ? updatedPeriod : p))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          setPeriods(updated);
        }
      } catch (err) {
        console.error('Error updating period:', err);
      }
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!user) return;

    if (isOffline) {
      const updated = periods.filter(p => p._id !== id);
      setPeriods(updated);
      localStorage.setItem(`periods_${user.email}`, JSON.stringify(updated));
    } else {
      try {
        const response = await fetch(`${API_URL}/timetable/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        if (response.ok) {
          const updated = periods.filter(p => p._id !== id);
          setPeriods(updated);
        }
      } catch (err) {
        console.error('Error deleting period:', err);
      }
    }
  };

  const handleUpdateSettings = async (settings: UserSettings) => {
    if (!user) return;

    const updatedUser = { ...user, settings };
    setUser(updatedUser);
    localStorage.setItem('timetable_user', JSON.stringify(updatedUser));

    if (!isOffline) {
      try {
        await fetch(`${API_URL}/auth/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(settings)
        });
      } catch (err) {
        console.error('Error saving settings to backend:', err);
      }
    }
  };

  const handleUploadTimetable = async (type: 'json' | 'csv', data: string | any[], overwrite: boolean) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    if (isOffline) {
      // Direct parsing in Offline mode
      let parsed: Omit<Period, '_id'>[] = [];

      try {
        if (type === 'json') {
          parsed = Array.isArray(data) ? data : JSON.parse(data as string);
        } else {
          // Parse CSV
          const lines = (data as string).split(/\r?\n/).filter(l => l.trim() !== '');
          if (lines.length < 2) throw new Error('CSV is empty or missing headers');
          
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ''));
          const dayIdx = headers.indexOf('day');
          const subjectIdx = headers.indexOf('subject');
          const startIdx = headers.indexOf('starttime');
          const endIdx = headers.indexOf('endtime');
          const roomIdx = headers.indexOf('room');
          const teacherIdx = headers.indexOf('teacher');
          const colorIdx = headers.indexOf('color');

          if (dayIdx === -1 || subjectIdx === -1 || startIdx === -1 || endIdx === -1) {
            throw new Error('CSV must contain Day, Subject, Start Time, and End Time headers.');
          }

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < Math.max(dayIdx, subjectIdx, startIdx, endIdx) + 1) continue;

            parsed.push({
              day: cols[dayIdx],
              subject: cols[subjectIdx],
              startTime: cols[startIdx],
              endTime: cols[endIdx],
              room: roomIdx !== -1 ? cols[roomIdx] : '',
              teacher: teacherIdx !== -1 ? cols[teacherIdx] : '',
              color: colorIdx !== -1 && cols[colorIdx] ? cols[colorIdx] : '#3b82f6'
            });
          }
        }

        // Validate each item
        const formatted: Period[] = parsed.map((item, idx) => {
          // Capitalize Day
          const day = item.day.trim().charAt(0).toUpperCase() + item.day.trim().slice(1).toLowerCase();
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          if (!days.includes(day)) throw new Error(`Invalid Day: "${item.day}"`);

          let start = item.startTime.trim();
          let end = item.endTime.trim();
          if (/^\d:\d{2}$/.test(start)) start = '0' + start;
          if (/^\d:\d{2}$/.test(end)) end = '0' + end;

          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(start)) throw new Error(`Invalid start time: "${item.startTime}"`);
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(end)) throw new Error(`Invalid end time: "${item.endTime}"`);

          return {
            _id: `local-${Date.now()}-${idx}`,
            day,
            subject: item.subject.trim(),
            startTime: start,
            endTime: end,
            room: (item.room || '').trim(),
            teacher: (item.teacher || '').trim(),
            color: (item.color || '#3b82f6').trim()
          };
        });

        const newPeriods = overwrite ? formatted : [...periods, ...formatted];
        const sorted = newPeriods.sort((a, b) => a.startTime.localeCompare(b.startTime));
        setPeriods(sorted);
        localStorage.setItem(`periods_${user.email}`, JSON.stringify(sorted));
        return { success: true, count: formatted.length };

      } catch (err: any) {
        alert('Upload Error: ' + err.message);
        return { success: false, error: err.message };
      }
    } else {
      // Connect to online endpoint
      try {
        const response = await fetch(`${API_URL}/timetable/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ type, data, overwrite })
        });
        if (response.ok) {
          const result = await response.json();
          const fetchedResponse = await fetch(`${API_URL}/timetable`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (fetchedResponse.ok) {
            const freshData = await fetchedResponse.json();
            setPeriods(freshData);
          }
          return { success: true, count: result.count };
        } else {
          const errorData = await response.json();
          alert('Upload Failed: ' + errorData.message);
          return { success: false, error: errorData.message };
        }
      } catch (err: any) {
        console.error('Upload Error:', err);
        return { success: false, error: err.message };
      }
    }
  };

  return (
    <div className="app-root min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="glass-container m-4 px-6 py-4 flex items-center justify-between border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            timetable popup
          </h1>
        </div>

        <div className="flex items-center gap-4">

          {user && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`btn-glass p-2.5 rounded-xl border ${currentView === 'dashboard' ? 'bg-white/10 border-white/20' : 'border-white/5'}`}
                title="Timetable Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentView('profile')}
                className={`btn-glass p-2.5 rounded-xl border ${currentView === 'profile' ? 'bg-white/10 border-white/20' : 'border-white/5'}`}
                title="Settings & Alarms"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={handleLogout}
                className="btn-glass p-2.5 rounded-xl border border-white/5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/25"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-blue-400">
                {user.email.substring(0, 2).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-4 py-2">
        {isCheckingApi && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Synchronizing chronometers...</p>
          </div>
        )}

        {!isCheckingApi && (
          <>
            {currentView === 'auth' && (
              <Auth 
                onLogin={handleLogin} 
                isOffline={isOffline} 
                apiUrl={API_URL} 
              />
            )}
            
            {currentView === 'dashboard' && user && (
              <Dashboard 
                periods={periods}
                onAdd={handleAddPeriod}
                onUpdate={handleUpdatePeriod}
                onDelete={handleDeletePeriod}
                onUpload={handleUploadTimetable}
              />
            )}

            {currentView === 'profile' && user && (
              <Profile 
                settings={user.settings}
                onSaveSettings={handleUpdateSettings}
              />
            )}

            {/* Global Alarm Engine */}
            {user && (
              <AlarmEngine 
                periods={periods}
                settings={user.settings}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="py-6 text-center text-xs text-slate-600/80 mt-auto">
        <p>&copy; 2026 timetable popup. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
