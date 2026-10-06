import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

// Templating libraries for loading and filling existing .docx files
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

// --- Date Helpers ---

// Returns the Wednesday of the week for a given date (Wed - Tue cycle)
function getWednesday(d) {
  const date = new Date(d);
  const day = date.getDay();
  // Calculate offset to Wednesday (Sunday is 0, Wednesday is 3)
  const diff = date.getDate() - day + (day < 3 ? -4 : 3);
  return new Date(date.setDate(diff));
}

// Formats a JavaScript Date object as DD/MM/YYYY
function formatDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

// Safely converts Firestore Timestamps or ISO strings into DD/MM/YYYY
function displayDate(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'object' && dateStr.toDate) {
    return formatDate(dateStr.toDate());
  }
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return formatDate(d);
  }
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
}

export default function ManagerDashboard({ userProfile }) {
  const [timesheets, setTimesheets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterProject, setFilterProject] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Date Navigation State (Default to current week starting Wednesday)
  const [currentWednesday, setCurrentWednesday] = useState(() => getWednesday(new Date()));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const timesheetSnap = await getDocs(collection(db, 'timesheets'));
      const timesheetData = timesheetSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: displayDate(data.date)
        };
      });

      const usersSnap = await getDocs(collection(db, 'users'));
      const userData = usersSnap.docs.map((d) => ({
        uid: d.id,
        ...d.data()
      }));

      setTimesheets(timesheetData);
      setUsers(userData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate array of 7 dates for the active Wednesday - Tuesday period
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWednesday);
    day.setDate(currentWednesday.getDate() + i);
    return {
      dateObj: day,
      dateStr: formatDate(day),
      dayName: day.toLocaleDateString('en-NZ', { weekday: 'short' })
    };
  });

  const activeWeekDateStrings = weekDays.map((d) => d.dateStr);
  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

  // Week Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentWednesday);
    prev.setDate(prev.getDate() - 7);
    setCurrentWednesday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWednesday);
    next.setDate(next.getDate() + 7);
    setCurrentWednesday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentWednesday(getWednesday(new Date()));
  };

  // Status toggle handler
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Approved' ? 'Pending' : 'Approved';
    try {
      await updateDoc(doc(db, 'timesheets', id), { status: newStatus });
      setTimesheets((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Delete entry handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await deleteDoc(doc(db, 'timesheets', id));
      setTimesheets((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  // --- TEMPLATE EXPORT LOGIC ---
  const handleExportFromTemplate = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch raw binary of the stored template asset directly from /public
      const response = await fetch('/Blank Time Cards.docx');
      if (!response.ok) {
        throw new Error("Could not find template file at '/Blank Time Cards.docx'");
      }
      const templateArrayBuffer = await response.arrayBuffer();

      // Filter entries matching the current week and user selection
      const activeWeekEntries = timesheets.filter((t) => {
        const matchesUser = filterUser === 'ALL' || t.userId === filterUser || t.userName === filterUser;
        return activeWeekDateStrings.includes(displayDate(t.date)) && matchesUser;
      });

      if (activeWeekEntries.length === 0) {
        alert("No timesheet entries found for the selected filter and week.");
        setIsExporting(false);
        return;
      }

      // Determine sites to export
      let sitesToExport = [];
      if (filterProject === 'ALL') {
        sitesToExport = Array.from(new Set(activeWeekEntries.map((t) => t.project || 'General')));
      } else {
        sitesToExport = [filterProject];
      }

      // Map User IDs to display names
      const userMap = {};
      users.forEach((u) => {
        userMap[u.uid] = u.name || u.email;
      });

      // 2. Loop through each site and populate the template
      for (const siteName of sitesToExport) {
        const siteEntries = activeWeekEntries.filter(
          (t) => (t.project || 'General') === siteName
        );

        if (siteEntries.length === 0) continue;

        // Structure dataset for staff members on this site
        const staffMembersData = Array.from(
          new Set(siteEntries.map((t) => t.userId || t.userName))
        ).map((staffKey) => {
          const staffEntries = siteEntries.filter(
            (t) => t.userId === staffKey || t.userName === staffKey
          );

          let staffTotalHours = 0;
          let staffTotalTravel = 0;
          const allTasks = [];

          staffEntries.forEach((entry) => {
            staffTotalHours += parseFloat(entry.totalHours) || 0;
            if (entry.tasks && Array.isArray(entry.tasks)) {
              entry.tasks.forEach((tk) => {
                const travel = parseFloat(tk.travelTime) || 0;
                staffTotalTravel += travel;
                allTasks.push({
                  date: entry.date,
                  category: tk.taskCategoryGroup || tk.taskName || 'General',
                  hours: tk.hours || 0,
                  travel: travel,
                  comments: tk.comments || '',
                  timeOnSite: entry.timeCardDetails?.timeOnSite || '',
                  timeLeftSite: entry.timeCardDetails?.timeLeftSite || '',
                  timeReturned: entry.timeCardDetails?.timeReturnedToYard || ''
                });
              });
            }
          });

          return {
            staffName: userMap[staffKey] || staffKey,
            siteName: siteName,
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
            totalHours: staffTotalHours.toFixed(2),
            totalTravel: staffTotalTravel.toFixed(2),
            tasks: allTasks
          };
        });

        // Instantiate PizZip and Docxtemplater with loaded file buffer
        const zip = new PizZip(templateArrayBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true
        });

        // Inject data context into the template placeholders
        doc.render({
          siteName: siteName,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          staffMembers: staffMembersData
        });

        // Generate output document blob
        const outBlob = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Trigger safe file download
        const safeSiteName = siteName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const url = URL.createObjectURL(outBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TimeCard_${safeSiteName}_${weekStartStr.replaceAll('/', '-')}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Asynchronous delay to prevent browser download popup blocking
        await new Promise((res) => setTimeout(res, 200));
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error filling template DOCX:", err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Filter entries for the interactive dashboard table view (RESTRICTED TO CURRENT ACTIVE WEEK)
  const filteredTimesheets = timesheets.filter((item) => {
    const matchesWeek = activeWeekDateStrings.includes(displayDate(item.date));
    const matchesUser = filterUser === 'ALL' || item.userId === filterUser || item.userName === filterUser;
    const matchesProject = filterProject === 'ALL' || item.project === filterProject;
    const matchesDate = selectedDate === 'ALL' || displayDate(item.date) === selectedDate;
    return matchesWeek && matchesUser && matchesProject && matchesDate;
  });

  const projectList = Array.from(new Set(timesheets.map((t) => t.project).filter(Boolean)));

  return (
    <div className="p-6 bg-slate-900 text-slate-100 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
          <p className="text-sm text-slate-400">Review worker timecards and export site summaries</p>
        </div>

        {/* Date Selector / Week Controls */}
        <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold"
          >
            &larr; Prev
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold"
          >
            Current Week
          </button>
          <span className="text-xs font-mono text-emerald-400 px-2">
            {weekStartStr} — {weekEndStr}
          </span>
          <button
            type="button"
            onClick={handleNextWeek}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* Filter and Action Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Filter Staff</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Staff</option>
            {users.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Filter Site/Project</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Projects</option>
            {projectList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Filter Day</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Days This Week</option>
            {weekDays.map((d) => (
              <option key={d.dateStr} value={d.dateStr}>
                {d.dayName} ({d.dateStr})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleExportFromTemplate}
            disabled={isExporting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <span>Exporting Document...</span>
            ) : (
              <span>Export (Fill Template)</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Timesheet Records Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading timesheet records...</div>
        ) : filteredTimesheets.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No entries found for {weekStartStr} — {weekEndStr}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 border-b border-slate-700">
                  <th className="p-3">Date</th>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Project / Site</th>
                  <th className="p-3">Total Hours</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredTimesheets.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-mono">{item.date}</td>
                    <td className="p-3 font-semibold">{item.userName || item.userId}</td>
                    <td className="p-3 text-emerald-400">{item.project || 'General'}</td>
                    <td className="p-3 font-mono">{item.totalHours || 0} hrs</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          item.status === 'Approved'
                            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                            : 'bg-amber-900/50 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {item.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id, item.status)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded transition-colors"
                      >
                        {item.status === 'Approved' ? 'Unapprove' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-xs bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 px-2.5 py-1 rounded transition-colors border border-rose-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
