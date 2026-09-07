// src/TimesheetEntry.jsx
import React, { useState, useEffect, useRef } from 'react';
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

// Import docx via Skypack CDN
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  ImageRun,
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  ShadingType 
} from 'https://cdn.skypack.dev/docx';

// Import logo for UI view
import sjrLogo from './assets/logo.jpg';

// Base64 Data URI representing your SJR BUILDERS / BUILDING PERFECTION JPG
const SJR_LOGO_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...[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]";

// Helper to convert Base64 Data URI to Uint8Array for docx ImageRun
const base64ToUint8Array = (base64) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

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

// Exact template tasks matching "Blank Time Cards_2.docx" layout
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
  "Other (PTO)",
  "Sick Leave",
  "Annual Leave",
  "Bereavement Leave",
  "Training",
  "Other Leave (please specify)",
  "" // Blank row preceding TOTAL HOURS matching template layout
];

function getWednesday(d) {
  const date = new Date(d);
  const day = date.getDay(); 
  const diff = date.getDate() - ((day + 4) % 7);
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

function getFormattedStaffName(user, userProfile) {
  const explicitName = userProfile?.name || userProfile?.fullName || userProfile?.userName || user?.displayName;
  
  if (explicitName && explicitName.trim() !== '' && !explicitName.includes('@')) {
    return explicitName.trim();
  }

  const email = userProfile?.email || user?.email || '';
  if (email.includes('@')) {
    const handle = email.split('@')[0];
    return handle
      .split(/[\._\-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  return 'Staff Member';
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
    const matches = existingSites.filter((site) =>
      site.toLowerCase().includes(queryText)
    );

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
  const [currentWednesday, setCurrentWednesday] = useState(() => getWednesday(new Date()));

  const [weeklyHours, setWeeklyHours] = useState(0);
  const [weekRangeStr, setWeekRangeStr] = useState('');
  const [loadingHours, setLoadingHours] = useState(true);

  const [startTime, setStartTime] = useState('07:00');
  const [timeFinished, setTimeFinished] = useState(() => isFriday(formatDate(new Date())) ? '15:30' : '16:30');
  const [timeLeftSite, setTimeLeftSite] = useState('');
  const [timeReturned, setTimeReturned] = useState('');

  const [tasks, setTasks] = useState(() => [DEFAULT_BLANK_TASK(formatDate(new Date()))]);

  const [loading, setLoading] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [fetchingDay, setFetchingDay] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

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
        querySnapshot.forEach((doc) => {
          const data = doc.data();
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
    const day = new Date(currentWednesday);
    day.setDate(currentWednesday.getDate() + i);
    return {
      dateStr: formatDate(day),
      dayName: day.toLocaleDateString('en-NZ', { weekday: 'short' }),
      dayNumber: String(day.getDate()).padStart(2, '0'),
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
      companyCode: activeProfile?.companyCode || activeProfile?.companyId || 'SJR Builders',
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
      await addDoc(collection(db, 'timesheets'), payload);

      setWeeklyHours((prev) => prev + totalHours);

      if (project && !existingSites.includes(project)) {
        const updated = [...existingSites, project];
        setExistingSites(updated);
        localStorage.setItem('sjr_known_sites', JSON.stringify(updated));
      }

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

  // Option 3 DOCX Export: Embeds base64 logo directly into Word document
  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      const tableBorderColor = "000000";

      const thinBorder = {
        top: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
        left: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
        right: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
      };

      const createCell = ({
        text = "",
        bold = false,
        align = AlignmentType.LEFT,
        widthPct = null,
        colSpan = 1,
        shading = null,
        fontSize = 16,
        customChildren = null
      }) => {
        return new TableCell({
          columnSpan: colSpan,
          width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
          shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
          borders: thinBorder,
          margins: { top: 15, bottom: 15, left: 30, right: 30 },
          children: customChildren || [
            new Paragraph({
              alignment: align,
              children: [new TextRun({ text: String(text || ""), bold, size: fontSize, font: "Arial" })]
            })
          ]
        });
      };

      // Helper to build logo ImageRun directly from Base64
      const createLogoRun = () => {
        try {
          const logoBytes = base64ToUint8Array(SJR_LOGO_BASE64);
          return new ImageRun({
            data: logoBytes,
            transformation: {
              width: 130,
              height: 52 // Maintains original 2.5:1 aspect ratio
            }
          });
        } catch (e) {
          console.warn("Could not process base64 logo, using text fallback:", e);
          return new TextRun({
            text: "SJR BUILDERS",
            bold: true,
            size: 18,
            font: "Arial",
            color: "D3D3D3"
          });
        }
      };

      const daysHeader = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
      const validWeekDates = weekDays.map((d) => d.dateStr);

      let weeklyEntries = [];
      if (userId) {
        const q = query(collection(db, 'timesheets'), where('userId', '==', userId));
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch {
          querySnapshot = await getDocsFromCache(q);
        }

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (validWeekDates.includes(data.date)) {
            weeklyEntries.push(data);
          }
        });
      }

      const activeHasSaved = weeklyEntries.some(e => e.date === selectedDate);
      if (!activeHasSaved && totalHours > 0) {
        weeklyEntries.push({
          project: project || "General / Unassigned",
          date: selectedDate,
          timeCardDetails: { startTime, timeFinished, timeLeftSite, timeReturned },
          tasks: tasks.map(t => ({
            taskName: t.taskName,
            hours: parseFloat(t.hours) || 0,
            travelTime: parseFloat(t.travelTime) || 0,
            comments: t.comments
          }))
        });
      }

      const siteMap = {};
      weeklyEntries.forEach((entry) => {
        const siteName = entry.project || project || "General / Unassigned";
        if (!siteMap[siteName]) {
          siteMap[siteName] = [];
        }
        siteMap[siteName].push(entry);
      });

      const sitesToExport = Object.keys(siteMap);
      if (sitesToExport.length === 0) {
        sitesToExport.push(project || "General / Unassigned");
        siteMap[project || "General / Unassigned"] = [{
          project: project || "General / Unassigned",
          date: selectedDate,
          timeCardDetails: { startTime, timeFinished, timeLeftSite, timeReturned },
          tasks
        }];
      }

      for (const siteName of sitesToExport) {
        const siteEntries = siteMap[siteName];
        const tableRows = [];

        // Row 1: Header
        tableRows.push(
          new TableRow({
            children: [
              createCell({ text: "Day", bold: true, widthPct: 40 }),
              ...daysHeader.map((day) =>
                createCell({ text: day, bold: true, align: AlignmentType.CENTER, widthPct: 7.5 })
              ),
              createCell({ text: "Totals", bold: true, align: AlignmentType.RIGHT, widthPct: 8 })
            ]
          })
        );

        // Row 2: Date
        tableRows.push(
          new TableRow({
            children: [
              createCell({ text: "Date", bold: true }),
              ...weekDays.map((d) => createCell({ text: `${d.dayNumber}/${d.dateStr.split('-')[1] || ''}`, align: AlignmentType.CENTER })),
              createCell({ text: "", align: AlignmentType.CENTER })
            ]
          })
        );

        // Timing Rows
        const timingFields = [
          { label: "START TIME", key: "startTime" },
          { label: "TIME LEFT SITE", key: "timeLeftSite" },
          { label: "TIME RETURNED", key: "timeReturned" },
          { label: "TIME FINISHED", key: "timeFinished" }
        ];

        timingFields.forEach((tf) => {
          const cells = [createCell({ text: tf.label, bold: true })];
          weekDays.forEach((dayObj) => {
            const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
            const val = entryForDay?.timeCardDetails?.[tf.key] || "";
            cells.push(createCell({ text: val, align: AlignmentType.CENTER }));
          });
          cells.push(createCell({ text: "" }));
          tableRows.push(new TableRow({ children: cells }));
        });

        // Task Rows
        let siteGrandTotalHours = 0;
        let siteGrandTravelTotal = 0;

        ALL_TEMPLATE_TASKS.forEach((taskLabel) => {
          let rowTaskTotal = 0;
          let firstCell;

          if (taskLabel === "Other (PTO)") {
            firstCell = createCell({
              customChildren: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Other", size: 16, font: "Arial" }),
                    new TextRun({ text: "\t\t\t\t\t\t(PTO)", size: 16, font: "Arial" })
                  ]
                })
              ]
            });
          } else {
            firstCell = createCell({ text: taskLabel });
          }

          const rowCells = [firstCell];

          weekDays.forEach((dayObj) => {
            const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
            let dayTaskHours = 0;

            if (entryForDay?.tasks && taskLabel !== "") {
              entryForDay.tasks.forEach((t) => {
                const nameMatches = (t.taskName || '').toLowerCase().trim() === taskLabel.toLowerCase().trim() ||
                  (taskLabel.startsWith("Other (PTO)") && (t.taskName || '').toLowerCase().includes("other work")) ||
                  (taskLabel.startsWith("Other Leave") && (t.taskName || '').toLowerCase().includes("other leave"));
                
                if (nameMatches) {
                  dayTaskHours += parseFloat(t.hours) || 0;
                }
              });
            }

            rowTaskTotal += dayTaskHours;
            rowCells.push(createCell({
              text: dayTaskHours > 0 ? String(dayTaskHours) : "",
              align: AlignmentType.CENTER
            }));
          });

          siteGrandTotalHours += rowTaskTotal;
          rowCells.push(createCell({
            text: rowTaskTotal > 0 ? String(rowTaskTotal) : "",
            bold: true,
            align: AlignmentType.RIGHT
          }));

          tableRows.push(new TableRow({ children: rowCells }));
        });

        // TOTAL HOURS Row
        const totalHoursCells = [createCell({ text: "TOTAL HOURS", bold: true })];
        weekDays.forEach((dayObj) => {
          const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
          let dayTotal = 0;
          if (entryForDay?.tasks) {
            dayTotal = entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
          }
          totalHoursCells.push(createCell({
            text: dayTotal > 0 ? String(dayTotal) : "",
            bold: true,
            align: AlignmentType.CENTER
          }));
        });
        totalHoursCells.push(createCell({ text: String(siteGrandTotalHours), bold: true, align: AlignmentType.RIGHT }));
        tableRows.push(new TableRow({ children: totalHoursCells }));

        // Travel Time Row
        const travelCells = [createCell({ text: "Travel Time", bold: true })];
        weekDays.forEach((dayObj) => {
          const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
          let dayTravel = 0;
          if (entryForDay?.tasks) {
            dayTravel = entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.travelTime) || 0), 0);
          }
          siteGrandTravelTotal += dayTravel;
          travelCells.push(createCell({ text: dayTravel > 0 ? String(dayTravel) : "", align: AlignmentType.CENTER }));
        });
        travelCells.push(createCell({ text: siteGrandTravelTotal > 0 ? String(siteGrandTravelTotal) : "", align: AlignmentType.RIGHT }));
        tableRows.push(new TableRow({ children: travelCells }));

        // Comments Section
        const allComments = [];
        siteEntries.forEach((entry) => {
          if (entry.tasks) {
            entry.tasks.forEach((t) => {
              if (t.comments && t.comments.trim()) {
                allComments.push(`${displayDate(entry.date)}: ${t.comments.trim()}`);
              }
            });
          }
        });

        const commentRows = [
          new TableRow({
            children: [createCell({ text: "COMMENTS", bold: true, colSpan: 9 })]
          }),
          new TableRow({
            children: [createCell({ text: "If Other – please detail what type of work you were undertaking", colSpan: 9, fontSize: 14 })]
          })
        ];

        if (allComments.length > 0) {
          commentRows.push(
            new TableRow({
              children: [createCell({ text: allComments.join(" | "), colSpan: 9, fontSize: 14 })]
            })
          );
        }

        for (let i = allComments.length > 0 ? 1 : 0; i < 20; i++) {
          commentRows.push(
            new TableRow({
              children: [createCell({ text: "", colSpan: 9 })]
            })
          );
        }

        // Build DOCX document with Option 3 Embedded Base64 Logo
        const doc = new Document({
          sections: [
            {
              properties: {
                page: {
                  margin: { top: 400, bottom: 400, left: 400, right: 400 }
                }
              },
              children: [
                // Top Header Line & Embedded Base64 Logo Image
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({ text: "Staff Member:", bold: true, size: 18, font: "Arial" }),
                    new TextRun({ text: `${userName}\t\t\t\t`, size: 18, font: "Arial" }),
                    new TextRun({ text: "Project:", bold: true, size: 18, font: "Arial" }),
                    new TextRun({ text: `${siteName}\t\t\t\t\t`, size: 18, font: "Arial" }),
                    createLogoRun()
                  ],
                  spaceAfter: 80
                }),

                // Primary Time Card Table
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: tableRows
                }),

                // Version Stamp
                new Paragraph({
                  children: [
                    new TextRun({ text: "Version – August 2026", size: 14, font: "Arial", italic: true })
                  ],
                  spaceBefore: 60,
                  spaceAfter: 180
                }),

                // Bottom Comments Box Header Block with Embedded Base64 Logo
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    createLogoRun()
                  ],
                  spaceAfter: 60
                }),

                // Comments Table
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: commentRows
                })
              ]
            }
          ]
        });

        const safeUserName = userName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const safeSiteName = siteName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const weekStartStr = weekDays[0].dateStr;

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TimeCard_${safeUserName}_${safeSiteName}_${weekStartStr}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setStatusMessage({
        type: 'success',
        text: `Exported ${sitesToExport.length} site time card(s) with embedded logo!`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("DOCX export error:", err);
      setStatusMessage({
        type: 'error',
        text: "Failed to generate DOCX file."
      });
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
            <img 
              src={sjrLogo} 
              alt="SJR Builders Logo" 
              className="h-10 w-auto object-contain"
            />
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
                const p = new Date(currentWednesday);
                p.setDate(p.getDate() - 7);
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
                  const n = new Date(currentWednesday);
                  n.setDate(n.getDate() + 7);
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
              <SiteAutoCompleteInput
                value={project}
                onChange={(val) => {
                  setProject(val);
                  if (userId) localStorage.setItem(`sjr_last_project_${userId}`, val);
                  localStorage.setItem('last_site_name', val);
                }}
                existingSites={existingSites}
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
                    setCurrentWednesday(getWednesday(e.target.value));
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
