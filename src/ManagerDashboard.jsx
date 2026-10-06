// src/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

import PizZip from 'pizzip';

const ALL_TEMPLATE_TASKS = [
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
  "Other                                  (PTO)",
  "Sick Leave",
  "Annual Leave",
  "Bereavement Leave",
  "Training",
  "Other Leave (please specify)",
  ""
];

// Helper: Precise floating-point rounding
const safeRound = (val) => Math.round((parseFloat(val) || 0) * 100) / 100;

function parseLocalDate(dateInput) {
  if (!dateInput) return new Date();
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  return new Date(dateInput);
}

function getWednesday(d) {
  const date = parseLocalDate(d);
  const day = date.getDay();
  const diff = date.getDate() - ((day + 4) % 7);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function formatDateISO(dateObj) {
  const d = parseLocalDate(dateObj);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateObj) {
  const d = parseLocalDate(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function displayDate(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'object' && dateStr.toDate) {
    return formatDateISO(dateStr.toDate());
  }
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr;
}

function cleanText(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function setCellText(cell, text, xmlDoc) {
  const tNodes = cell.getElementsByTagName("w:t");
  if (tNodes.length > 0) {
    tNodes[0].textContent = text;
    tNodes[0].setAttribute("xml:space", "preserve");
    for (let i = 1; i < tNodes.length; i++) {
      tNodes[i].textContent = "";
    }
  } else {
    const pNodes = cell.getElementsByTagName("w:p");
    if (pNodes.length > 0) {
      const r = xmlDoc.createElement("w:r");
      const t = xmlDoc.createElement("w:t");
      t.textContent = text;
      t.setAttribute("xml:space", "preserve");
      r.appendChild(t);
      pNodes[0].appendChild(r);
    }
  }
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

  // Date Navigation State
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

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWednesday.getFullYear(), currentWednesday.getMonth(), currentWednesday.getDate() + i);
    return {
      dateObj: day,
      dateIso: formatDateISO(day),
      dateStr: formatDisplayDate(day),
      dayName: day.toLocaleDateString('en-NZ', { weekday: 'short' })
    };
  });

  const activeWeekISODates = weekDays.map((d) => d.dateIso);
  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

  const handlePrevWeek = () => {
    const prev = new Date(currentWednesday.getFullYear(), currentWednesday.getMonth(), currentWednesday.getDate() - 7);
    setCurrentWednesday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWednesday.getFullYear(), currentWednesday.getMonth(), currentWednesday.getDate() + 7);
    setCurrentWednesday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentWednesday(getWednesday(new Date()));
  };

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
      const response = await fetch('/Blank Time Cards.docx');
      if (!response.ok) {
        throw new Error("Could not find template file at '/Blank Time Cards.docx'");
      }
      const templateArrayBuffer = await response.arrayBuffer();

      const activeWeekEntries = timesheets.filter((t) => {
        const matchesUser = filterUser === 'ALL' || t.userId === filterUser || t.userName === filterUser;
        return activeWeekISODates.includes(displayDate(t.date)) && matchesUser;
      });

      if (activeWeekEntries.length === 0) {
        alert("No timesheet entries found for the selected filter and week.");
        setIsExporting(false);
        return;
      }

      const userMap = {};
      users.forEach((u) => {
        userMap[u.uid] = u.name || u.userName || u.displayName || u.email;
      });

      // 1. Group active week entries by Staff Member first, then by Site
      const staffKeys = Array.from(
        new Set(activeWeekEntries.map((t) => t.userId || t.userName))
      );

      for (const staffKey of staffKeys) {
        const staffEntries = activeWeekEntries.filter(
          (t) => (t.userId || t.userName) === staffKey
        );

        if (staffEntries.length === 0) continue;

        const staffName = userMap[staffKey] || staffKey;

        // Find all distinct sites this staff member worked on this week
        let sitesForStaff = [];
        if (filterProject === 'ALL') {
          sitesForStaff = Array.from(new Set(staffEntries.map((t) => t.project || 'General / Unassigned')));
        } else {
          sitesForStaff = [filterProject];
        }

        for (const siteName of sitesForStaff) {
          const siteEntries = staffEntries.filter(
            (t) => (t.project || 'General / Unassigned') === siteName
          );

          if (siteEntries.length === 0) continue;

          const zip = new PizZip(templateArrayBuffer);
          const docXmlStr = zip.file("word/document.xml").asText();
          
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");
          const rows = xmlDoc.getElementsByTagName("w:tr");
          const paragraphs = xmlDoc.getElementsByTagName("w:p");

          // Update Document Header Info (Staff Member + Site)
          for (let p of paragraphs) {
            const tNodes = p.getElementsByTagName("w:t");
            if (tNodes.length === 0) continue;

            let fullText = "";
            for (let i = 0; i < tNodes.length; i++) {
              fullText += tNodes[i].textContent;
            }

            if (fullText.includes("Staff Member") || fullText.includes("Project")) {
              if (fullText.includes("Staff Member") && fullText.includes("Project")) {
                tNodes[0].textContent = `Staff Member: ${staffName}      Project: ${siteName}`;
                for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
              } else if (fullText.includes("Staff Member")) {
                tNodes[0].textContent = fullText.replace(/Staff Member:\s*([^\r\n]*)?/g, `Staff Member: ${staffName}`);
                for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
              } else if (fullText.includes("Project")) {
                tNodes[0].textContent = fullText.replace(/Project:\s*([^\r\n]*)?/g, `Project: ${siteName}`);
                for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
              }
            }
          }

          function getCellText(cell) {
            const tNodes = cell.getElementsByTagName("w:t");
            let str = "";
            for (let tn of tNodes) str += tn.textContent;
            return str;
          }

          const fillTimingRow = (cells, timingKey) => {
            weekDays.forEach((dayObj, idx) => {
              if (!cells[idx + 1]) return;
              const entriesForDay = siteEntries.filter((e) => e.date === dayObj.dateIso);
              const val = entriesForDay
                .map((e) => e.timeCardDetails?.[timingKey])
                .filter(Boolean)
                .join(" / ");
              setCellText(cells[idx + 1], val, xmlDoc);
            });
          };

          const fillTaskRow = (cells, taskLabel) => {
            let rowTaskTotal = 0;
            weekDays.forEach((dayObj, idx) => {
              if (!cells[idx + 1]) return;
              const entriesForDay = siteEntries.filter((e) => e.date === dayObj.dateIso);
              let dayTaskHours = 0;

              if (entriesForDay.length > 0 && taskLabel !== "") {
                entriesForDay.forEach((entryForDay) => {
                  if (entryForDay.tasks) {
                    entryForDay.tasks.forEach((t) => {
                      const tName = (t.taskName || '').toLowerCase().trim();
                      const lName = taskLabel.toLowerCase().trim();
                      const nameMatches =
                        tName === lName ||
                        (lName.includes("pto") && (tName.includes("other work") || tName.includes("pto"))) ||
                        (lName.includes("specify") && tName.includes("other leave")) ||
                        (lName.length > 4 && tName.length > 4 && lName.startsWith(tName));

                      if (nameMatches) {
                        dayTaskHours += parseFloat(t.hours) || 0;
                      }
                    });
                  }
                });
              }
              rowTaskTotal += dayTaskHours;
              setCellText(cells[idx + 1], dayTaskHours > 0 ? String(safeRound(dayTaskHours)) : "", xmlDoc);
            });
            if (cells[8]) {
              setCellText(cells[8], rowTaskTotal > 0 ? String(safeRound(rowTaskTotal)) : "", xmlDoc);
            }
          };

          const fillTotalHoursRow = (cells) => {
            let siteGrandTotalHours = 0;
            weekDays.forEach((dayObj, idx) => {
              if (!cells[idx + 1]) return;
              const entriesForDay = siteEntries.filter((e) => e.date === dayObj.dateIso);
              let dayTotal = 0;
              entriesForDay.forEach((entryForDay) => {
                if (entryForDay.tasks) {
                  dayTotal += entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
                } else {
                  dayTotal += parseFloat(entryForDay.totalHours) || 0;
                }
              });
              siteGrandTotalHours += dayTotal;
              setCellText(cells[idx + 1], dayTotal > 0 ? String(safeRound(dayTotal)) : "", xmlDoc);
            });
            if (cells[8]) {
              setCellText(cells[8], siteGrandTotalHours > 0 ? String(safeRound(siteGrandTotalHours)) : "", xmlDoc);
            }
          };

          const fillTravelRow = (cells) => {
            let siteGrandTravelTotal = 0;
            weekDays.forEach((dayObj, idx) => {
              if (!cells[idx + 1]) return;
              const entriesForDay = siteEntries.filter((e) => e.date === dayObj.dateIso);
              let dayTravel = 0;
              entriesForDay.forEach((entryForDay) => {
                if (entryForDay.tasks) {
                  dayTravel += entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.travelTime) || 0), 0);
                }
              });
              siteGrandTravelTotal += dayTravel;
              setCellText(cells[idx + 1], dayTravel > 0 ? String(safeRound(dayTravel)) : "", xmlDoc);
            });
            if (cells[8]) {
              setCellText(cells[8], siteGrandTravelTotal > 0 ? String(safeRound(siteGrandTravelTotal)) : "", xmlDoc);
            }
          };

          for (let tr of rows) {
            const cells = tr.getElementsByTagName("w:tc");
            if (cells.length === 0) continue;
            
            const firstCellText = getCellText(cells[0]).trim();
            
            if (firstCellText === "Date") {
              weekDays.forEach((dayObj, idx) => {
                if (cells[idx + 1]) {
                  const dateParts = dayObj.dateIso.split('-');
                  const displayDDMM = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : dayObj.dateIso;
                  setCellText(cells[idx + 1], displayDDMM, xmlDoc);
                }
              });
            } else if (firstCellText === "START TIME") {
              fillTimingRow(cells, "startTime");
            } else if (firstCellText === "TIME LEFT SITE") {
              fillTimingRow(cells, "timeLeftSite");
            } else if (firstCellText === "TIME RETURNED") {
              fillTimingRow(cells, "timeReturned");
            } else if (firstCellText === "TIME FINISHED") {
              fillTimingRow(cells, "timeFinished");
            } else if (firstCellText === "TOTAL HOURS") {
              fillTotalHoursRow(cells);
            } else if (firstCellText === "Travel Time") {
              fillTravelRow(cells);
            } else {
              const matchedTask = ALL_TEMPLATE_TASKS.find((task) => cleanText(task) === cleanText(firstCellText));
              if (matchedTask) {
                fillTaskRow(cells, matchedTask);
              }
            }
          }

          const serializer = new XMLSerializer();
          const updatedXmlStr = serializer.serializeToString(xmlDoc);
          zip.file("word/document.xml", updatedXmlStr);

          const outBlob = zip.generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });

          const safeStaffName = staffName.replace(/[^a-zA-Z0-9_\-]/g, '_');
          const safeSiteName = siteName.replace(/[^a-zA-Z0-9_\-]/g, '_');
          const url = URL.createObjectURL(outBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `TimeCard_${safeStaffName}_${safeSiteName}_${weekStartStr.replaceAll('/', '-')}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          await new Promise((res) => setTimeout(res, 250));
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error("Error filling template DOCX:", err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTimesheets = timesheets.filter((item) => {
    const itemIso = displayDate(item.date);
    const matchesWeek = activeWeekISODates.includes(itemIso);
    const matchesUser = filterUser === 'ALL' || item.userId === filterUser || item.userName === filterUser;
    const matchesProject = filterProject === 'ALL' || item.project === filterProject;
    const matchesDate = selectedDate === 'ALL' || itemIso === selectedDate;
    return matchesWeek && matchesUser && matchesProject && matchesDate;
  });

  const projectList = Array.from(new Set(timesheets.map((t) => t.project).filter(Boolean)));

  return (
    <div className="p-6 bg-slate-900 text-slate-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
          <p className="text-sm text-slate-400">Review worker timecards and export site summaries</p>
        </div>

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
                {u.name || u.userName || u.displayName || u.email}
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
              <option key={d.dateIso} value={d.dateIso}>
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
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isExporting ? (
              <span>Exporting Documents...</span>
            ) : (
              <span>Export Time Cards (DOCX)</span>
            )}
          </button>
        </div>
      </div>

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
                    <td className="p-3 font-mono">{formatDisplayDate(item.date)}</td>
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
