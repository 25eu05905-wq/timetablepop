import { useState, useRef } from 'react';
import { UserSettings } from '../App';
import { Bell, Music, Save, Volume2, Clock } from 'lucide-react';

interface ProfileProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => Promise<void>;
}

export default function Profile({ settings, onSaveSettings }: ProfileProps) {
  const [ringtone, setRingtone] = useState(settings.ringtone);
  const [alarmOffset, setAlarmOffset] = useState(settings.alarmOffset);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Web Audio Context reference for sampling
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewOscsRef = useRef<OscillatorNode[]>([]);

  const stopPreview = () => {
    previewOscsRef.current.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    previewOscsRef.current = [];
    setIsPlayingPreview(false);
  };

  const playPreview = (selectedTone: string) => {
    stopPreview();
    setIsPlayingPreview(true);

    if (!previewCtxRef.current) {
      previewCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = previewCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (selectedTone === 'classic-chime') {
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
        previewOscsRef.current.push(osc);
      });
      setTimeout(() => setIsPlayingPreview(false), 1200);
    } 
    
    else if (selectedTone === 'space-sweep') {
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
      previewOscsRef.current.push(osc);
      setTimeout(() => setIsPlayingPreview(false), 1000);
    } 
    
    else if (selectedTone === 'retro-beep') {
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
        previewOscsRef.current.push(osc);
      });
      setTimeout(() => setIsPlayingPreview(false), 800);
    } 
    
    else if (selectedTone === 'digital-echo') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = ctx.createDelay();
      const feedback = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      delay.delayTime.value = 0.25;
      feedback.gain.value = 0.4;

      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
      previewOscsRef.current.push(osc);
      setTimeout(() => setIsPlayingPreview(false), 1500);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        ringtone,
        alarmOffset: Number(alarmOffset)
      });
      alert('Chrono settings synchronized successfully!');
    } catch (err) {
      alert('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <div className="glass-container border border-white/5 shadow-3xl rounded-3xl p-8 bg-slate-900/60 backdrop-blur-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Chrono Settings</h2>
            <p className="text-sm text-slate-400">Configure alarm warnings and chime melodies.</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* Ringtone Selection */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-4 flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-400" />
              <span>Synthesizer Chime Melody</span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'classic-chime', name: 'Classic Chime', desc: 'Warm melodic triangle progression' },
                { id: 'space-sweep', name: 'Space Sweep', desc: 'Retro sci-fi oscillator wave' },
                { id: 'retro-beep', name: 'Retro Beep', desc: 'Urgent vintage square chime' },
                { id: 'digital-echo', name: 'Digital Echo', desc: 'Sine beep with analog delay feedback' }
              ].map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setRingtone(item.id)}
                  className={`border p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    ringtone === item.id 
                      ? 'bg-purple-500/10 border-purple-500/50 shadow-md shadow-purple-500/5' 
                      : 'bg-black/20 border-white/5 hover:bg-black/30 hover:border-white/15'
                  }`}
                >
                  <p className="font-semibold text-white mb-1 text-sm">{item.name}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => playPreview(ringtone)}
                disabled={isPlayingPreview}
                className="btn-glass px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 text-purple-400 hover:text-purple-300 border-purple-500/25 hover:border-purple-500/40"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isPlayingPreview ? 'Synthesizing...' : 'Preview Sound'}</span>
              </button>
            </div>
          </div>

          {/* Alarm Warning Offset */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Alarm Warning Offset</span>
            </label>

            <div className="flex gap-4">
              {[
                { val: 0, label: 'On Time' },
                { val: 5, label: '5 Mins Before' },
                { val: 10, label: '10 Mins Before' },
                { val: 15, label: '15 Mins Before' }
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setAlarmOffset(item.val)}
                  className={`flex-1 py-3 px-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    alarmOffset === item.val
                      ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-md shadow-rose-500/5'
                      : 'bg-black/20 border-white/5 hover:bg-black/30 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              timetable popup will ping notifications and start playing your selected chime exactly {alarmOffset === 0 ? 'at the class starting time' : `${alarmOffset} minutes before the class begins`}.
            </p>
          </div>

          {/* Action Trigger Buttons */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-glass btn-primary-glow py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mt-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Updating Alarm Nodes...' : 'Synchronize Alarm Config'}</span>
          </button>

        </div>
      </div>
    </div>
  );
}
