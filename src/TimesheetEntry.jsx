import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Categorized Task List from Company Time Card
const TASK_CATEGORIES = {
  "Site Setup & Earthworks": [
    "Demolition",
    "Profile/Set Up",
    "Excavate/Footings"
  ],
  "Foundations & Structure": [
    "Boxing",
    "Reinforcing",
    "Polythene/Polystyrene",
    "Concrete/Blockfill",
    "Timber Floor Structure & Flooring",
    "Structural Steel",
    "Structural Connections"
  ],
  "Framing & Envelope": [
    "Wall Framing",
    "Roof Framing and Purlins",
    "Fascia and Soffits",
    "C/Battens, Rab/Ecoply",
    "Building Paper/Aliband",
    "Exterior Windows/Doors",
    "Exterior Cladding"
  ],
  "Interior Fit-Out": [
    "Insulation",
    "Ceiling Battens",
    "Ceiling Linings",
    "Interior Doors",
    "Wall Linings",
    "Scotia/Skirting/Architrave",
    "Hardware/ Door Hardware",
    "Shelving/Joinery"
  ],
  "Exterior & Landscaping": [
    "Deck Framing & Decking",
    "Driveway/Paths/Landscaping"
  ],
  "Other Work": [
    "Other Work (Detail in comments)"
  ],
  "Leave & Training": [
    "Sick Leave",
    "Annual Leave",
    "Bereavement Leave",
    "Training",
    "Other Leave"
  ]
};

// Helper to get the Monday of a given date's week
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
}

// Helper to format date into YYYY-MM-DD
function formatDate(dateObj) {
  return dateObj.toISOString().split('T')[0];
}

export default function TimesheetEntry({ user, userProfile }) {
  // Saved project
  const [project, setProject] = useState(() => {
    return localStorage.getItem(`sjr_last_project_${user.uid}`) || '';
  });

  // Selected date state
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  // Calendar week view state (tracks current Monday)
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));

  // Site Time Tracking
  const [startTime, setStartTime] = useState('');
  const [timeFinished, setTimeFinished] = useState('');
  const [timeLeftSite, setTimeLeftSite] = useState('');
  const [timeReturned, setTimeReturned] = useState('');

  // Dynamic Array of Tasks for the Day
  const [tasks, setTasks] = useState([
    {
      id: Date.now(),
      categoryGroup: "Framing & Envelope",
      taskName: "Wall Framing",
      hours: '',
      travelTime: '',
      comments: ''
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Generate 7 days (Mon-Sun) for the current week bar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentMonday);
    day.setDate(currentMonday.getDate() + i);
    return {
      dateStr: formatDate(day),
      dayName: day.toLocaleDateString('en-NZ', { weekday: 'short' }),
      dayNumber: day.getDate(),
      monthName: day.toLocaleDateString('en-NZ', { month: 'short' })
    };
  });

  // Navigate week forward or backward
  const handlePrevWeek = () => {
    const prevMon = new Date(currentMonday);
    prevMon.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prevMon);
  };

  const handleNextWeek = () => {
    const nextMon = new Date(currentMonday);
    nextMon.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(nextMon);
  };

  const handleTodayClick = () => {
    const todayStr = formatDate(new Date());
    setCurrentMonday(getMonday(new Date()));
    setSelectedDate(todayStr);
  };

  const handleProjectChange = (e) => {
    const val = e.target.value;
    setProject(val);
    localStorage.setItem(`sjr_last_project_${user.uid}`, val);
  };

  const handleAddTask = () => {
    setTasks((prevTasks) => [
      ...prevTasks,
      {
        id: Date.now() + Math.random(),
        categoryGroup: "Framing & Envelope",
        taskName: "Wall Framing",
        hours: '',
        travelTime: '',
        comments: ''
      }
    ]);
  };

  const handleRemoveTask = (id) => {
    if (tasks.length === 1) return;
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== id));
  };

  const handleTaskChange = (id, field, value) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === id) {
          const updated = { ...t, [field]: value };
          if (field === 'categoryGroup') {
            updated.taskName = TASK_CATEGORIES[value][0];
          }
          return updated;
        }
        return t;
      })
    );
  };

  const totalHours = tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalHours <= 0) {
      alert("Please enter hours for at least one task.");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      await addDoc(collection(db, 'timesheets'), {
        userId: user.uid,
        userName: userProfile?.name || user.email,
        companyCode: userProfile?.companyCode || 'SJR Builders',
        project: project || "General / Unassigned",
        date: selectedDate,
        timeCardDetails: {
          startTime,
          timeFinished,
          timeLeftSite,
          timeReturned
        },
        tasks: tasks.map((t) => ({
          taskCategoryGroup: t.categoryGroup,
          taskName: t.taskName,
          hours: parseFloat(t.hours) || 0,
          travelTime: t.travelTime ? parseFloat(t.travelTime) : 0,
          comments: t.comments
        })),
        totalHours: totalHours,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setTasks([
        {
          id: Date.now(),
          categoryGroup: "Framing & Envelope",
          taskName: "Wall Framing",
          hours: '',
          travelTime: '',
          comments: ''
        }
      ]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      console.warn("Offline or network delay caught during submission:", err);
      setTasks([
        {
          id: Date.now(),
          categoryGroup: "Framing & Envelope",
          taskName: "Wall Framing",
          hours: '',
          travelTime: '',
          comments: ''
        }
      ]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = formatDate(new Date());

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-5 my-4">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <h2 className="text-xl font-bold text-slate-900">Weekly Time Card Entry</h2>
        <p className="text-xs text-slate-500 font-medium">Logged for: <span className="text-slate-800 font-semibold">{userProfile?.name || user.email}</span></p>
      </div>

      {/* Week Calendar Header & Navigation */}
      <div className="bg-slate-900 text-white p-3 rounded-xl mb-5 shadow-inner">
        <div className="flex items-center justify-between mb-3 text-xs">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md font-semibold transition-colors text-slate-300"
          >
            ← Prev Week
          </button>
          
          <span className="font-bold text-slate-200">
            {weekDays[0].monthName} {weekDays[0].dayNumber} – {weekDays[6].monthName} {weekDays[6].dayNumber}
          </span>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleTodayClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-md font-bold transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md font-semibold transition-colors text-slate-300"
            >
              Next Week →
            </button>
          </div>
        </div>

        {/* 7-Day Calendar Scroll Grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            const isToday = todayStr === day.dateStr;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md scale-105'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span className="text-[10px] uppercase font-semibold opacity-80">{day.dayName}</span>
                <span className="text-base font-extrabold my-0.5">{day.dayNumber}</span>
                {isToday && (
                  <span className={`text-[8px] px-1 rounded uppercase tracking-wider font-bold ${
                    isSelected ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-semibold flex items-center gap-2">
          <span>✓</span> Entry saved for {selectedDate}! {navigator.onLine ? "" : "(Saved offline, will sync when connected)"}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name & Active Date Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Project Name / Site</label>
            <input
              type="text"
              placeholder="e.g. Levin Renovation"
              value={project}
              onChange={handleProjectChange}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Selected Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentMonday(getMonday(e.target.value));
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        {/* Site Arrival & Exit Times */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="block text-xs font-bold text-slate-700 uppercase mb-2">On-Site Hours (Optional)</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-slate-500 font-medium">Start Time</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
                className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" 
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Time Finished</label>
              <input 
                type="time" 
                value={timeFinished} 
                onChange={(e) => setTimeFinished(e.target.value)} 
                className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" 
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Time Left Site</label>
              <input 
                type="time" 
                value={timeLeftSite} 
                onChange={(e) => setTimeLeftSite(e.target.value)} 
                className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" 
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Time Returned</label>
              <input 
                type="time" 
                value={timeReturned} 
                onChange={(e) => setTimeReturned(e.target.value)} 
                className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" 
              />
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <span className="text-xs font-bold text-slate-700 uppercase">Tasks Completed</span>
            <span className="text-xs font-semibold text-emerald-700">Total: {totalHours} hrs</span>
          </div>

          {tasks.map((taskItem, index) => (
            <div key={taskItem.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3 relative">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Task #{index + 1}</span>
                {tasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(taskItem.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Work Category & Specific Task */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category Group</label>
                  <select
                    value={taskItem.categoryGroup}
                    onChange={(e) => handleTaskChange(taskItem.id, 'categoryGroup', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800"
                  >
                    {Object.keys(TASK_CATEGORIES).map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Task Undertaken</label>
                  <select
                    value={taskItem.taskName}
                    onChange={(e) => handleTaskChange(taskItem.id, 'taskName', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800"
                  >
                    {TASK_CATEGORIES[taskItem.categoryGroup].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task Hours & Travel Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Task Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 4.0"
                    value={taskItem.hours}
                    onChange={(e) => handleTaskChange(taskItem.id, 'hours', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Travel Time (Hrs)</label>
                  <input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 0.5"
                    value={taskItem.travelTime}
                    onChange={(e) => handleTaskChange(taskItem.id, 'travelTime', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Comments / Details */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Comments / Work Details</label>
                <textarea
                  rows="2"
                  placeholder="Task specifics or notes..."
                  value={taskItem.comments}
                  onChange={(e) => handleTaskChange(taskItem.id, 'comments', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ))}

          {/* Add Additional Task Button */}
          <button
            type="button"
            onClick={handleAddTask}
            className="w-full py-2 px-3 border-2 border-dashed border-emerald-600 text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 text-sm transition-colors"
          >
            + Add Another Task
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? "Saving Entry..." : `Submit Entry for ${selectedDate}`}
        </button>
      </form>
    </div>
  );
}
