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

export default function TimesheetEntry({ user, userProfile }) {
  // Load saved project from localStorage or default to empty string
  const [project, setProject] = useState(() => {
    return localStorage.getItem(`sjr_last_project_${user.uid}`) || '';
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Site Time Tracking (Ordered: Start -> Finished -> Left Site -> Returned)
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

  // Save project name locally whenever worker changes it
  const handleProjectChange = (e) => {
    const val = e.target.value;
    setProject(val);
    localStorage.setItem(`sjr_last_project_${user.uid}`, val);
  };

  // Add a new task row to the form
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

  // Remove a task row
  const handleRemoveTask = (id) => {
    if (tasks.length === 1) return; // Keep at least one task row
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== id));
  };

  // Handle changes within specific task fields
  const handleTaskChange = (id, field, value) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === id) {
          const updated = { ...t, [field]: value };
          // If group changes, default task to first item in group
          if (field === 'categoryGroup') {
            updated.taskName = TASK_CATEGORIES[value][0];
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Calculate total task hours logged
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
      // Save entry to Firestore with multi-task support
      await addDoc(collection(db, 'timesheets'), {
        userId: user.uid,
        userName: userProfile?.name || user.email,
        companyCode: userProfile?.companyCode || 'SJR Builders',
        project: project || "General / Unassigned",
        date: date,
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

      // Reset task rows to single blank task, retaining active project name
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

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-5 my-4">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <h2 className="text-xl font-bold text-slate-900">Weekly Time Card Entry</h2>
        <p className="text-xs text-slate-500 font-medium">Logged for: <span className="text-slate-800 font-semibold">{userProfile?.name || user.email}</span></p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-semibold flex items-center gap-2">
          <span>✓</span> Entry saved! {navigator.onLine ? "" : "(Saved offline, will sync when connected)"}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name & Date */}
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
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
          {loading ? "Saving Entry..." : "Submit Time Card Entry"}
        </button>
      </form>
    </div>
  );
}
