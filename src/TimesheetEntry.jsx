import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDocsFromCache,
  serverTimestamp 
} from 'firebase/firestore';

// Categorized Task List
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

function getWednesday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day < 3 ? -4 : 3);
  return new Date(date.setDate(diff));
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function displayDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
}

function isFriday(dateStr) {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay() === 5;
}

const DEFAULT_BLANK_TASK = (dateStr) => {
  const isFri = isFriday(dateStr);
  return {
    id: Date.now() + Math.random(),
    categoryGroup: "Framing & Envelope",
    taskName: "Wall Framing",
    hours: isFri ? '8' : '9.25',
    travelTime: '',
    comments: ''
  };
};

export default function TimesheetEntry({ user, userProfile }) {
  const activeUser = user || userProfile;
  const userId = activeUser?.uid;
  const userName = userProfile?.name || activeUser?.name || activeUser?.email || 'Staff Member';

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [project, setProject] = useState(() => {
    if (userId) {
      return localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name') || '';
    }
    return localStorage.getItem('last_site_name') || '';
  });

  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));

  const [weeklyHours, setWeeklyHours] = useState(0);
  const [weekRangeStr, setWeekRangeStr] = useState('');
  const [loadingHours, setLoadingHours] = useState(true);

  const [startTime, setStartTime] = useState('07:00');
  const [timeFinished, setTimeFinished] = useState(() => isFriday(formatDate(new Date())) ? '15:30' : '16:30');
  const [timeLeftSite, setTimeLeftSite] = useState('');
  const [timeReturned, setTimeReturned] = useState('');

  const [tasks, setTasks] = useState(() => [DEFAULT_BLANK_TASK(formatDate(new Date()))]);

  const [loading, setLoading] = useState(false);
  const [fetchingDay, setFetchingDay] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Fetch weekly hours (handles cache seamlessly)
  const fetchStaffWeeklyHours = async () => {
    if (!userId) return;
    setLoadingHours(true);
    try {
      const currentWed = getWednesday(new Date());
      const currentTue = new Date(currentWed);
      currentTue.setDate(currentWed.getDate() + 6);

      setWeekRangeStr(`${formatDisplayDate(currentWed)} – ${formatDisplayDate(currentTue)}`);

      const q = query(
        collection(db, 'timesheets'),
        where('userId', '==', userId)
      );

      // Attempt getDocs; if network fails, persistentLocalCache fulfills from IndexedDB
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (e) {
        querySnapshot = await getDocsFromCache(q);
      }

      const validWeekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentWed);
        d.setDate(currentWed.getDate() + i);
        return formatDisplayDate(d);
      });

      let total = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (validWeekDates.includes(displayDate(data.date))) {
          total += parseFloat(data.totalHours) || 0;
        }
      });

      setWeeklyHours(total);
    } catch (err) {
      console.warn("Could not retrieve weekly hours:", err);
    } finally {
      setLoadingHours(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStaffWeeklyHours();
    }
  }, [userId]);

  // Load selected date entry with local cache fallback
  useEffect(() => {
    let isMounted = true;

    async function loadDayEntry() {
      if (!userId || !selectedDate) return;
      setFetchingDay(true);

      try {
        const q = query(
          collection(db, 'timesheets'),
          where('userId', '==', userId),
          where('date', '==', selectedDate)
        );

        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch {
          querySnapshot = await getDocsFromCache(q);
        }

        if (!isMounted) return;

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[querySnapshot.docs.length - 1].data();

          if (docData.project) setProject(docData.project);
          if (docData.timeCardDetails) {
            setStartTime(docData.timeCardDetails.startTime || '07:00');
            setTimeFinished(docData.timeCardDetails.timeFinished || (isFriday(selectedDate) ? '15:30' : '16:30'));
            setTimeLeftSite(docData.timeCardDetails.timeLeftSite || '');
            setTimeReturned(docData.timeCardDetails.timeReturned || '');
          }

          if (docData.tasks?.length > 0) {
            setTasks(
              docData.tasks.map((t) => ({
                id: Date.now() + Math.random(),
                categoryGroup: t.taskCategoryGroup || t.categoryGroup || "Framing & Envelope",
                taskName: t.taskName || t.category || "Wall Framing",
                hours: t.hours !== undefined ? String(t.hours) : (isFriday(selectedDate) ? '8' : '9.25'),
                travelTime: t.travelTime !== undefined ? String(t.travelTime) : '',
                comments: t.comments || ''
              }))
            );
          }
        } else {
          setStartTime('07:00');
          setTimeFinished(isFriday(selectedDate) ? '15:30' : '16:30');
          setTimeLeftSite('');
          setTimeReturned('');
          setTasks([DEFAULT_BLANK_TASK(selectedDate)]);
        }
      } catch (err) {
        console.warn("Cache load note:", err);
      } finally {
        if (isMounted) setFetchingDay(false);
      }
    }

    loadDayEntry();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, userId]);

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

  const totalHours = tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (totalHours <= 0) {
      alert("Please enter valid task hours before submitting.");
      return;
    }

    setLoading(true);

    const payload = {
      userId,
      userName,
      companyCode: userProfile?.companyCode || 'SJR Builders',
      project: project || "General / Unassigned",
      date: selectedDate,
      timeCardDetails: { startTime, timeFinished, timeLeftSite, timeReturned },
      tasks: tasks.map((t) => ({
        taskCategoryGroup: t.categoryGroup,
        taskName: t.taskName,
        hours: parseFloat(t.hours) || 0,
        travelTime: t.travelTime ? parseFloat(t.travelTime) : 0,
        comments: t.comments
      })),
      totalHours,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    try {
      // With persistentLocalCache, addDoc resolves locally instantly when offline
      await addDoc(collection(db, 'timesheets'), payload);

      setWeeklyHours((prev) => prev + totalHours);

      setStatusMessage({
        type: 'success',
        text: isOnline
          ? `Entry saved for ${displayDate(selectedDate)}!`
          : `Saved locally! Will sync automatically when back online.`
      });

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Submission error:", err);
      setStatusMessage({
        type: 'error',
        text: "Could not write entry locally. Check storage settings."
      });
    } finally {
      setLoading(false);
    }
  };

  const todayStr = formatDate(new Date());

  return (
    <div className="max-w-xl mx-auto space-y-4 my-4">
      {/* Network Connection Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-between shadow">
          <span>⚡ Working Offline</span>
          <span className="font-medium text-[11px]">Saved locally & auto-syncs when online</span>
        </div>
      )}

      {/* Weekly Hours Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm border border-slate-800 flex justify-between items-center">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            This Week's Total Hours
          </span>
          <span className="text-xs text-slate-300 font-medium mt-0.5 block">
            {weekRangeStr || "Current Pay Week"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-emerald-400">
            {loadingHours ? "..." : `${weeklyHours} hrs`}
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="border-b border-slate-200 pb-3 mb-4">
          <h2 className="text-xl font-bold text-slate-900">Weekly Time Card Entry</h2>
          <p className="text-xs text-slate-500 font-medium">
            Logged for: <span className="text-slate-800 font-semibold">{userName}</span>
          </p>
        </div>

        {/* 7-Day Navigation */}
        <div className="bg-slate-900 text-white p-3 rounded-xl mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs">
            <button
              type="button"
              onClick={() => {
                const p = new Date(currentMonday);
                p.setDate(p.getDate() - 7);
                setCurrentMonday(p);
              }}
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
                onClick={() => {
                  setCurrentMonday(getMonday(new Date()));
                  setSelectedDate(todayStr);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-md font-bold transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = new Date(currentMonday);
                  n.setDate(n.getDate() + 7);
                  setCurrentMonday(n);
                }}
                className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md font-semibold transition-colors text-slate-300"
              >
                Next Week →
              </button>
            </div>
          </div>

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

        {fetchingDay && (
          <div className="text-center py-2 text-xs font-semibold text-slate-500 animate-pulse">
            Loading entry for {displayDate(selectedDate)}...
          </div>
        )}

        {statusMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            <span>{statusMessage.type === 'error' ? '⚠️' : '✓'}</span> {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Project Name / Site
              </label>
              <input
                type="text"
                placeholder="e.g. Levin Renovation"
                value={project}
                onChange={(e) => {
                  const val = e.target.value;
                  setProject(val);
                  if (userId) localStorage.setItem(`sjr_last_project_${userId}`, val);
                  localStorage.setItem('last_site_name', val);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Selected Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setCurrentMonday(getMonday(e.target.value));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* On-Site Hours */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="block text-xs font-bold text-slate-700 uppercase mb-2">On-Site Hours (Optional)</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-500 font-medium">Start Time</label>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium" 
                />
              </div>
              <div>
                <label className="text-slate-500 font-medium">Time Finished</label>
                <input 
                  type="time" 
                  value={timeFinished} 
                  onChange={(e) => setTimeFinished(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium" 
                />
              </div>
              <div>
                <label className="text-slate-500 font-medium">Time Left Site</label>
                <input 
                  type="time" 
                  value={timeLeftSite} 
                  onChange={(e) => setTimeLeftSite(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium" 
                />
              </div>
              <div>
                <label className="text-slate-500 font-medium">Time Returned</label>
                <input 
                  type="time" 
                  value={timeReturned} 
                  onChange={(e) => setTimeReturned(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium" 
                />
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="text-xs font-bold text-slate-700 uppercase">Tasks Completed</span>
              <span className="text-xs font-semibold text-emerald-700">Total: {totalHours} hrs</span>
            </div>

            {tasks.map((taskItem, index) => (
              <div key={taskItem.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Task #{index + 1}</span>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTasks((prev) => prev.filter((t) => t.id !== taskItem.id))}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category Group</label>
                    <select
                      value={taskItem.categoryGroup}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTasks((prev) => prev.map((t) => t.id === taskItem.id ? {
                          ...t,
                          categoryGroup: val,
                          taskName: TASK_CATEGORIES[val][0]
                        } : t));
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setTasks((prev) => prev.map((t) => t.id === taskItem.id ? { ...t, taskName: val } : t));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800"
                    >
                      {TASK_CATEGORIES[taskItem.categoryGroup]?.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      )) || <option value={taskItem.taskName}>{taskItem.taskName}</option>}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Task Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      value={taskItem.hours}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTasks((prev) => prev.map((t) => t.id === taskItem.id ? { ...t, hours: val } : t));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Travel Time (Hrs)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={taskItem.travelTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTasks((prev) => prev.map((t) => t.id === taskItem.id ? { ...t, travelTime: val } : t));
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Comments / Work Details</label>
                  <textarea
                    rows="2"
                    value={taskItem.comments}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTasks((prev) => prev.map((t) => t.id === taskItem.id ? { ...t, comments: val } : t));
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setTasks((prev) => [...prev, {
                id: Date.now() + Math.random(),
                categoryGroup: "Framing & Envelope",
                taskName: "Wall Framing",
                hours: '0',
                travelTime: '',
                comments: ''
              }])}
              className="w-full py-2 px-3 border-2 border-dashed border-emerald-600 text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 text-sm transition-colors"
            >
              + Add Another Task
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50 mt-4 cursor-pointer"
          >
            {loading ? "Saving Entry..." : `Submit Entry for ${displayDate(selectedDate)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
 
