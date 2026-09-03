import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Helper to get the Monday of a given date's week
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

// Helper to format date into YYYY-MM-DD
function formatDate(dateObj) {
  return dateObj.toISOString().split('T')[0];
}

export default function ManagerDashboard({ userProfile }) {
  const [timesheets, setTimesheets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterProject, setFilterProject] = useState('ALL');

  // Calendar week view state
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState('ALL'); // 'ALL' for entire week or YYYY-MM-DD for single day

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const timesheetSnap = await getDocs(collection(db, 'timesheets'));
      const timesheetData = timesheetSnap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      const usersSnap = await getDocs(collection(db, 'users'));
      const userData = usersSnap.docs.map((d) => ({
        uid: d.id,
        ...d.data()
      }));

      setTimesheets(timesheetData);
      setUsers(userData);
    } catch (err) {
      console.error("Error fetching manager data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'timesheets', id), {
        status: newStatus
      });
      setTimesheets((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Delete handler for incorrect job entries
  const handleDeleteEntry = async (id, projectName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this timesheet entry for "${projectName || 'General'}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'timesheets', id));
      setTimesheets((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting timesheet entry:", err);
      alert("Failed to delete entry. Please check permissions and try again.");
    }
  };

  // Generate 7 days (Mon-Sun) for current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentMonday);
    day.setDate(currentMonday.getDate() + i);
    const dateStr = formatDate(day);

    // Calculate total hours logged on this specific day
    const dayTotalHours = timesheets
      .filter((t) => t.date === dateStr)
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);

    return {
      dateStr,
      dayName: day.toLocaleDateString('en-NZ', { weekday: 'short' }),
      dayNumber: day.getDate(),
      monthName: day.toLocaleDateString('en-NZ', { month: 'short' }),
      dayTotalHours
    };
  });

  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

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
    setCurrentMonday(getMonday(new Date()));
    setSelectedDate(formatDate(new Date()));
  };

  // Lookup map for fast name fetching
  const userMap = {};
  users.forEach((u) => {
    userMap[u.uid] = u.name || u.email;
  });

  // Extract staff list with registered full names
  const staffOptions = Array.from(
    new Set(timesheets.map((t) => t.userId || t.userName))
  ).map((staffIdentifier) => {
    const matchingUser = users.find(
      (u) => u.uid === staffIdentifier || u.email === staffIdentifier || u.name === staffIdentifier
    );
    const displayName = matchingUser?.name || userMap[staffIdentifier] || staffIdentifier;
    return {
      value: staffIdentifier,
      label: displayName
    };
  });

  const uniqueProjects = Array.from(new Set(timesheets.map((t) => t.project || 'General / Unassigned')));

  // Filter timesheets by Date/Week, Staff Member, and Project
  const filteredTimesheets = timesheets.filter((t) => {
    const matchesUser = filterUser === 'ALL' || t.userId === filterUser || t.userName === filterUser;
    const matchesProject = filterProject === 'ALL' || (t.project || 'General / Unassigned') === filterProject;

    let matchesDate = false;
    if (selectedDate === 'ALL') {
      // Include any date falling within current week (Monday to Sunday)
      matchesDate = t.date >= weekStartStr && t.date <= weekEndStr;
    } else {
      matchesDate = t.date === selectedDate;
    }

    return matchesUser && matchesProject && matchesDate;
  });

  const totalFilteredHours = filteredTimesheets.reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
  const todayStr = formatDate(new Date());

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-slate-500 font-semibold animate-pulse">
        Loading Manager Dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Manager Dashboard Title Header */}
      <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Manager Dashboard</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">SJR Builders Work & Hours Overview</p>
        </div>
        <div className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-semibold flex items-center gap-2">
          <span>Weekly Hours Logged:</span>
          <strong className="text-emerald-400 text-sm">{totalFilteredHours} hrs</strong>
        </div>
      </div>

      {/* Weekly Roundup Calendar */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between mb-3 text-xs gap-2">
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={handleNextWeek}
              className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md font-semibold transition-colors text-slate-300"
            >
              Next Week →
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate('ALL')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors ${
                selectedDate === 'ALL'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Show Full Week
            </button>
            <button
              type="button"
              onClick={handleTodayClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md font-bold transition-colors text-xs"
            >
              Today
            </button>
          </div>
        </div>

        {/* 7-Day Roundup Cards */}
        <div className="grid grid-cols-7 gap-1.5">
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
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg scale-105'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span className="text-[10px] uppercase font-semibold opacity-80">{day.dayName}</span>
                <span className="text-base font-extrabold my-0.5">{day.dayNumber}</span>
                <span className={`text-[10px] font-bold px-1 rounded ${
                  isSelected ? 'bg-slate-950/20 text-slate-950' : 'text-emerald-400'
                }`}>
                  {day.dayTotalHours > 0 ? `${day.dayTotalHours}h` : '0h'}
                </span>
                {isToday && (
                  <span className={`text-[8px] px-1 mt-1 rounded uppercase tracking-wider font-bold ${
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

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filter Staff Member</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 text-slate-800"
          >
            <option value="ALL">All Staff Members</option>
            {staffOptions.map((staff) => (
              <option key={staff.value} value={staff.value}>
                {staff.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filter Project / Site</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 text-slate-800"
          >
            <option value="ALL">All Projects</option>
            {uniqueProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredTimesheets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-medium">
            No timesheet submissions match the selected date or filters.
          </div>
        ) : (
          filteredTimesheets.map((entry) => {
            const staffDisplayName = userMap[entry.userId] || entry.userName || "Staff Member";

            return (
              <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <span className="text-base font-bold text-slate-900">{staffDisplayName}</span>
                    <p className="text-xs text-slate-500 font-medium">
                      Site: <span className="text-slate-800 font-semibold">{entry.project || "General"}</span> | Date: <span className="text-slate-800 font-semibold">{entry.date}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                      {entry.totalHours || 0} Hours
                    </span>
                    <select
                      value={entry.status || 'pending'}
                      onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border ${
                        entry.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : entry.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    {/* Delete Entry Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id, entry.project)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ml-1"
                      title="Delete this timesheet entry"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* On-Site Times */}
                {entry.timeCardDetails && (entry.timeCardDetails.startTime || entry.timeCardDetails.timeFinished) && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><span className="text-slate-400">Start:</span> <strong className="text-slate-700">{entry.timeCardDetails.startTime || '-'}</strong></div>
                    <div><span className="text-slate-400">Finished:</span> <strong className="text-slate-700">{entry.timeCardDetails.timeFinished || '-'}</strong></div>
                    <div><span className="text-slate-400">Left Site:</span> <strong className="text-slate-700">{entry.timeCardDetails.timeLeftSite || '-'}</strong></div>
                    <div><span className="text-slate-400">Returned:</span> <strong className="text-slate-700">{entry.timeCardDetails.timeReturned || '-'}</strong></div>
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Completed Tasks</span>
                  {entry.tasks && entry.tasks.length > 0 ? (
                    entry.tasks.map((t, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{t.taskCategoryGroup} → {t.taskName}</span>
                          <span className="text-emerald-700">{t.hours} hrs {t.travelTime > 0 ? `(+${t.travelTime} hrs travel)` : ''}</span>
                        </div>
                        {t.comments && (
                          <p className="text-slate-600 text-[11px] italic bg-white p-2 rounded border border-slate-100 mt-1">
                            "{t.comments}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No specific tasks recorded.</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
