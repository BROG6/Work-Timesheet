import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Import docx directly via Skypack CDN so it works without running 'npm install' on a terminal
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  AlignmentType, 
  WidthType, 
  BorderStyle 
} from 'https://cdn.skypack.dev/docx';

// Helper to get the Wednesday of a given date's week (Wed - Tue)
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

// Helper to format DD/MM/YYYY to DD/MM for time card tables
function formatDayMonth(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return dateStr;
}

// Robust helper to convert various date stored formats to DD/MM/YYYY for uniform display
function displayDate(dateStr) {
  if (!dateStr) return '';
  
  // Handle JS Date objects or Firestore Timestamps
  if (typeof dateStr === 'object' && dateStr.toDate) {
    return formatDate(dateStr.toDate());
  }
  
  // Handle ISO string format (e.g. 2026-09-04T...)
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return formatDate(d);
  }

  // Handle YYYY-MM-DD string format
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
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

export default function ManagerDashboard({ userProfile }) {
  const [timesheets, setTimesheets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterProject, setFilterProject] = useState('ALL');

  // Calendar week view state starting Wednesday
  const [currentWednesday, setCurrentWednesday] = useState(() => getWednesday(new Date()));
  const [selectedDate, setSelectedDate] = useState('ALL');

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
          date: displayDate(data.date) // Ensure stored dates are displayed as DD/MM/YYYY
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
      alert("Failed to delete entry.");
    }
  };

  // Generate 7 days starting Wednesday through Tuesday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWednesday);
    day.setDate(currentWednesday.getDate() + i);
    const dateStr = formatDate(day);

    const dayTotalHours = timesheets
      .filter((t) => displayDate(t.date) === dateStr)
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
    const prevWed = new Date(currentWednesday);
    prevWed.setDate(currentWednesday.getDate() - 7);
    setCurrentWednesday(prevWed);
  };

  const handleNextWeek = () => {
    const nextWed = new Date(currentWednesday);
    nextWed.setDate(currentWednesday.getDate() + 7);
    setCurrentWednesday(nextWed);
  };

  const handleTodayClick = () => {
    setCurrentWednesday(getWednesday(new Date()));
    setSelectedDate(formatDate(new Date()));
  };

  const userMap = {};
  users.forEach((u) => {
    userMap[u.uid] = u.name || u.email;
  });

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

  const filteredTimesheets = timesheets.filter((t) => {
    const matchesUser = filterUser === 'ALL' || t.userId === filterUser || t.userName === filterUser;
    const matchesProject = filterProject === 'ALL' || (t.project || 'General / Unassigned') === filterProject;

    const formattedEntryDate = displayDate(t.date);
    let matchesDate = false;

    if (selectedDate === 'ALL') {
      const activeDates = weekDays.map((d) => d.dateStr);
      matchesDate = activeDates.includes(formattedEntryDate);
    } else {
      matchesDate = formattedEntryDate === selectedDate;
    }

    return matchesUser && matchesProject && matchesDate;
  });

  // Calculate work hours and total travel hours for current active filter
  const totalFilteredHours = filteredTimesheets.reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
  
  const totalFilteredTravelHours = filteredTimesheets.reduce((sum, t) => {
    let entryTravel = 0;
    if (t.tasks && Array.isArray(t.tasks)) {
      entryTravel = t.tasks.reduce((tSum, tk) => tSum + (parseFloat(tk.travelTime) || 0), 0);
    }
    return sum + entryTravel;
  }, 0);

  const todayStr = formatDate(new Date());

  // Export as DOCX (Generates individual timecard sections per staff member if 'ALL' is selected)
  const handleExportDOCX = async () => {
    const thinBorder = {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
    };

    const makeCell = (text, bold = false, align = AlignmentType.LEFT, widthPct = null) => {
      return new TableCell({
        borders: thinBorder,
        width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
        children: [
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text: String(text || ""), bold, size: 18 })]
          })
        ]
      });
    };

    // Active dates for the calendar week (DD/MM/YYYY)
    const activeDates = weekDays.map((d) => d.dateStr);

    // Determine target staff members to render
    let staffToExport = [];
    if (filterUser === 'ALL') {
      const weekEntries = timesheets.filter((t) => {
        const matchesProject = filterProject === 'ALL' || (t.project || 'General / Unassigned') === filterProject;
        return activeDates.includes(displayDate(t.date)) && matchesProject;
      });
      
      staffToExport = Array.from(new Set(weekEntries.map((t) => t.userId || t.userName)))
        .map((staffKey) => {
          const opt = staffOptions.find((s) => s.value === staffKey);
          return { key: staffKey, label: opt ? opt.label : staffKey };
        });
    } else {
      const opt = staffOptions.find((s) => s.value === filterUser);
      staffToExport = [{ key: filterUser, label: opt ? opt.label : filterUser }];
    }

    if (staffToExport.length === 0) {
      alert("No timesheet data available to export for the selected week/filter.");
      return;
    }

    // Helper to generate docx elements for a single staff member
    const buildStaffSection = (staffMember) => {
      const staffEntries = timesheets.filter((t) => {
        const matchesStaff = t.userId === staffMember.key || t.userName === staffMember.key;
        const matchesProject = filterProject === 'ALL' || (t.project || 'General / Unassigned') === filterProject;
        return matchesStaff && matchesProject && activeDates.includes(displayDate(t.date));
      });

      const staffProjects = Array.from(new Set(staffEntries.map((t) => t.project || 'General'))).join(', ') || (filterProject === 'ALL' ? 'All Projects' : filterProject);

      const tableRows = [];

      // Header Row: Days
      const dayCells = [
        makeCell("Day", true, AlignmentType.LEFT, 28),
        ...weekDays.map((d) => makeCell(d.dayName, true, AlignmentType.CENTER, 9)),
        makeCell("Totals", true, AlignmentType.CENTER, 10)
      ];
      tableRows.push(new TableRow({ children: dayCells }));

      // Date Row (Displays DD/MM only)
      const dateCells = [
        makeCell("Date", true, AlignmentType.LEFT, 28),
        ...weekDays.map((d) => makeCell(formatDayMonth(d.dateStr), false, AlignmentType.CENTER, 9)),
        makeCell("", false, AlignmentType.CENTER, 10)
      ];
      tableRows.push(new TableRow({ children: dateCells }));

      // Timecard Field Helper Row
      const addTimeCardRow = (label, fieldKey) => {
        const rowVals = weekDays.map((wd) => {
          const matches = staffEntries.filter((t) => displayDate(t.date) === wd.dateStr);
          if (!matches.length) return "";
          return matches.map((m) => m.timeCardDetails?.[fieldKey] || "").filter(Boolean).join(" / ");
        });
        const cells = [
          makeCell(label, true, AlignmentType.LEFT, 28),
          ...rowVals.map((v) => makeCell(v, false, AlignmentType.CENTER, 9)),
          makeCell("", false, AlignmentType.CENTER, 10)
        ];
        tableRows.push(new TableRow({ children: cells }));
      };

      addTimeCardRow("START TIME", "startTime");
      addTimeCardRow("TIME LEFT SITE", "timeLeftSite");
      addTimeCardRow("TIME RETURNED", "timeReturned");
      addTimeCardRow("TIME FINISHED", "timeFinished");

      // Category Rows
      CATEGORIES_LIST.forEach((cat) => {
        let rowTotal = 0;
        const dayVals = weekDays.map((wd) => {
          const matches = staffEntries.filter((t) => displayDate(t.date) === wd.dateStr);
          let catHours = 0;
          matches.forEach((entry) => {
            if (entry.tasks && Array.isArray(entry.tasks)) {
              entry.tasks.forEach((task) => {
                const matchedName = task.taskName || task.taskCategoryGroup || "";
                if (matchedName.toLowerCase().trim() === cat.toLowerCase().trim()) {
                  catHours += parseFloat(task.hours) || 0;
                }
              });
            }
          });
          rowTotal += catHours;
          return catHours > 0 ? catHours : "";
        });

        const catCells = [
          makeCell(cat, false, AlignmentType.LEFT, 28),
          ...dayVals.map((v) => makeCell(v, false, AlignmentType.CENTER, 9)),
          makeCell(rowTotal > 0 ? rowTotal : "", true, AlignmentType.CENTER, 10)
        ];
        tableRows.push(new TableRow({ children: catCells }));
      });

      // Total Hours Row
      let weekTotalHours = 0;
      const dailyTotals = weekDays.map((wd) => {
        const total = staffEntries
          .filter((t) => displayDate(t.date) === wd.dateStr)
          .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
        weekTotalHours += total;
        return total > 0 ? total : "";
      });
      const totalCells = [
        makeCell("TOTAL HOURS", true, AlignmentType.LEFT, 28),
        ...dailyTotals.map((v) => makeCell(v, true, AlignmentType.CENTER, 9)),
        makeCell(weekTotalHours > 0 ? weekTotalHours : "", true, AlignmentType.CENTER, 10)
      ];
      tableRows.push(new TableRow({ children: totalCells }));

      // Travel Time Row
      let weekTotalTravel = 0;
      const dailyTravel = weekDays.map((wd) => {
        let dayTravel = 0;
        staffEntries
          .filter((t) => displayDate(t.date) === wd.dateStr)
          .forEach((entry) => {
            if (entry.tasks) {
              entry.tasks.forEach((tk) => {
                dayTravel += parseFloat(tk.travelTime) || 0;
              });
            }
          });
        weekTotalTravel += dayTravel;
        return dayTravel > 0 ? dayTravel : "";
      });
      const travelCells = [
        makeCell("Travel Time", true, AlignmentType.LEFT, 28),
        ...dailyTravel.map((v) => makeCell(v, false, AlignmentType.CENTER, 9)),
        makeCell(weekTotalTravel > 0 ? weekTotalTravel : "", true, AlignmentType.CENTER, 10)
      ];
      tableRows.push(new TableRow({ children: travelCells }));

      // Collect Comments
      const commentParagraphs = [
        new Paragraph({
          children: [new TextRun({ text: "COMMENTS", bold: true, size: 20 })],
          spaceBefore: 300,
          spaceAfter: 100
        })
      ];

      let commentsFound = false;
      staffEntries.forEach((entry) => {
        if (entry.tasks) {
          entry.tasks.forEach((tk) => {
            if (tk.comments) {
              commentsFound = true;
              commentParagraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: `${formatDayMonth(displayDate(entry.date))}: `, bold: true, size: 18 }),
                    new TextRun({ text: tk.comments, size: 18 })
                  ],
                  spaceAfter: 60
                })
              );
            }
          });
        }
      });

      if (!commentsFound) {
        commentParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "No comments recorded for this week.", italic: true, size: 18 })]
          })
        );
      }

      return [
        new Paragraph({
          children: [
            new TextRun({ text: `Staff Member: ${staffMember.label}`, bold: true, size: 22 }),
            new TextRun({ text: `\t\tProject: ${staffProjects}`, bold: true, size: 22 })
          ],
          spaceAfter: 200
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        ...commentParagraphs
      ];
    };

    const docSections = staffToExport.map((staffMember) => ({
      properties: {},
      children: buildStaffSection(staffMember)
    }));

    const docxDocument = new Document({
      sections: docSections
    });

    const fileStartStr = weekStartStr.replaceAll('/', '-');
    const fileEndStr = weekEndStr.replaceAll('/', '-');

    const blob = await Packer.toBlob(docxDocument);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filterUser === 'ALL' 
      ? `All_Staff_TimeCards_${fileStartStr}_to_${fileEndStr}.docx`
      : `TimeCard_${staffToExport[0].label.replace(/\s+/g, '_')}_${fileStartStr}_to_${fileEndStr}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportDOCX}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
          >
            Export Time Card (.docx)
          </button>
          
          {/* Work Hours Metric Badge */}
          <div className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-semibold flex items-center gap-2">
            <span>Work Hours:</span>
            <strong className="text-emerald-400 text-sm">{totalFilteredHours} hrs</strong>
          </div>

          {/* Travel Hours Metric Badge */}
          <div className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-semibold flex items-center gap-2">
            <span>Travel Hours:</span>
            <strong className="text-amber-400 text-sm">{totalFilteredTravelHours} hrs</strong>
          </div>
        </div>
      </div>

      {/* Weekly Roundup Calendar (Wed to Tue) */}
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
              {weekDays[0].dateStr} (Wed) – {weekDays[6].dateStr} (Tue)
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
            const entryTravelTotal = (entry.tasks || []).reduce((sum, tk) => sum + (parseFloat(tk.travelTime) || 0), 0);

            return (
              <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <span className="text-base font-bold text-slate-900">{staffDisplayName}</span>
                    <p className="text-xs text-slate-500 font-medium">
                      Site: <span className="text-slate-800 font-semibold">{entry.project || "General"}</span> | Date: <span className="text-slate-800 font-semibold">{displayDate(entry.date)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Work: {entry.totalHours || 0} hrs
                    </span>
                    {entryTravelTotal > 0 && (
                      <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        Travel: {entryTravelTotal} hrs
                      </span>
                    )}
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
                          <span>{t.taskCategoryGroup || t.taskName}</span>
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
