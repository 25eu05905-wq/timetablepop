import React, { useState } from 'react';
import { Period } from '../App';
import { Search, Plus, Upload, Download, Trash2, X, FileJson, FileSpreadsheet, Sparkles, ArrowRight, Edit } from 'lucide-react';

interface DashboardProps {
  periods: Period[];
  onAdd: (period: Omit<Period, '_id'>) => Promise<void>;
  onUpdate: (id: string, period: Partial<Period>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpload: (type: 'json' | 'csv', data: string | any[], overwrite: boolean) => Promise<{ success: boolean; count?: number; error?: string }>;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const COLOR_PRESETS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' }
];

export default function Dashboard({ periods, onAdd, onUpdate, onDelete, onUpload }: DashboardProps) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);

  // Form states
  const [formSubject, setFormSubject] = useState('');
  const [formDay, setFormDay] = useState('Monday');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:30');
  const [formRoom, setFormRoom] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');

  // Upload state
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  // Get active day highlight
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 Sunday, 1 Monday...
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysMap[currentDayIndex];

  // Search filter logic
  const filteredPeriods = periods.filter((period) => {
    const term = search.toLowerCase();
    return (
      period.subject.toLowerCase().includes(term) ||
      (period.room && period.room.toLowerCase().includes(term)) ||
      (period.teacher && period.teacher.toLowerCase().includes(term)) ||
      period.day.toLowerCase().includes(term)
    );
  });

  // Check if a period fits in a specific cell
  const getPeriodsForCell = (day: string, slot: string) => {
    const slotHour = parseInt(slot.split(':')[0]);
    return filteredPeriods.filter((period) => {
      if (period.day !== day) return false;
      const periodHour = parseInt(period.startTime.split(':')[0]);
      return periodHour === slotHour;
    });
  };

  const openAddModal = () => {
    setEditingPeriod(null);
    setFormSubject('');
    setFormDay('Monday');
    setFormStart('09:00');
    setFormEnd('10:30');
    setFormRoom('');
    setFormTeacher('');
    setFormColor('#3b82f6');
    setIsModalOpen(true);
  };

  const openEditModal = (period: Period) => {
    setEditingPeriod(period);
    setFormSubject(period.subject);
    setFormDay(period.day);
    setFormStart(period.startTime);
    setFormEnd(period.endTime);
    setFormRoom(period.room || '');
    setFormTeacher(period.teacher || '');
    setFormColor(period.color || '#3b82f6');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject || !formStart || !formEnd) {
      alert('Required fields must be completed.');
      return;
    }

    const payload = {
      day: formDay,
      subject: formSubject,
      startTime: formStart,
      endTime: formEnd,
      room: formRoom,
      teacher: formTeacher,
      color: formColor
    };

    if (editingPeriod) {
      await onUpdate(editingPeriod._id, payload);
    } else {
      await onAdd(payload);
    }
    setIsModalOpen(false);
  };

  // 3D Tilt Card animation logic
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, color: string) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;

    const degX = -(y / (box.height / 2)) * 12;
    const degY = (x / (box.width / 2)) * 12;

    card.style.setProperty('--rx', `${degX}deg`);
    card.style.setProperty('--ry', `${degY}deg`);

    // Dynamic color glowing background on tilt
    const rgb = hexToRgb(color || '#3b82f6');
    if (rgb) {
      card.style.setProperty('--card-glow-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Upload JSON/CSV handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension !== 'json' && extension !== 'csv') {
      alert('Invalid file format. Upload JSON or CSV.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const type = extension === 'json' ? 'json' : 'csv';
      const response = await onUpload(type, text, overwriteExisting);
      if (response.success) {
        alert(`Successfully imported ${response.count} schedules!`);
      }
    };
    reader.readAsText(file);
  };

  // Downloads actual loaded timetable or template if empty
  const downloadJSONTemplate = () => {
    let data;
    if (periods && periods.length > 0) {
      // Export current periods (remove internal _id so it can be re-uploaded cleanly)
      data = periods.map(({ _id, ...rest }) => rest);
    } else {
      data = [
        {
          day: 'Monday',
          subject: 'Course Title',
          startTime: '09:00',
          endTime: '10:30',
          room: 'Building A Room 101',
          teacher: 'Dr. Johnson',
          color: '#8b5cf6'
        },
        {
          day: 'Wednesday',
          subject: 'Laboratory Exercise',
          startTime: '14:00',
          endTime: '16:00',
          room: 'Lab Room 2',
          teacher: 'Prof. Miller',
          color: '#06b6d4'
        }
      ];
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', periods && periods.length > 0 ? 'my_timetable.json' : 'timetable_template.json');
    dlAnchor.click();
  };

  const downloadCSVTemplate = () => {
    let csvContent = 'Day,Subject,Start Time,End Time,Room,Teacher,Color\n';
    
    if (periods && periods.length > 0) {
      csvContent += periods.map(p => {
        const cleanSubject = (p.subject || '').replace(/"/g, '""');
        const cleanRoom = (p.room || '').replace(/"/g, '""');
        const cleanTeacher = (p.teacher || '').replace(/"/g, '""');
        return `"${p.day}","${cleanSubject}","${p.startTime}","${p.endTime}","${cleanRoom}","${cleanTeacher}","${p.color || '#3b82f6'}"`;
      }).join('\n');
    } else {
      csvContent += 
        'Monday,Course Title,09:00,10:30,Building A Room 101,Dr. Johnson,#8b5cf6\n' +
        'Wednesday,Laboratory Exercise,14:00,16:00,Lab Room 2,Prof. Miller,#06b6d4';
    }

    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', periods && periods.length > 0 ? 'my_timetable.csv' : 'timetable_template.csv');
    dlAnchor.click();
  };

  return (
    <div className="w-full max-w-7xl px-4 flex flex-col gap-6">
      
      {/* Search and Action bar */}
      <section className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl glass-container border border-white/5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search subjects, rooms, or teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-glass pl-11 py-2.5"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={openAddModal}
            className="btn-glass btn-primary-glow flex-grow md:flex-grow-0 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Class</span>
          </button>
        </div>
      </section>

      {/* Main schedule layout */}
      <section className="glass-container border border-white/5 shadow-2xl rounded-2xl overflow-hidden bg-slate-900/30">
        <div className="horizontal-scroll-container">
          <div className="timetable-grid-container min-w-[900px] p-4">
            
            {/* Grid Header days of the week */}
            <div className="timetable-header">
              <div className="day-header-cell text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center justify-center">
                Time
              </div>
              {DAYS.map((day) => (
                <div 
                  key={day}
                  className={`day-header-cell ${todayName === day ? 'active-day text-blue-400 font-bold' : 'text-slate-300'}`}
                >
                  <p>{day}</p>
                  {todayName === day && (
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 block">Today</span>
                  )}
                </div>
              ))}
            </div>

            {/* Timetable slots */}
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="timetable-row">
                {/* Time Indicator column */}
                <div className="timeline-cell">
                  {slot}
                </div>

                {/* Day schedules cells */}
                {DAYS.map((day) => {
                  const cellPeriods = getPeriodsForCell(day, slot);

                  return (
                    <div key={`${day}-${slot}`} className="grid-cell p-2 flex flex-col gap-2 justify-center">
                      {cellPeriods.map((period) => (
                        <div
                          key={period._id}
                          onMouseMove={(e) => handleMouseMove(e, period.color || '#3b82f6')}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            borderLeft: `4px solid ${period.color || '#3b82f6'}`,
                          }}
                          className="tilt-card-3d glass-container p-2.5 rounded-lg cursor-pointer bg-slate-950/60 border border-white/5 relative flex flex-col justify-between"
                          onClick={() => openEditModal(period)}
                        >
                          <div className="pop-out-3d">
                            <h4 className="text-xs font-bold text-white tracking-tight line-clamp-1 mb-1" style={{ textShadow: `0 0 8px ${period.color}33` }}>
                              {period.subject}
                            </h4>
                            {period.room && (
                              <p className="text-[10px] text-slate-400 font-medium line-clamp-1">
                                🏠 {period.room}
                              </p>
                            )}
                            {period.teacher && (
                              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                👤 {period.teacher}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/5">
                            <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                              ⏰ {period.startTime}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(period);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                title="Edit class"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this period?')) {
                                    onDelete(period._id);
                                  }
                                }}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete class"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* Batch timetable Uploader section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        {/* Upload space */}
        <div className="glass-container border border-white/5 bg-slate-900/40 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              <span>Import Timetable Data</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Upload class schedules via JSON or CSV. Existing records can either be preserved (appended) or fully overwritten.
            </p>

            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="overwrite-check"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded border-slate-700 bg-black/40 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="overwrite-check" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Overwrite Existing Timetable
                </label>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/5' 
                  : 'border-white/10 bg-black/20 hover:bg-black/35 hover:border-white/20'
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                accept=".json,.csv"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400">
                  <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Drag & drop files here</p>
                  <p className="text-xs text-slate-500 mt-1">Accepts raw JSON (.json) and CSV (.csv)</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Template Downloads */}
        <div className="glass-container border border-white/5 bg-slate-900/40 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-400" />
              <span>Timetable Format Templates</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Ensure files are formatted correctly by reviewing and downloading sample imports.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={downloadJSONTemplate}
                className="btn-glass p-4 rounded-xl flex items-center justify-between border-white/5 hover:border-blue-500/30 bg-black/20 text-left transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <FileJson className="w-8 h-8 text-blue-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Download JSON Template</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Compatible with standard structured objects</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 hover:text-white transition-colors" />
              </button>

              <button
                onClick={downloadCSVTemplate}
                className="btn-glass p-4 rounded-xl flex items-center justify-between border-white/5 hover:border-purple-500/30 bg-black/20 text-left transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-purple-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Download CSV Template</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Comma-separated tabular spreadsheet file</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CRUD Add/Edit Glass Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-container w-full max-w-md p-6 bg-slate-900 border border-white/10 rounded-2xl relative shadow-3xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6">
              {editingPeriod ? 'Modify Class Schedule' : 'Schedule New Class'}
            </h3>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Day of Week</label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value)}
                  className="input-glass"
                >
                  {DAYS.map(d => (
                    <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced AI Development"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Start Time (24h)</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="input-glass"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">End Time (24h)</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="input-glass"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Room / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Lab 3A"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="input-glass"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Teacher</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Roberts"
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                    className="input-glass"
                  />
                </div>
              </div>

              {/* Color selectors */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Accent Theme Color</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormColor(p.value)}
                      style={{ backgroundColor: p.value }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform duration-100 ${
                        formColor === p.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-glass btn-primary-glow font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2"
              >
                <span>{editingPeriod ? 'Sync Updates' : 'Add Class'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
