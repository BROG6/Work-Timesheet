import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

// Helper to get Wednesday of the current pay week (Wed - Tue)
function getWednesday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sun, 1 is Mon, 3 is Wed
  const diff = date.getDate() - day + (day < 3 ? -4 : 3);
  return new Date(date.setDate(diff));
}

// Helper to format date into DD/MM/YYYY
function formatDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to convert stored YYYY-MM-DD strings to DD/MM/YYYY
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

const CATEGORIES_LIST = [
  "Demolition",
  "Profile/Set Up",
  "Excavate/Footings",
  "Boxing",
  "Reinforcing",
  "Polythene/Polystyrene",
  "Concrete/Blockfill",
  "Timber Floor Structure & Flooring",
  "Structural Steel",
  "Structural Connections",
  "Wall Framing",
  "Roof Framing and Purlins",
  "Fascia and Soffits",
  "C/Battens, Rab/Ecoply",
  "Building Paper/Aliband",
  "Exterior Windows/Doors",
  "Exterior Cladding",
  "Insulation",
  "Ceiling Battens",
  "Ceiling Linings",
  "Interior Doors",
  "Wall Linings",
  "Scotia/Skirting/Architrave",
  "Hardware/ Door Hardware",
  "Shelving/Joinery",
  "Deck Framing & Decking",
  "Driveway/Paths/Landscaping",
  "Other (PTO)",
  "Sick Leave",
  "Annual Leave",
  "Bereavement Leave",
  "Training",
  "Other Leave (please specify)"
];

export default function TimesheetEntry({ userProfile }) {
  // Weekly Hours State
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [weekRangeStr, setWeekRangeStr] = useState('');
  const [loadingHours, setLoadingHours] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State with persistent project/site name via localStorage
  const [entryDate, setEntryDate] = useState(() => formatDate(new Date()));
  const [projectName, setProjectName] = useState(() => {
    return localStorage.getItem('last_site_name') || '';
  });
  const [startTime, setStartTime] = useState('');
  const [timeLeftSite, setTimeLeftSite] = useState('');
  const [timeReturned, setTimeReturned] = useState('');
  const [timeFinished, setTimeFinished] = useState('');

  // Task rows with Category selection
  const [tasks, setTasks] = useState([
    { category: CATEGORIES_LIST[0], hours: '', travelTime: '', comments: '' }
  ]);

  // Persist project/site name whenever changed
  useEffect(() => {
    localStorage.setItem('last_site_name', projectName);
  }, [projectName]);

  // Fetch weekly hours on mount / user session load
  useEffect(() => {
    if (userProfile?.uid) {
      fetchStaffWeeklyHours();
    }
  }, [userProfile]);

  const fetchStaffWeeklyHours = async () => {
    setLoadingHours(true);
    try {
      const currentWed = getWednesday(new Date());
      const currentTue = new Date(currentWed);
      currentTue.setDate(currentWed.getDate() + 6);

      const weekStart = formatDate(currentWed);
      const weekEnd = formatDate(currentTue);
      setWeekRangeStr(`${weekStart} – ${weekEnd}`);

      const q = query(
        collection(db, 'timesheets'),
        where('userId', '==', userProfile.uid)
      );

      const querySnapshot = await getDocs(q);

      const validWeekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentWed);
        d.setDate(currentWed.getDate() + i);
        return formatDate(d);
      });

      let total = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const formattedDate = displayDate(data.date);

        if (validWeekDates.includes(formattedDate)) {
          total += parseFloat(data.totalHours) || 0;
        }
      });

      setWeeklyHours(total);
    } catch (err) {
      console.error("Error calculating weekly hours:", err);
    } finally {
      setLoadingHours(false);
    }
  };

  const handleAddTask = () => {
    setTasks((prev) => [
      ...prev,
      { category: CATEGORIES_LIST[0], hours: '', travelTime: '', comments: '' }
    ]);
  };

  const handleRemoveTask = (index) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTaskChange = (index, field, value) => {
    setTasks((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userProfile?.uid) {
      alert("User session not found. Please log in again.");
      return;
    }

    const calculatedTotalHours = tasks.reduce(
      (sum, task) => sum + (parseFloat(task.hours) || 0),
      0
    );

    if (calculatedTotalHours <= 0) {
      alert("Please log at least some task hours before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        userId: userProfile.uid,
        userName: userProfile.name || userProfile.email || 'Staff Member',
        date: entryDate,
        project: projectName || 'General / Unassigned',
        totalHours: calculatedTotalHours,
        status: 'pending',
        createdAt: new Date().toISOString(),
        timeCardDetails: {
          startTime,
          timeLeftSite,
          timeReturned,
          timeFinished
        },
        tasks: tasks.map(task => ({
          ...task,
          taskCategoryGroup: task.category // Maps category for manager dashboard compatibility
        }))
      };

      await addDoc(collection(db, 'timesheets'), payload);
      alert("Timesheet submitted successfully!");

      // Reset form fields (retaining persistent site name)
      setStartTime('');
      setTimeLeftSite('');
      setTimeReturned('');
      setTimeFinished('');
      setTasks([{ category: CATEGORIES_LIST[0], hours: '', travelTime: '', comments: '' }]);

      // Refresh weekly total
      fetchStaffWeeklyHours();
    } catch (err) {
      console.error("Error submitting timesheet:", err);
      alert("Failed to submit timesheet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* WEEKLY HOURS TOTAL BANNER */}
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

      {/* TIMESHEET ENTRY FORM */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Timesheet Entry</h2>
          <p className="text-xs text-slate-500 font-medium">Log your daily hours, site details, and tasks below.</p>
        </div>

        {/* Date & Persistent Site Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date (DD/MM/YYYY)</label>
            <input
              type="text"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Site / Project Name <span className="text-[10px] text-emerald-600 lowercase font-normal">(saved for next time)</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. 123 Main St"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 text-slate-800"
              required
            />
          </div>
        </div>

        {/* On-Site Times */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">On-Site Times</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
              <input
                type="text"
                placeholder="7:30 AM"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Finished</label>
              <input
                type="text"
                placeholder="5:00 PM"
                value={timeFinished}
                onChange={(e) => setTimeFinished(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Left Site</label>
              <input
                type="text"
                placeholder="12:00 PM"
                value={timeLeftSite}
                onChange={(e) => setTimeLeftSite(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Returned</label>
              <input
                type="text"
                placeholder="12:30 PM"
                value={timeReturned}
                onChange={(e) => setTimeReturned(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs text-slate-800 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Tasks & Category Selection */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase">Task Breakdown</span>
            <button
              type="button"
              onClick={handleAddTask}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-500 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              + Add Task Row
            </button>
          </div>

          {tasks.map((task, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={task.category}
                    onChange={(e) => handleTaskChange(idx, 'category', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                  >
                    {CATEGORIES_LIST.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {tasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(idx)}
                    className="mt-4 text-rose-500 hover:text-rose-700 font-bold text-xs px-2 py-1.5 bg-rose-50 border border-rose-200 rounded-lg shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 4.5"
                    value={task.hours}
                    onChange={(e) => handleTaskChange(idx, 'hours', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Travel Time (hrs)</label>
                  <input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 0.5"
                    value={task.travelTime}
                    onChange={(e) => handleTaskChange(idx, 'travelTime', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes / Comments</label>
                <input
                  type="text"
                  placeholder="Task details..."
                  value={task.comments}
                  onChange={(e) => handleTaskChange(idx, 'comments', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-medium"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          {submitting ? "Submitting Timesheet..." : "Submit Timesheet"}
        </button>
      </form>
    </div>
  );
}
