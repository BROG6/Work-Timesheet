// src/TimesheetEntry.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from './firebaseConfig';
import { 
  collection, doc, setDoc, query, where, getDocs, getDocsFromCache, serverTimestamp 
} from 'firebase/firestore';

import PZip from 'pizzip';
import sjrLogo from './assets/logo.jpg';

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

function parseLocalDate(dateInput) {
  if (!dateInput) return new Date();
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const [y, m, d] = dateInput.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
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

function formatDate(dateObj) {
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
  const d = parseLocalDate(dateStr);
  return d.getDay() === 5;
}

function getFormattedStaffName(user, userProfile) {
  const explicitName = userProfile?.name || userProfile?.fullName || userProfile?.userName || user?.displayName;
  if (explicitName && explicitName.trim() !== '' && !explicitName.includes('@')) {
    return explicitName.trim();
  }
  const storedName = localStorage.getItem('sjr_staff_name');
  if (storedName) return storedName;

  const email = userProfile?.email || user?.email || '';
  if (email.includes('@')) {
    const handle = email.split('@')[0];
    return handle
      .split(/[\._\-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return 'Lakaia Barclay';
}

const createBlankTask = (dateStr) => ({
  id: Date.now() + Math.random(),
  categoryGroup: "Framing & Envelope",
  taskName: "Wall Framing",
  hours: isFriday(dateStr) ? '8' : '9.25',
  travelTime: '',
  comments: ''
});

const createBlankSite = (dateStr, initialProject = '') => ({
  id: Date.now() + Math.random(),
  project: initialProject,
  startTime: '07:00',
  timeFinished: isFriday(dateStr) ? '15:30' : '16:30',
  timeLeftSite: '',
  timeReturned: '',
  tasks: [createBlankTask(dateStr)]
});

function SiteAutoCompleteInput({ value, onChange, existingSites }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const queryText = value.toLowerCase().trim();
    const matches = existingSites.filter((site) => site.toLowerCase().includes(queryText));
    setSuggestions(matches);
    setIsOpen(matches.length > 0);
  }, [value, existingSites]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (siteName) => {
    onChange(siteName);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        placeholder="e.g. Hamilton New Build"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        required
      />
      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg text-sm">
          {suggestions.map((site, index) => (
            <li
              key={index}
              onClick={() => handleSelect(site)}
              className="px-3 py-2.5 hover:bg-emerald-50 cursor-pointer text-slate-800 border-b border-slate-100 last:border-none flex justify-between items-center transition-colors"
            >
              <span className="font-semibold">{site}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Existing Site
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TimesheetEntry({ user, userProfile, profile }) {
  const activeProfile = userProfile || profile;
  const activeUser = user || activeProfile;
  const userId = activeUser?.uid;
  const userName = getFormattedStaffName(user, activeProfile);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [existingSites, setExistingSites] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [currentWednesday, setCurrentWednesday] = useState(() => getWednesday(new Date()));
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [weekRangeStr, setWeekRangeStr] = useState('');
  const [loadingHours, setLoadingHours] = useState(true);

  // Multi-Site State: Holds an array of site objects for the selected date
  const [siteEntries, setSiteEntries] = useState(() => [
    createBlankSite(
      formatDate(new Date()),
      localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name') || ''
    )
  ]);

  const [loading, setLoading] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [fetchingDay, setFetchingDay] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

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

  useEffect(() => {
    async function fetchSites() {
      try {
        const q = query(collection(db, 'timesheets'));
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch {
          querySnapshot = await getDocsFromCache(q);
        }
        const sitesSet = new Set();
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.project && data.project.trim() !== '') {
            sitesSet.add(data.project.trim());
          }
        });
        const uniqueSitesList = Array.from(sitesSet);
        if (uniqueSitesList.length > 0) {
          localStorage.setItem('sjr_known_sites', JSON.stringify(uniqueSitesList));
          setExistingSites(uniqueSitesList);
        } else {
          const saved = localStorage.getItem('sjr_known_sites');
          if (saved) setExistingSites(JSON.parse(saved));
        }
      } catch (err) {
        console.warn("Could not fetch site names:", err);
        const saved = localStorage.getItem('sjr_known_sites');
        if (saved) setExistingSites(JSON.parse(saved));
      }
    }
    fetchSites();
  }, []);

  const fetchStaffWeeklyHours = useCallback(async () => {
    if (!userId) return;
    setLoadingHours(true);
    try {
      const currentWed = getWednesday(new Date());
      const currentTue = new Date(currentWed.getFullYear(), currentWed.getMonth(), currentWed.getDate() + 6);
      setWeekRangeStr(`${formatDisplayDate(currentWed)} – ${formatDisplayDate(currentTue)}`);
      
      const q = query(collection(db, 'timesheets'), where('userId', '==', userId));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch {
        querySnapshot = await getDocsFromCache(q);
      }
      
      const validWeekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentWed.getFullYear(), currentWed.getMonth(), currentWed.getDate() + i);
        return formatDisplayDate(d);
      });
      
      let total = 0;
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
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
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchStaffWeeklyHours();
    }
  }, [userId, fetchStaffWeeklyHours]);

  // Load existing entry documents for selected date
  useEffect(() => {
    let isMounted = true;
    async function loadDayEntries() {
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
          const loadedSites = querySnapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: Date.now() + Math.random(),
              project: data.project || '',
              startTime: data.timeCardDetails?.startTime || '07:00',
              timeFinished: data.timeCardDetails?.timeFinished || (isFriday(selectedDate) ? '15:30' : '16:30'),
              timeLeftSite: data.timeCardDetails?.timeLeftSite || '',
              timeReturned: data.timeCardDetails?.timeReturned || '',
              tasks: (data.tasks || []).map((t) => ({
                id: Date.now() + Math.random(),
                categoryGroup: t.taskCategoryGroup || t.categoryGroup || "Framing & Envelope",
                taskName: t.taskName || t.category || "Wall Framing",
                hours: t.hours !== undefined ? String(t.hours) : (isFriday(selectedDate) ? '8' : '9.25'),
                travelTime: t.travelTime !== undefined ? String(t.travelTime) : '',
                comments: t.comments || ''
              }))
            };
          });
          setSiteEntries(loadedSites);
        } else {
          const defaultProject = localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name') || '';
          setSiteEntries([createBlankSite(selectedDate, defaultProject)]);
        }
      } catch (err) {
        console.warn("Cache load note:", err);
      } font-medium {
        if (isMounted) setFetchingDay(false);
      }
    }
    loadDayEntries();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, userId]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWednesday.getFullYear(), currentWednesday.getMonth(), currentWednesday.getDate() + i);
    return {
      dateStr: formatDate(day),
      dayName: day.toLocaleDateString('en-NZ', { weekday: 'short' }),
      dayNumber: String(day.getDate()).padStart(2, '0'),
      monthName: day.toLocaleDateString('en-NZ', { month: 'short' })
    };
  });

  const grandTotalHours = siteEntries.reduce((sum, site) => {
    return sum + site.tasks.reduce((tSum, t) => tSum + (parseFloat(t.hours) || 0), 0);
  }, 0);

  // Helper functions for updating multi-site state
  const addSiteBlock = () => {
    setSiteEntries((prev) => [...prev, createBlankSite(selectedDate, '')]);
  };

  const removeSiteBlock = (siteId) => {
    setSiteEntries((prev) => prev.filter((site) => site.id !== siteId));
  };

  const updateSiteField = (siteId, field, value) => {
    setSiteEntries((prev) =>
      prev.map((site) => (site.id === siteId ? { ...site, [field]: value } : site))
    );
  };

  const addTaskToSite = (siteId) => {
    setSiteEntries((prev) =>
      prev.map((site) =>
        site.id === siteId
          ? { ...site, tasks: [...site.tasks, createBlankTask(selectedDate)] }
          : site
      )
    );
  };

  const removeTaskFromSite = (siteId, taskId) => {
    setSiteEntries((prev) =>
      prev.map((site) =>
        site.id === siteId
          ? { ...site, tasks: site.tasks.filter((t) => t.id !== taskId) }
          : site
      )
    );
  };

  const updateTaskInSite = (siteId, taskId, field, value) => {
    setSiteEntries((prev) =>
      prev.map((site) => {
        if (site.id !== siteId) return site;
        const updatedTasks = site.tasks.map((t) => {
          if (t.id !== taskId) return t;
          if (field === 'categoryGroup') {
            return { ...t, categoryGroup: value, taskName: TASK_CATEGORIES[value][0] };
          }
          return { ...t, [field]: value };
        });
        return { ...site, tasks: updatedTasks };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (grandTotalHours <= 0) {
      alert("Please enter valid task hours before submitting.");
      return;
    }

    setLoading(true);
    let updatedSitesList = [...existingSites];

    try {
      for (const site of siteEntries) {
        const siteTotalHours = site.tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
        const projectTitle = site.project.trim() || "General / Unassigned";
        const safeSiteKey = projectTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const docId = `${userId}_${selectedDate}_${safeSiteKey}`;

        const payload = {
          userId,
          userName,
          companyCode: activeProfile?.companyCode || activeProfile?.companyId || 'SJR Builders',
          project: projectTitle,
          date: selectedDate,
          timeCardDetails: {
            startTime: site.startTime,
            timeFinished: site.timeFinished,
            timeLeftSite: site.timeLeftSite,
            timeReturned: site.timeReturned
          },
          tasks: site.tasks.map((t) => ({
            taskCategoryGroup: t.categoryGroup,
            taskName: t.taskName,
            hours: parseFloat(t.hours) || 0,
            travelTime: t.travelTime ? parseFloat(t.travelTime) : 0,
            comments: t.comments
          })),
          totalHours: siteTotalHours,
          status: 'pending',
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'timesheets', docId), payload, { merge: true });

        if (site.project && !updatedSitesList.includes(site.project.trim())) {
          updatedSitesList.push(site.project.trim());
        }
      }

      setExistingSites(updatedSitesList);
      localStorage.setItem('sjr_known_sites', JSON.stringify(updatedSitesList));
      if (siteEntries[0]?.project) {
        localStorage.setItem(`sjr_last_project_${userId}`, siteEntries[0].project);
        localStorage.setItem('last_site_name', siteEntries[0].project);
      }

      await fetchStaffWeeklyHours();
      setStatusMessage({
        type: 'success',
        text: isOnline
          ? `Entries saved for ${displayDate(selectedDate)}!`
          : `Saved locally! Will sync automatically when back online.`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Submission error:", err);
      setStatusMessage({ type: 'error', text: "Could not write entries. Check storage settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      const response = await fetch('/Blank Time Cards.docx');
      if (!response.ok) {
        throw new Error("Template file 'Blank Time Cards.docx' not found in public root.");
      }
      const templateArrayBuffer = await response.arrayBuffer();

      const normalizeDateStr = (str) => {
        if (!str) return '';
        const formatted = displayDate(str);
        const parts = formatted.split('/');
        if (parts.length === 3) {
          return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
        }
        return str;
      };

      const validDisplayDates = weekDays.map((d) => normalizeDateStr(d.dateStr));
      let weeklyEntries = [];

      if (userId) {
        const q = query(collection(db, 'timesheets'), where('userId', '==', userId));
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch {
          querySnapshot = await getDocsFromCache(q);
        }
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (validDisplayDates.includes(normalizeDateStr(data.date))) {
            weeklyEntries.push(data);
          }
        });
      }

      if (weeklyEntries.length === 0) {
        setStatusMessage({ type: 'error', text: "No submitted entries found for this week to export." });
        setTimeout(() => setStatusMessage(null), 4000);
        setExportingDocx(false);
        return;
      }

      const siteMap = {};
      weeklyEntries.forEach((entry) => {
        const siteName = entry.project || "General / Unassigned";
        if (!siteMap[siteName]) {
          siteMap[siteName] = [];
        }
        siteMap[siteName].push(entry);
      });

      const sitesToExport = Object.keys(siteMap);

      for (const siteName of sitesToExport) {
        const siteEntries = siteMap[siteName];
        const zip = new PZip(templateArrayBuffer);
        let docXmlStr = zip.file("word/document.xml").asText();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");
        const rows = xmlDoc.getElementsByTagName("w:tr");
        const paragraphs = xmlDoc.getElementsByTagName("w:p");

        for (let p of paragraphs) {
          const tNodes = p.getElementsByTagName("w:t");
          if (tNodes.length === 0) continue;

          let fullText = "";
          for (let i = 0; i < tNodes.length; i++) {
            fullText += tNodes[i].textContent;
          }

          if (fullText.includes("Staff Member") || fullText.includes("Project")) {
            let staffContained = !fullText.includes("Staff Member") || Array.from(tNodes).some(n => n.textContent.includes("Staff Member"));
            let projectContained = !fullText.includes("Project") || Array.from(tNodes).some(n => n.textContent.includes("Project"));

            if (staffContained && projectContained) {
              let needsStaffColonWipe = false;
              let needsProjectColonWipe = false;

              for (let i = 0; i < tNodes.length; i++) {
                let nodeText = tNodes[i].textContent;
                let modified = false;

                if (nodeText.includes("Staff Member")) {
                  if (nodeText.includes("Staff Member:")) {
                    nodeText = nodeText.replace(/Staff Member:\s*/, `Staff Member: ${userName} `);
                  } else {
                    nodeText = nodeText.replace("Staff Member", `Staff Member: ${userName} `);
                    needsStaffColonWipe = true;
                  }
                  modified = true;
                } 
                
                if (nodeText.includes("Project")) {
                  if (nodeText.includes("Project:")) {
                    nodeText = nodeText.replace(/Project:\s*/, `Project: ${siteName} `);
                  } else {
                    nodeText = nodeText.replace("Project", `Project: ${siteName} `);
                    needsProjectColonWipe = true;
                  }
                  modified = true;
                } 
                
                if (!modified && nodeText.includes(":")) {
                  if (needsStaffColonWipe) {
                    nodeText = nodeText.replace(":", "");
                    needsStaffColonWipe = false;
                    modified = true;
                  } else if (needsProjectColonWipe) {
                    nodeText = nodeText.replace(":", "");
                    needsProjectColonWipe = false;
                    modified = true;
                  }
                }

                if (modified) {
                  tNodes[i].textContent = nodeText;
                  tNodes[i].setAttribute("xml:space", "preserve");
                }
              }
            } else {
              let combinedText = "";
              if (fullText.includes("Staff Member") && fullText.includes("Project")) {
                combinedText = `Staff Member: ${userName}          Project: ${siteName}`;
              } else if (fullText.includes("Staff Member")) {
                combinedText = `Staff Member: ${userName}`;
              } else if (fullText.includes("Project")) {
                combinedText = `Project: ${siteName}`;
              }
              
              tNodes[0].textContent = combinedText;
              tNodes[0].setAttribute("xml:space", "preserve");
              for (let i = 1; i < tNodes.length; i++) {
                tNodes[i].textContent = "";
              }
            }
          }
        }

        function getCellText(cell) {
          const tNodes = cell.getElementsByTagName("w:t");
          let str = "";
          for (let tn of tNodes) str += tn.textContent;
          return str;
        }

        function setCellText(cell, text) {
          const tNodes = cell.getElementsByTagName("w:t");
          if (tNodes.length > 0) {
            tNodes[0].textContent = text;
            for (let i = 1; i < tNodes.length; i++) {
              tNodes[i].textContent = "";
            }
          } else {
            const pNodes = cell.getElementsByTagName("w:p");
            if (pNodes.length > 0) {
              const r = xmlDoc.createElement("w:r");
              const t = xmlDoc.createElement("w:t");
              t.textContent = text;
              r.appendChild(t);
              pNodes[0].appendChild(r);
            }
          }
        }

        function fillTimingRow(cells, timingKey, entries, days) {
          days.forEach((dayObj, idx) => {
            if (!cells[idx + 1]) return;
            const targetDate = normalizeDateStr(dayObj.dateStr);
            const entriesForDay = entries.filter(e => normalizeDateStr(e.date) === targetDate);
            const val = entriesForDay.map(e => e.timeCardDetails?.[timingKey]).filter(Boolean).join(" / ") || "";
            setCellText(cells[idx + 1], val);
          });
        }

        function fillTaskRow(cells, taskLabel, entries, days) {
          let rowTaskTotal = 0;
          days.forEach((dayObj, idx) => {
            if (!cells[idx + 1]) return;
            const targetDate = normalizeDateStr(dayObj.dateStr);
            const entriesForDay = entries.filter(e => normalizeDateStr(e.date) === targetDate);
            let dayTaskHours = 0;

            if (entriesForDay.length > 0 && taskLabel !== "") {
              entriesForDay.forEach(entryForDay => {
                if (entryForDay.tasks) {
                  entryForDay.tasks.forEach(t => {
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
            setCellText(cells[idx + 1], dayTaskHours > 0 ? String(dayTaskHours) : "");
          });
          if (cells[8]) {
            setCellText(cells[8], rowTaskTotal > 0 ? String(rowTaskTotal) : "");
          }
        }

        function fillTotalHoursRow(cells, entries, days) {
          let siteGrandTotalHours = 0;
          days.forEach((dayObj, idx) => {
            if (!cells[idx + 1]) return;
            const targetDate = normalizeDateStr(dayObj.dateStr);
            const entriesForDay = entries.filter(e => normalizeDateStr(e.date) === targetDate);
            let dayTotal = 0;
            entriesForDay.forEach(entryForDay => {
              if (entryForDay.tasks) {
                dayTotal += entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
              }
            });
            siteGrandTotalHours += dayTotal;
            setCellText(cells[idx + 1], dayTotal > 0 ? String(dayTotal) : "");
          });
          if (cells[8]) {
            setCellText(cells[8], siteGrandTotalHours > 0 ? String(siteGrandTotalHours) : "");
          }
        }

        function fillTravelRow(cells, entries, days) {
          let siteGrandTravelTotal = 0;
          days.forEach((dayObj, idx) => {
            if (!cells[idx + 1]) return;
            const targetDate = normalizeDateStr(dayObj.dateStr);
            const entriesForDay = entries.filter(e => normalizeDateStr(e.date) === targetDate);
            let dayTravel = 0;
            entriesForDay.forEach(entryForDay => {
              if (entryForDay.tasks) {
                dayTravel += entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.travelTime) || 0), 0);
              }
            });
            siteGrandTravelTotal += dayTravel;
            setCellText(cells[idx + 1], dayTravel > 0 ? String(dayTravel) : "");
          });
          if (cells[8]) {
            setCellText(cells[8], siteGrandTravelTotal > 0 ? String(siteGrandTravelTotal) : "");
          }
        }

        const cleanText = (str) => (str || '').replace(/\s+/g, ' ').trim();

        for (let tr of rows) {
          const cells = tr.getElementsByTagName("w:tc");
          if (cells.length === 0) continue;
          
          const firstCellText = getCellText(cells[0]).trim();
          
          if (firstCellText === "Date") {
            weekDays.forEach((dayObj, idx) => {
              if (cells[idx + 1]) {
                const dateParts = dayObj.dateStr.split('-');
                const displayDDMM = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : dayObj.dateStr;
                setCellText(cells[idx + 1], displayDDMM);
              }
            });
          } else if (firstCellText === "START TIME") {
            fillTimingRow(cells, "startTime", siteEntries, weekDays);
          } else if (firstCellText === "TIME LEFT SITE") {
            fillTimingRow(cells, "timeLeftSite", siteEntries, weekDays);
          } else if (firstCellText === "TIME RETURNED") {
            fillTimingRow(cells, "timeReturned", siteEntries, weekDays);
          } else if (firstCellText === "TIME FINISHED") {
            fillTimingRow(cells, "timeFinished", siteEntries, weekDays);
          } else if (firstCellText === "TOTAL HOURS") {
            fillTotalHoursRow(cells, siteEntries, weekDays);
          } else if (firstCellText === "Travel Time") {
            fillTravelRow(cells, siteEntries, weekDays);
          } else {
            const matchedTask = ALL_TEMPLATE_TASKS.find(task => cleanText(task) === cleanText(firstCellText));
            if (matchedTask) {
              fillTaskRow(cells, matchedTask, siteEntries, weekDays);
            }
          }
        }

        const serializer = new XMLSerializer();
        const updatedXmlStr = serializer.serializeToString(xmlDoc);
        zip.file("word/document.xml", updatedXmlStr);

        const blob = zip.generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        
        const safeUserName = userName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const safeSiteName = siteName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const weekStartStr = weekDays[0].dateStr;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TimeCard_${safeUserName}_${safeSiteName}_${weekStartStr}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setStatusMessage({ type: 'success', text: `Exported ${sitesToExport.length} site time card(s) matching template!` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("DOCX export error:", err);
      setStatusMessage({ type: 'error', text: "Failed to generate DOCX file from template." });
    } finally {
      setExportingDocx(false);
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
        {/* Header Bar */}
        <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={sjrLogo} alt="SJR Builders Logo" className="h-10 w-auto object-contain" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Weekly Time Card Entry</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Logged for: <span className="text-slate-800 font-semibold">{userName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={exportingDocx}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
            title="Download Time Card DOCX (One per Site)"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm10-10.5l-4-4 1.41-1.41L16 6.67V10.5z" />
            </svg>
            <span>{exportingDocx ? "Generating..." : "Download DOCX"}</span>
          </button>
        </div>

        {/* 7-Day Navigation */}
        <div className="bg-slate-900 text-white p-3 rounded-xl mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs">
            <button
              type="button"
              onClick={() => {
                const p = new Date(currentWednesday.getFullYear(), currentWednesday.getMonth(), currentWednesday.getDate() - 7);
                setCurrentWednesday(p);
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
                  setCurrentWednesday(getWednesday(new Date()));
                  setSelectedDate(todayStr);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-md font-bold transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = new Date(currentWednesday.getFullYear(), currentWednesday.getMonth(), currentWednesday.getDate() + 7);
                  setCurrentWednesday(n);
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
            Loading entries for {displayDate(selectedDate)}...
          </div>
        )}

        {statusMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            statusMessage.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            <span>{statusMessage.type === 'error' ? '⚠️' : '✓'}</span>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Selected Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setCurrentWednesday(getWednesday(e.target.value));
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Site Entries List */}
          {siteEntries.map((siteItem, siteIndex) => {
            const siteHours = siteItem.tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
            return (
              <div key={siteItem.id} className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-4 relative">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                    Site #{siteIndex + 1} ({siteHours} hrs)
                  </span>
                  {siteEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSiteBlock(siteItem.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                    >
                      Remove Site
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Project Name / Site
                  </label>
                  <SiteAutoCompleteInput
                    value={siteItem.project}
                    onChange={(val) => updateSiteField(siteItem.id, 'project', val)}
                    existingSites={existingSites}
                  />
                </div>

                {/* On-Site Hours for this Site */}
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="block text-xs font-bold text-slate-700 uppercase mb-2">On-Site Hours (Optional)</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-500 font-medium">Start Time</label>
                      <input
                        type="time"
                        value={siteItem.startTime}
                        onChange={(e) => updateSiteField(siteItem.id, 'startTime', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium">Time Finished</label>
                      <input
                        type="time"
                        value={siteItem.timeFinished}
                        onChange={(e) => updateSiteField(siteItem.id, 'timeFinished', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium">Time Left Site</label>
                      <input
                        type="time"
                        value={siteItem.timeLeftSite}
                        onChange={(e) => updateSiteField(siteItem.id, 'timeLeftSite', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium">Time Returned</label>
                      <input
                        type="time"
                        value={siteItem.timeReturned}
                        onChange={(e) => updateSiteField(siteItem.id, 'timeReturned', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 mt-0.5 text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Tasks List for this Site */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Tasks Completed</span>
                  </div>

                  {siteItem.tasks.map((taskItem, taskIndex) => (
                    <div key={taskItem.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Task #{taskIndex + 1}</span>
                        {siteItem.tasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTaskFromSite(siteItem.id, taskItem.id)}
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
                            onChange={(e) => updateTaskInSite(siteItem.id, taskItem.id, 'categoryGroup', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800"
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
                            onChange={(e) => updateTaskInSite(siteItem.id, taskItem.id, 'taskName', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800"
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
                            onChange={(e) => updateTaskInSite(siteItem.id, taskItem.id, 'hours', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Travel Time (Hrs)</label>
                          <input
                            type="number"
                            step="0.25"
                            value={taskItem.travelTime}
                            onChange={(e) => updateTaskInSite(siteItem.id, taskItem.id, 'travelTime', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Comments / Work Details</label>
                        <textarea
                          rows="2"
                          value={taskItem.comments}
                          onChange={(e) => updateTaskInSite(siteItem.id, taskItem.id, 'comments', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addTaskToSite(siteItem.id)}
                    className="w-full py-2 px-3 border border-dashed border-emerald-600 text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 text-xs transition-colors"
                  >
                    + Add Task to {siteItem.project || "Site"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Another Site Button */}
          <button
            type="button"
            onClick={addSiteBlock}
            className="w-full py-3 px-4 border-2 border-dashed border-blue-600 text-blue-700 font-bold rounded-xl hover:bg-blue-50 text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>+ Add Another Site For Today</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50 mt-4 cursor-pointer"
          >
            {loading ? "Saving Entries..." : `Submit Entries (${grandTotalHours} hrs total)`}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-400 mt-6 pt-3 border-t border-slate-100 hidden md:block">
          Version – August 2026
        </div>
      </div>
    </div>
  );
}
