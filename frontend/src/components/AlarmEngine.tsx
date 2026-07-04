import { useState, useEffect, useRef } from 'react';
import { Period, UserSettings } from '../App';
import { Bell, X, Volume2, VolumeX } from 'lucide-react';

interface AlarmEngineProps {
  periods: Period[];
  settings: UserSettings;
}

export default function AlarmEngine({ periods, settings }: AlarmEngineProps) {
  const [activeAlarm, setActiveAlarm] = useState<Period | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  
  // Track triggered alarms to prevent double triggers in the same minute
  // Store key: periodId + DateString
  const triggeredAlarms = useRef<Set<string>>(new Set());

  // Web Audio Context & Nodes refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<any>(null); // For looping tones
  const currentOscillators = useRef<OscillatorNode[]>([]);

  // Initialize notifications on load
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
    }
  };

  // Web Audio API Synthesizers
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
  };

  const stopSynthesizedSound = () => {
    if (audioIntervalRef.current) {
      window.clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    
    // Stop and close all active nodes
    currentOscillators.current.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    currentOscillators.current = [];
  };

  const playSynthesizedSound = (ringtone: string) => {
    stopSynthesizedSound();
    initAudio();

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const playTone = () => {
      const now = ctx.currentTime;

      if (ringtone === 'classic-chime') {
        // C5 -> E5 -> G5 -> C6 chime
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);

          gain.gain.setValueAtTime(0, now + i * 0.15);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.6);

          currentOscillators.current.push(osc);
        });
      } else if (ringtone === 'space-sweep') {
        // Sci-fi spaceship alarm sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.45);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.9);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.9);

        currentOscillators.current.push(osc);
      } else if (ringtone === 'retro-beep') {
        // High urgency retro computer beep
        const freqs = [880, 880, 880];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.2);

          gain.gain.setValueAtTime(0, now + i * 0.2);
          gain.gain.linearRampToValueAtTime(0.1, now + i * 0.2 + 0.02);
          gain.gain.setValueAtTime(0.1, now + i * 0.2 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.2 + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.2);
          osc.stop(now + i * 0.2 + 0.15);

          currentOscillators.current.push(osc);
        });
      } else if (ringtone === 'digital-echo') {
        // Pluck synthesizer with simulated echo delay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = ctx.createDelay();
        const feedback = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

        delay.delayTime.value = 0.25;
        feedback.gain.value = 0.4;

        osc.connect(gain);
        gain.connect(ctx.destination); // Direct sound

        // Wire delay path
        gain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(ctx.destination); // Echo path

        osc.start(now);
        osc.stop(now + 1.2);

        currentOscillators.current.push(osc);
      }
    };

    // Play once immediately
    playTone();

    // Loop interval: play every 1.5 seconds for chime/sweeps
    audioIntervalRef.current = window.setInterval(playTone, 1500);
  };

  // Schedule Engine Core
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentDayIndex = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = days[currentDayIndex];

      const curHour = now.getHours();
      const curMin = now.getMinutes();
      const currentTotalMinutes = curHour * 60 + curMin;

      const dateStr = now.toDateString(); // "Sat Jul 04 2026"

      periods.forEach((period) => {
        // Verify Day Match
        if (period.day !== currentDayName) return;

        // Parse class start time "HH:MM"
        const [startHour, startMin] = period.startTime.split(':').map(Number);
        const periodTotalMinutes = startHour * 60 + startMin;

        // Calculate offset difference
        const diff = periodTotalMinutes - currentTotalMinutes;

        // Check if matching target alarm trigger minute
        if (diff === settings.alarmOffset) {
          const triggerKey = `${period._id}-${dateStr}`;

          if (!triggeredAlarms.current.has(triggerKey)) {
            triggeredAlarms.current.add(triggerKey);
            triggerAlarm(period);
          }
        }
      });
    };

    // Run every 10 seconds to ensure we do not miss a minute transition
    const interval = setInterval(checkSchedule, 10000);
    checkSchedule(); // Check immediately on mount/update

    return () => clearInterval(interval);
  }, [periods, settings]);

  const triggerAlarm = (period: Period) => {
    setActiveAlarm(period);
    
    // Play sound if AudioContext is initialized
    if (audioEnabled) {
      playSynthesizedSound(settings.ringtone);
    }

    // Trigger Native Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Class Starts in ${settings.alarmOffset} Mins!`, {
        body: `${period.subject} is starting at ${period.startTime} in Room ${period.room || 'N/A'}.`,
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2"%3E%3Cpath d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/%3E%3Cpath d="M13.73 21a2 2 0 0 1-3.46 0"/%3E%3C/svg%3E',
        tag: period._id
      });
    }
  };

  const handleDismiss = () => {
    stopSynthesizedSound();
    setActiveAlarm(null);
  };

  return (
    <>
      {/* Interactive Permission / Initialization banner */}
      {!audioEnabled && (
        <div className="fixed bottom-6 left-6 z-50 glass-container px-5 py-4 border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs flex items-center justify-between gap-6 shadow-2xl rounded-2xl max-w-sm">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-blue-400 animate-bounce" />
            <div>
              <p className="font-semibold text-white mb-0.5">Initialize Chime Synthesizers</p>
              <p className="opacity-80">Click to permit audio synthesis for pre-class chimes.</p>
            </div>
          </div>
          <button 
            onClick={initAudio}
            className="btn-glass px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 border-none font-bold rounded-lg shrink-0 shadow-lg shadow-blue-500/20"
          >
            Activate
          </button>
        </div>
      )}

      {/* Push Notification prompt if permission default */}
      {permissionStatus === 'default' && (
        <div className="fixed bottom-6 right-6 z-50 glass-container px-5 py-4 border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs flex items-center justify-between gap-6 shadow-2xl rounded-2xl max-w-sm">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-purple-400 animate-pulse" />
            <div>
              <p className="font-semibold text-white mb-0.5">Enable Alerts</p>
              <p className="opacity-80">Receive notifications 5–10 mins before classes start.</p>
            </div>
          </div>
          <button 
            onClick={requestNotificationPermission}
            className="btn-glass px-3 py-1.5 text-xs bg-purple-500 hover:bg-purple-600 border-none font-bold rounded-lg shrink-0 shadow-lg shadow-purple-500/20"
          >
            Authorize
          </button>
        </div>
      )}

      {/* Full Screen Glowing Alarm Overlay */}
      {activeAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="glass-container w-full max-w-lg p-8 border-rose-500/20 bg-rose-500/5 text-center flex flex-col items-center shadow-[0_0_50px_rgba(244,63,94,0.15)] relative float-animate rounded-3xl">
            
            <div className="absolute top-4 right-4">
              <button 
                onClick={handleDismiss}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/15">
              <Bell className="w-10 h-10 text-rose-500 animate-swing" />
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-rose-400 mb-2">
              Class Commencing Soon!
            </h2>
            <p className="text-sm text-slate-400 mb-6 uppercase tracking-wider font-semibold">
              Warning Chime Triggered
            </p>

            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Subject</p>
              <h3 className="text-2xl font-bold text-white mb-4" style={{ textShadow: `0 0 10px ${activeAlarm.color || '#3b82f6'}` }}>
                {activeAlarm.subject}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-0.5">Location / Room</p>
                  <p className="text-slate-200 font-semibold">{activeAlarm.room || 'Online / Remote'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-0.5">Teacher</p>
                  <p className="text-slate-200 font-semibold">{activeAlarm.teacher || 'Unspecified'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-0.5">Start Time</p>
                  <p className="text-slate-200 font-bold text-lg">{activeAlarm.startTime}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-0.5">End Time</p>
                  <p className="text-slate-200 font-bold text-lg">{activeAlarm.endTime}</p>
                </div>
              </div>
            </div>

            {/* Audio Visualizer Waves */}
            {audioEnabled && (
              <div className="flex items-end justify-center gap-1.5 h-8 mb-6">
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
                <span className="visualizer-bar"></span>
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="btn-glass bg-rose-500 hover:bg-rose-600 border-none font-bold text-white w-full py-4 text-lg rounded-2xl shadow-lg shadow-rose-500/20 flex items-center justify-center gap-3 transition-transform duration-200 active:scale-95"
            >
              <VolumeX className="w-5 h-5" />
              <span>Dismiss Alarm Notification</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
