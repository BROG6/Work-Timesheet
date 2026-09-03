import React, { useState, useEffect } from 'react';
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
    "Driveway/Paths/Landscaping",
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
  // Load saved project from local storage or default to empty string
  const [project, setProject] = useState(() => {
    return localStorage.getItem(`sjr_last_project_${user.uid}`) || '';
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Site Time Tracking (Ordered: Start -> Finished -> Left Site -> Returned)
  const [startTime, setStartTime] = useState('');
  const [timeFinished, setTimeFinished] = useState('');
  const [timeLeftSite, setTimeLeftSite] = useState('');
  const [timeReturned, setTimeReturned] = useState('');
  
  // Work Task Selection
  const [selectedGroup, setSelectedGroup] = useState("Framing & Envelope");
  const [selectedTask, setSelectedTask] = useState("Wall Framing");
  const [hours, setHours] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [comments, setComments] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Whenever project name is edited, persist it locally for this worker
  const handleProjectChange = (e) => {
    const val = e.target.value;
    setProject(val);
    localStorage.setItem(`sjr_last_project_${user.uid}`, val);
  };

  // Auto-update task dropdown when group changes
  const handleGroupChange = (e) => {
    const group = e.target.value;
    setSelectedGroup(group);
    setSelectedTask(TASK_CATEGORIES[group][0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hours || parseFloat(hours) <= 0) return;

    setLoading(true);
    setSuccess(false);

    try {
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
        taskCategoryGroup: selectedGroup,
        taskName: selectedTask,
        hours: parseFloat(hours),
        travelTime: travelTime ? parseFloat(travelTime) : 0,
        comments: comments,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Clear task-specific inputs, but KEEP the project name persistent
      setHours('');
      setTravelTime('');
      setComments('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving time entry:", err);
      alert("Failed to submit entry. Please try again.");
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
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-semibold">
          ✓ Entry saved to daily time card!
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
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Time Finished</label>
              <input type="time" value={timeFinished} onChange={(e) => setTimeFinished(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Time Left Site</label>
              <input type="time" value={timeLeftSite} onChange={(e) => setTimeLeftSite(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Time Returned</label>
              <input type="time" value={timeReturned} onChange={(e) => setTimeReturned(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 mt-0.5" />
            </div>
          </div>
        </div>

        {/* Work Category & Specific Task */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category Group</label>
            <select
              value={selectedGroup}
              onChange={handleGroupChange}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
            >
              {Object.keys(TASK_CATEGORIES).map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Task Undertaken</label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
            >
              {TASK_CATEGORIES[selectedGroup].map((task) => (
                <option key={task} value={task}>{task}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Task Hours & Travel Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Task Hours</label>
            <input
              type="number"
              step="0.25"
              placeholder="e.g. 7.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Travel Time (Hrs)</label>
            <input
              type="number"
              step="0.25"
              placeholder="e.g. 1.0"
              value={travelTime}
              onChange={(e) => setTravelTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Comments / Details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Comments / Work Details</label>
          <textarea
            rows="2"
            placeholder="Required if selecting 'Other Work' or providing site specifics..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {loading ? "Saving Entry..." : "Submit Time Card Entry"}
        </button>
      </form>
    </div>
  );
}
