// src/HealthAndSafetyHub.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebaseConfig';
import { collection, doc, setDoc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import PZip from 'pizzip';
import SignaturePadModal from './components/SignaturePadModal';
import sjrLogo from './assets/logo.jpg';

function SiteAutoCompleteInput({ value, onChange, existingSites }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setSuggestions(existingSites);
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
        placeholder="Select or enter site name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (existingSites.length > 0) {
            setSuggestions(existingSites);
            setIsOpen(true);
          }
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

function WorkerAutoCompleteInput({ value, onChange, registeredWorkers }) {
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
    const matches = registeredWorkers.filter((worker) =>
      worker.toLowerCase().includes(queryText)
    );
    setSuggestions(matches);
    setIsOpen(matches.length > 0);
  }, [value, registeredWorkers]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (workerName) => {
    onChange(workerName);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        placeholder="Full Name (type to search staff)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value && value.trim() !== '') {
            const queryText = value.toLowerCase().trim();
            const matches = registeredWorkers.filter((worker) =>
              worker.toLowerCase().includes(queryText)
            );
            setSuggestions(matches);
            setIsOpen(matches.length > 0);
          }
        }}
        className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        required
      />
      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg text-xs">
          {suggestions.map((worker, index) => (
            <li
              key={index}
              onClick={() => handleSelect(worker)}
              className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-slate-800 border-b border-slate-100 last:border-none flex justify-between items-center transition-colors font-medium"
            >
              <span>{worker}</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                App Worker
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const INSPECTION_TYPE = 'Site Safety Inspection Report';
const TOOLBOX_TYPE = 'H&S and Tool Box Meeting Worksheet';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const formatLocalISO = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Returns the Monday (YYYY-MM-DD) of the week containing dateInput
const getMondayOfWeek = (dateInput = new Date()) => {
  const d = typeof dateInput === 'string' ? parseLocalDate(dateInput) : new Date(dateInput);
  if (isNaN(d.getTime())) return formatLocalISO(new Date());
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
  return formatLocalISO(monday);
};

const sanitizeSlug = (val) =>
  (val || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();

const buildInspectionDocId = (site, weekStart) =>
  `inspection_${sanitizeSlug(site)}_${getMondayOfWeek(weekStart)}`;

const buildToolboxDocId = (location, date) =>
  `toolbox_${sanitizeSlug(location)}_${getMondayOfWeek(date)}`;

const defaultInspectionSections = {
  siteControl: [
    { item: "Accommodation and lunchroom clean and hygienic", complies: "Yes", action: "", contractor: "" },
    { item: "Toilet facilities clean and hygienic", complies: "Yes", action: "", contractor: "" },
    { item: "General housekeeping up to date", complies: "Yes", action: "", contractor: "" },
    { item: "Warning signs displayed", complies: "Yes", action: "", contractor: "" },
    { item: "Hazard identification up to date", complies: "Yes", action: "", contractor: "" },
    { item: "Site hoardings/fences in place", complies: "Yes", action: "", contractor: "" },
    { item: "Hazardous materials stored safely", complies: "Yes", action: "", contractor: "" },
  ],
  firstAid: [
    { item: "First Aid boxes are available and stocked", complies: "Yes", action: "", contractor: "" },
    { item: "Accident Register is available", complies: "Yes", action: "", contractor: "" },
    { item: "Fire Extinguisher is available and current", complies: "Yes", action: "", contractor: "" },
    { item: "Evacuation Procedure current – emergencies included", complies: "Yes", action: "", contractor: "" },
  ],
  personalSafety: [
    { item: "Signage displayed and legible", complies: "Yes", action: "", contractor: "" },
    { item: "Hardhats being worn", complies: "Yes", action: "", contractor: "" },
    { item: "Correct footwear being worn", complies: "Yes", action: "", contractor: "" },
    { item: "Glasses/earmuffs/vests/masks used", complies: "Yes", action: "", contractor: "" },
  ],
  tidiness: [
    { item: "Routes in/out clear", complies: "Yes", action: "", contractor: "" },
    { item: "Site office clearly defined for visitors", complies: "Yes", action: "", contractor: "" },
    { item: "Loose materials secure from wind", complies: "Yes", action: "", contractor: "" },
  ],
  excavations: [
    { item: "Correctly shored and secured – isolated if possible", complies: "Yes", action: "", contractor: "" },
  ],
  electrical: [
    { item: "Main board locked and waterproof", complies: "Yes", action: "", contractor: "" },
    { item: "Condition and position of cables and leads", complies: "Yes", action: "", contractor: "" },
    { item: "3 monthly tags on all tools and leads", complies: "Yes", action: "", contractor: "" },
    { item: "RCD’s in use and tagged", complies: "Yes", action: "", contractor: "" },
    { item: "No domestic multi boxes being used", complies: "Yes", action: "", contractor: "" },
  ],
  equipment: [
    { item: "Equipment in good condition", complies: "Yes", action: "", contractor: "" },
    { item: "Appropriate guards on equipment", complies: "Yes", action: "", contractor: "" },
    { item: "Adequate temporary lighting", complies: "Yes", action: "", contractor: "" },
  ],
  scaffolding: [
    { item: "Penetrations/holes identified and guarded", complies: "Yes", action: "", contractor: "" },
    { item: "Safety harnesses and lines maintained and approved for use", complies: "Yes", action: "", contractor: "" },
    { item: "Notifiable weekly Scaff tag current", complies: "Yes", action: "", contractor: "" },
    { item: "Handrails/mid rails", complies: "Yes", action: "", contractor: "" },
    { item: "Toe boards", complies: "Yes", action: "", contractor: "" },
    { item: "Platforms", complies: "Yes", action: "", contractor: "" },
    { item: "Ladders/stairs", complies: "Yes", action: "", contractor: "" },
    { item: "Base Sound", complies: "Yes", action: "", contractor: "" },
    { item: "Work Platforms clear", complies: "Yes", action: "", contractor: "" },
    { item: "Platforms trip free", complies: "Yes", action: "", contractor: "" },
    { item: "Planks tied down", complies: "Yes", action: "", contractor: "" },
    { item: "Headroom clear", complies: "Yes", action: "", contractor: "" },
    { item: "Ties/bracing adequate", complies: "Yes", action: "", contractor: "" },
    { item: "Lift shafts/stairs", complies: "Yes", action: "", contractor: "" },
  ],
  ladders: [
    { item: "Good condition", complies: "Yes", action: "", contractor: "" },
    { item: "Secured top and bottom", complies: "Yes", action: "", contractor: "" },
    { item: "Stays to step ladders", complies: "Yes", action: "", contractor: "" },
    { item: "Working 2 steps down", complies: "Yes", action: "", contractor: "" },
  ],
  powderTools: [
    { item: "Tools certificated", complies: "Yes", action: "", contractor: "" },
    { item: "Operators certificated", complies: "Yes", action: "", contractor: "" },
    { item: "PPE worn", complies: "Yes", action: "", contractor: "" },
    { item: "Tools/charges stored in a secure place", complies: "Yes", action: "", contractor: "" },
    { item: "Notice displayed", complies: "Yes", action: "", contractor: "" },
  ],
  welding: [
    { item: "Hot Works permits being used", complies: "Yes", action: "", contractor: "" },
    { item: "Bottles secure or in stand", complies: "Yes", action: "", contractor: "" },
    { item: "Gauges/plugs/leads/hoses maintained", complies: "Yes", action: "", contractor: "" },
    { item: "Welding screens", complies: "Yes", action: "", contractor: "" },
    { item: "Flashback arresters", complies: "Yes", action: "", contractor: "" },
    { item: "Extinguisher readily accessible", complies: "Yes", action: "", contractor: "" },
    { item: "Operators using PPE", complies: "Yes", action: "", contractor: "" },
  ],
  plant: [
    { item: "Service Certificate maintained", complies: "Yes", action: "", contractor: "" },
    { item: "Warning devices (horn/reverse beeper)", complies: "Yes", action: "", contractor: "" },
    { item: "Mirrors fitted", complies: "Yes", action: "", contractor: "" },
    { item: "Seatbelts fitted", complies: "Yes", action: "", contractor: "" },
    { item: "Roll over structures (ROPS) fitted", complies: "Yes", action: "", contractor: "" },
  ],
  cranes: [
    { item: "Proper lift assessment plan completed", complies: "Yes", action: "", contractor: "" },
    { item: "Current test certificate", complies: "Yes", action: "", contractor: "" },
    { item: "Current test certificate for slings/chains/hooks", complies: "Yes", action: "", contractor: "" },
    { item: "Slings/chains certified", complies: "Yes", action: "", contractor: "" },
    { item: "Operator Procedures in place", complies: "Yes", action: "", contractor: "" },
    { item: "Emergency Plan in place", complies: "Yes", action: "", contractor: "" },
  ],
  ewp: [
    { item: "Log book filled in before use", complies: "Yes", action: "", contractor: "" },
    { item: "Tyres inflated", complies: "Yes", action: "", contractor: "" },
    { item: "Harnesses available for cherry pickers", complies: "Yes", action: "", contractor: "" },
    { item: "Current test certificate", complies: "Yes", action: "", contractor: "" },
  ],
  hazardousGoods: [
    { item: "Materials clearly labelled", complies: "Yes", action: "", contractor: "" },
    { item: "Material safety data sheets available", complies: "Yes", action: "", contractor: "" },
    { item: "Materials safely stored", complies: "Yes", action: "", contractor: "" },
    { item: "No smoking sign displayed", complies: "Yes", action: "", contractor: "" },
  ]
};

const createDefaultToolboxData = (dateStr, timeStr, userNameVal, locationVal = '') => ({
  date: dateStr,
  time: timeStr,
  location: locationVal,
  previousActions: [
    { item: "Health and Safety", action: "", followUp: "" },
    { item: "Event Investigations", action: "", followUp: "" },
    { item: "Hazards", action: "", followUp: "" },
    { item: "Plant and Equipment", action: "", followUp: "" },
    { item: "Task Planning and Weekly Goals", action: "", followUp: "" },
    { item: "Operational Issues/other Business", action: "", followUp: "" },
    { item: "Other", action: "", followUp: "" },
  ],
  siteSafetyReview: [{ details: "", action: "", whoWhen: "" }],
  workerTraining: [{ details: "", action: "", whoWhen: "" }],
  eventInvestigations: [{ details: "", action: "", whoWhen: "" }],
  hazards: [{ hazard: "", action: "", whoWhen: "" }],
  hazardBoard: [{ item: "", update: "", whoWhen: "" }],
  plantEquipment: [{ requirement: "", action: "", whoWhen: "" }],
  taskPlanning: [{ task: "", ppe: "", timeframe: "", whoWhen: "" }],
  taskPlanningDiscussion: "",
  operationalIssues: "",
  attendees: [
    { name: userNameVal || '', company: 'SJR Builders', signature: '', date: dateStr }
  ],
  managementSignature: '',
  managementDate: dateStr
});

const createDefaultInspectionData = (weekEndingStr, timeStr, userNameVal, siteVal = '') => ({
  site: siteVal,
  weekEnding: weekEndingStr,
  time: timeStr,
  inspectedBy: userNameVal || '',
  signature: '',
  dateSigned: weekEndingStr,
  sections: defaultInspectionSections
});

export default function HealthAndSafetyHub({ userId, userName }) {
  const initialMonday = getMondayOfWeek(new Date());

  const [hsSubView, setHsSubView] = useState('inspection');
  const [loading, setLoading] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [reportsError, setReportsError] = useState(null);
  const [savedSites, setSavedSites] = useState([]);
  const [registeredWorkers, setRegisteredWorkers] = useState([]);
  const [autoFillContractor, setAutoFillContractor] = useState(true);

  // Stores the Monday (YYYY-MM-DD) of the selected week
  const [currentWeek, setCurrentWeek] = useState(initialMonday);
  // Shared active site and active date across Inspection & Toolbox views
  const [activeSite, setActiveSite] = useState('');
  const [activeDate, setActiveDate] = useState(initialMonday);

  const [allExistingReports, setAllExistingReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');

  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [activeSignatureTarget, setActiveSignatureTarget] = useState(null);

  const getCurrentTimeString = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const d = parseLocalDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const handleAutoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const getReportMonday = (rep) => {
    const rawDate = rep.weekStarting || rep.weekEnding || rep.date;
    return rawDate ? getMondayOfWeek(rawDate) : '';
  };

  const fetchAllReports = async () => {
    setReportsError(null);
    try {
      const snapshot = await getDocs(collection(db, 'health_safety'));
      const reports = [];
      const sitesSet = new Set();

      snapshot.forEach(docSnap => {
        const docId = docSnap.id;
        const docData = docSnap.data();

        let inferredType = docData.type;
        if (!inferredType) {
          if (docId.startsWith('toolbox_') || docData.attendees || docData.taskPlanning) {
            inferredType = TOOLBOX_TYPE;
          } else {
            inferredType = INSPECTION_TYPE;
          }
        }

        reports.push({ id: docId, ...docData, type: inferredType });
        const siteLabel = (docData.site || docData.location || '').trim();
        if (siteLabel) {
          sitesSet.add(siteLabel);
        }
      });

      const knownSitesRaw = localStorage.getItem('sjr_known_sites');
      if (knownSitesRaw) {
        const parsed = JSON.parse(knownSitesRaw);
        if (Array.isArray(parsed)) parsed.forEach(s => s && sitesSet.add(s.trim()));
      }

      setSavedSites(Array.from(sitesSet));
      setAllExistingReports(reports);
    } catch (err) {
      console.warn("Could not fetch H&S reports:", err);
      setReportsError(err.message || "Unable to load H&S reports from Firestore.");
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [userId]);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const workersSet = new Set();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const fullName = (data.name || data.userName || data.displayName || '').trim();
          if (fullName) workersSet.add(fullName);
        });
        if (userName && userName.trim()) {
          workersSet.add(userName.trim());
        }
        setRegisteredWorkers(Array.from(workersSet));
      } catch (err) {
        console.warn("Could not fetch workers list:", err);
      }
    };

    fetchWorkers();
  }, [userName]);

  const [inspectionData, setInspectionData] = useState(() =>
    createDefaultInspectionData(initialMonday, getCurrentTimeString(), userName || '', '')
  );

  const [toolboxData, setToolboxData] = useState(() =>
    createDefaultToolboxData(initialMonday, getCurrentTimeString(), userName || '', '')
  );

  const hydrateSubViewForSiteAndDate = async (targetView, siteVal, dateVal, mondayVal) => {
    const cleanSite = (siteVal || '').trim();
    const effectiveDate = dateVal || mondayVal;
    const effectiveMonday = getMondayOfWeek(effectiveDate);

    if (targetView === 'inspection') {
      const targetDocId = cleanSite ? buildInspectionDocId(cleanSite, effectiveMonday) : '';
      const existingLocal = targetDocId ? allExistingReports.find(r => r.id === targetDocId) : null;

      if (existingLocal) {
        setSelectedReportId(targetDocId);
        setInspectionData({
          ...createDefaultInspectionData(effectiveDate, getCurrentTimeString(), userName || '', cleanSite),
          ...existingLocal,
          site: existingLocal.site || cleanSite,
          weekEnding: existingLocal.weekEnding || effectiveDate,
          inspectedBy: existingLocal.inspectedBy || existingLocal.userName || userName || '',
          sections: existingLocal.sections || defaultInspectionSections
        });
        return;
      }

      if (targetDocId) {
        try {
          const docSnap = await getDoc(doc(db, 'health_safety', targetDocId));
          if (docSnap.exists()) {
            const found = docSnap.data();
            setSelectedReportId(targetDocId);
            setInspectionData({
              ...createDefaultInspectionData(effectiveDate, getCurrentTimeString(), userName || '', cleanSite),
              ...found,
              site: found.site || cleanSite,
              weekEnding: found.weekEnding || effectiveDate,
              inspectedBy: found.inspectedBy || found.userName || userName || '',
              sections: found.sections || defaultInspectionSections
            });
            return;
          }
        } catch (err) {
          console.warn("Could not load inspection doc on tab switch:", err);
        }
      }

      setSelectedReportId('');
      setInspectionData(prev => ({
        ...createDefaultInspectionData(effectiveDate, prev.time || getCurrentTimeString(), prev.inspectedBy || userName || '', cleanSite),
      }));
    } else {
      const targetDocId = cleanSite ? buildToolboxDocId(cleanSite, effectiveMonday) : '';
      const existingLocal = targetDocId ? allExistingReports.find(r => r.id === targetDocId) : null;

      if (existingLocal) {
        setSelectedReportId(targetDocId);
        setToolboxData(prev => ({
          ...createDefaultToolboxData(effectiveDate, getCurrentTimeString(), userName || '', cleanSite),
          ...existingLocal,
          location: existingLocal.location || existingLocal.site || cleanSite,
          date: existingLocal.date || effectiveDate,
          previousActions: existingLocal.previousActions || prev.previousActions,
          siteSafetyReview: existingLocal.siteSafetyReview || prev.siteSafetyReview,
          workerTraining: existingLocal.workerTraining || prev.workerTraining,
          eventInvestigations: existingLocal.eventInvestigations || prev.eventInvestigations,
          hazards: existingLocal.hazards || prev.hazards,
          hazardBoard: existingLocal.hazardBoard || prev.hazardBoard,
          plantEquipment: existingLocal.plantEquipment || prev.plantEquipment,
          taskPlanning: existingLocal.taskPlanning || prev.taskPlanning,
          attendees: existingLocal.attendees || prev.attendees
        }));
        return;
      }

      if (targetDocId) {
        try {
          const docSnap = await getDoc(doc(db, 'health_safety', targetDocId));
          if (docSnap.exists()) {
            const found = docSnap.data();
            setSelectedReportId(targetDocId);
            setToolboxData(prev => ({
              ...createDefaultToolboxData(effectiveDate, getCurrentTimeString(), userName || '', cleanSite),
              ...found,
              location: found.location || found.site || cleanSite,
              date: found.date || effectiveDate,
              previousActions: found.previousActions || prev.previousActions,
              siteSafetyReview: found.siteSafetyReview || prev.siteSafetyReview,
              workerTraining: found.workerTraining || prev.workerTraining,
              eventInvestigations: found.eventInvestigations || prev.eventInvestigations,
              hazards: found.hazards || prev.hazards,
              hazardBoard: found.hazardBoard || prev.hazardBoard,
              plantEquipment: found.plantEquipment || prev.plantEquipment,
              taskPlanning: found.taskPlanning || prev.taskPlanning,
              attendees: found.attendees || prev.attendees
            }));
            return;
          }
        } catch (err) {
          console.warn("Could not load toolbox doc on tab switch:", err);
        }
      }

      setSelectedReportId('');
      setToolboxData(prev => ({
        ...createDefaultToolboxData(effectiveDate, prev.time || getCurrentTimeString(), userName || '', cleanSite),
      }));
    }
  };

  const handleSwitchSubView = async (nextView) => {
    if (nextView === hsSubView) return;

    const currentSiteVal = (
      hsSubView === 'inspection' ? inspectionData.site : toolboxData.location
    ).trim() || activeSite;

    const currentDateVal =
      (hsSubView === 'inspection' ? inspectionData.weekEnding : toolboxData.date) || activeDate || currentWeek;

    const mondayVal = getMondayOfWeek(currentDateVal);

    setActiveSite(currentSiteVal);
    setActiveDate(currentDateVal);
    setCurrentWeek(mondayVal);
    setHsSubView(nextView);

    await hydrateSubViewForSiteAndDate(nextView, currentSiteVal, currentDateVal, mondayVal);
  };

  const handleShiftWeek = async (direction) => {
    const baseMonday = parseLocalDate(getMondayOfWeek(currentWeek));
    baseMonday.setDate(baseMonday.getDate() + (direction * 7));
    const newMondayStr = formatLocalISO(baseMonday);
    setCurrentWeek(newMondayStr);
    setActiveDate(newMondayStr);

    if (hsSubView === 'inspection') {
      setInspectionData(prev => ({ ...prev, weekEnding: newMondayStr, dateSigned: newMondayStr }));
    } else {
      setToolboxData(prev => ({ ...prev, date: newMondayStr, managementDate: newMondayStr }));
    }

    if (activeSite.trim()) {
      await hydrateSubViewForSiteAndDate(hsSubView, activeSite, newMondayStr, newMondayStr);
    } else {
      setSelectedReportId('');
    }
  };

  const handleThisWeek = async () => {
    const mondayStr = getMondayOfWeek(new Date());
    setCurrentWeek(mondayStr);
    setActiveDate(mondayStr);

    if (hsSubView === 'inspection') {
      setInspectionData(prev => ({ ...prev, weekEnding: mondayStr, dateSigned: mondayStr }));
    } else {
      setToolboxData(prev => ({ ...prev, date: mondayStr, managementDate: mondayStr }));
    }

    if (activeSite.trim()) {
      await hydrateSubViewForSiteAndDate(hsSubView, activeSite, mondayStr, mondayStr);
    } else {
      setSelectedReportId('');
    }
  };

  const targetFormType = hsSubView === 'inspection' ? INSPECTION_TYPE : TOOLBOX_TYPE;
  const activeMonday = getMondayOfWeek(currentWeek);

  const reportsForThisWeek = allExistingReports.filter(rep => {
    return rep.type === targetFormType && getReportMonday(rep) === activeMonday;
  });

  // Only show reports from the past 2 weeks (14 days prior to activeMonday up to day before activeMonday)
  const previousTwoWeeksReports = allExistingReports.filter(rep => {
    if (rep.type !== targetFormType) return false;
    const repMondayStr = getReportMonday(rep);
    if (!repMondayStr || repMondayStr === activeMonday) return false;

    const currentMondayDate = parseLocalDate(activeMonday);
    const repMondayDate = parseLocalDate(repMondayStr);
    const diffDays = Math.round((currentMondayDate - repMondayDate) / (1000 * 60 * 60 * 24));

    return diffDays > 0 && diffDays <= 14;
  });

  const handleSelectReportById = (reportId) => {
    setSelectedReportId(reportId);
    if (!reportId) return;

    const found = allExistingReports.find(r => r.id === reportId);
    if (!found) return;

    const repMonday = getReportMonday(found) || activeMonday;
    const repSite = (found.site || found.location || '').trim();
    const repDate = found.weekEnding || found.date || repMonday;

    setCurrentWeek(repMonday);
    setActiveSite(repSite);
    setActiveDate(repDate);

    if (hsSubView === 'inspection' && found.type === INSPECTION_TYPE) {
      setInspectionData({
        site: repSite,
        weekEnding: repDate,
        time: found.time || getCurrentTimeString(),
        inspectedBy: found.inspectedBy || found.userName || userName || '',
        signature: found.signature || '',
        dateSigned: found.dateSigned || repDate,
        sections: found.sections || defaultInspectionSections
      });
    } else if (hsSubView === 'toolbox' && found.type === TOOLBOX_TYPE) {
      setToolboxData(prev => ({
        date: repDate,
        time: found.time || getCurrentTimeString(),
        location: repSite,
        previousActions: found.previousActions || prev.previousActions,
        siteSafetyReview: found.siteSafetyReview || prev.siteSafetyReview,
        workerTraining: found.workerTraining || prev.workerTraining,
        eventInvestigations: found.eventInvestigations || prev.eventInvestigations,
        hazards: found.hazards || prev.hazards,
        hazardBoard: found.hazardBoard || prev.hazardBoard,
        plantEquipment: found.plantEquipment || prev.plantEquipment,
        taskPlanning: found.taskPlanning || prev.taskPlanning,
        taskPlanningDiscussion: found.taskPlanningDiscussion || '',
        operationalIssues: found.operationalIssues || '',
        attendees: found.attendees || prev.attendees,
        managementSignature: found.managementSignature || '',
        managementDate: found.managementDate || repDate
      }));
    }
  };

  const handleStartFreshForm = () => {
    setSelectedReportId('');
    setActiveSite('');
    setActiveDate(activeMonday);
    if (hsSubView === 'inspection') {
      setInspectionData(createDefaultInspectionData(activeMonday, getCurrentTimeString(), userName || '', ''));
    } else {
      setToolboxData(createDefaultToolboxData(activeMonday, getCurrentTimeString(), userName || '', ''));
    }
    setStatusMessage({ type: 'success', text: `Started a fresh ${targetFormType} for week starting ${activeMonday}.` });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSiteOrWeekChange = async (newSite, newDate) => {
    const mondayStr = getMondayOfWeek(newDate || currentWeek);
    setCurrentWeek(mondayStr);
    setActiveSite(newSite);
    setActiveDate(newDate);
    setInspectionData(prev => ({ ...prev, site: newSite, weekEnding: newDate }));

    if (!newSite || !newSite.trim() || !mondayStr) {
      setSelectedReportId('');
      return;
    }

    const docId = buildInspectionDocId(newSite, mondayStr);

    try {
      const docSnap = await getDoc(doc(db, 'health_safety', docId));
      if (docSnap.exists()) {
        const found = docSnap.data();
        setSelectedReportId(docId);
        setInspectionData(prev => ({
          ...prev,
          ...found,
          site: found.site || newSite,
          weekEnding: found.weekEnding || newDate,
          inspectedBy: found.inspectedBy || found.userName || prev.inspectedBy
        }));
        setStatusMessage({ type: 'success', text: `Loaded existing inspection for ${newSite} (Mon ${mondayStr}).` });
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setSelectedReportId('');
      }
    } catch (err) {
      console.warn("Error checking existing inspection doc:", err);
    }
  };

  const handleToolboxLocationOrDateChange = async (newLoc, newDate) => {
    const mondayStr = getMondayOfWeek(newDate || currentWeek);
    setCurrentWeek(mondayStr);
    setActiveSite(newLoc);
    setActiveDate(newDate);
    setToolboxData(prev => ({ ...prev, location: newLoc, date: newDate }));

    if (!newLoc || !newLoc.trim() || !mondayStr) {
      setSelectedReportId('');
      return;
    }

    const docId = buildToolboxDocId(newLoc, mondayStr);

    try {
      const docSnap = await getDoc(doc(db, 'health_safety', docId));
      if (docSnap.exists()) {
        const found = docSnap.data();
        setSelectedReportId(docId);
        setToolboxData(prev => ({
          ...prev,
          ...found,
          location: found.location || newLoc,
          date: found.date || newDate
        }));
        setStatusMessage({ type: 'success', text: `Loaded existing toolbox meeting for ${newLoc} (Mon ${mondayStr}).` });
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setSelectedReportId('');
      }
    } catch (err) {
      console.warn("Error checking existing toolbox doc:", err);
    }
  };

  const handleInspectionItemChange = (sectionKey, index, field, value) => {
    setInspectionData(prev => {
      const updatedSections = { ...prev.sections };
      if (field === 'contractor' && autoFillContractor) {
        Object.keys(updatedSections).forEach(sKey => {
          updatedSections[sKey] = updatedSections[sKey].map(row => ({
            ...row,
            contractor: value
          }));
        });
      } else {
        const updatedSection = [...updatedSections[sectionKey]];
        updatedSection[index][field] = value;
        updatedSections[sectionKey] = updatedSection;
      }
      return { ...prev, sections: updatedSections };
    });
  };

  const handleToolboxRowChange = (category, index, field, value) => {
    setToolboxData(prev => {
      const updatedCategory = [...prev[category]];
      updatedCategory[index][field] = value;
      return { ...prev, [category]: updatedCategory };
    });
  };

  const addToolboxRow = (category, defaultRow) => {
    setToolboxData(prev => ({
      ...prev,
      [category]: [...prev[category], defaultRow]
    }));
  };

  const removeToolboxRow = (category, index) => {
    setToolboxData(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const handleSaveSignature = (dataUrl) => {
    if (!activeSignatureTarget) return;

    if (activeSignatureTarget.type === 'inspection') {
      setInspectionData(prev => ({ ...prev, signature: dataUrl }));
    } else if (activeSignatureTarget.type === 'attendee') {
      const idx = activeSignatureTarget.index;
      setToolboxData(prev => {
        const updatedAttendees = [...prev.attendees];
        updatedAttendees[idx].signature = dataUrl;
        return { ...prev, attendees: updatedAttendees };
      });
    } else if (activeSignatureTarget.type === 'management') {
      setToolboxData(prev => ({ ...prev, managementSignature: dataUrl }));
    }

    setSignatureModalOpen(false);
    setActiveSignatureTarget(null);
  };

  const addAttendeeRow = () => {
    setToolboxData(prev => ({
      ...prev,
      attendees: [...prev.attendees, { name: '', company: 'SJR Builders', signature: '', date: activeDate || activeMonday }]
    }));
  };

  const removeAttendeeRow = (index) => {
    setToolboxData(prev => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index)
    }));
  };

  function cleanRunFormatting(node) {
    if (!node || !node.getElementsByTagName) return;
    const nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const containers = [
      ...(node.nodeName === "w:rPr" ? [node] : []),
      ...Array.from(node.getElementsByTagNameNS(nsW, "rPr")),
      ...Array.from(node.getElementsByTagName("w:rPr")),
    ];

    containers.forEach((rPr) => {
      ["highlight", "shd", "color"].forEach((tag) => {
        const nsMatches = Array.from(rPr.getElementsByTagNameNS(nsW, tag));
        const plainMatches = Array.from(rPr.getElementsByTagName(tag));
        [...nsMatches, ...plainMatches].forEach((el) => {
          if (el.parentNode) el.parentNode.removeChild(el);
        });
      });
    });
  }

  function setCellText(cell, text, xmlDoc) {
    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const tNodes = cell.getElementsByTagNameNS(ns, "t");
    if (tNodes.length > 0) {
      tNodes[0].textContent = text;
      tNodes[0].setAttribute("xml:space", "preserve");
      if (tNodes[0].parentNode) cleanRunFormatting(tNodes[0].parentNode);
      for (let i = 1; i < tNodes.length; i++) {
        tNodes[i].textContent = "";
      }
    } else {
      let pNodes = cell.getElementsByTagNameNS(ns, "p");
      let p = pNodes[0];
      if (!p) {
        p = xmlDoc.createElementNS(ns, "w:p");
        cell.appendChild(p);
      }
      const r = xmlDoc.createElementNS(ns, "w:r");
      const t = xmlDoc.createElementNS(ns, "w:t");
      t.textContent = text;
      t.setAttribute("xml:space", "preserve");
      r.appendChild(t);
      p.appendChild(r);
    }
  }

  function setParagraphText(pNode, text, xmlDoc) {
    const nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const tNodes = pNode.getElementsByTagNameNS(nsW, "t");
    if (tNodes.length > 0) {
      tNodes[0].textContent = text;
      tNodes[0].setAttribute("xml:space", "preserve");
      if (tNodes[0].parentNode) cleanRunFormatting(tNodes[0].parentNode);
      for (let i = 1; i < tNodes.length; i++) {
        tNodes[i].textContent = "";
      }
    } else {
      const r = xmlDoc.createElementNS(nsW, "w:r");
      const t = xmlDoc.createElementNS(nsW, "w:t");
      t.textContent = text;
      t.setAttribute("xml:space", "preserve");
      r.appendChild(t);
      pNode.appendChild(r);
    }
  }

  function getCellText(cell) {
    const tNodes = cell.getElementsByTagName("w:t");
    let str = "";
    for (let tn of tNodes) str += tn.textContent;
    return str.replace(/\s+/g, ' ').trim();
  }

  function cleanUnderscoreRuns(xmlDoc) {
    const tNodes = xmlDoc.getElementsByTagName("w:t");
    for (let tn of tNodes) {
      if (tn.textContent && /_{3,}/.test(tn.textContent)) {
        tn.textContent = tn.textContent.replace(/_{3,}/g, "");
      }
    }
  }

  function insertSignatureWithParagraph(pNodeContainer, dataUrl, dateStr, zip, xmlDoc) {
    if (!dataUrl || !dataUrl.startsWith("data:image")) return;

    try {
      const imgId = "sig_" + Math.random().toString(36).substring(2, 9);
      const fileName = `media/${imgId}.png`;
      const relsId = `rIdSig${Math.floor(Math.random() * 100000)}`;

      const base64Data = dataUrl.split(',')[1];
      const binaryStr = window.atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      zip.file(`word/${fileName}`, bytes);

      const relsXmlStr = zip.file("word/_rels/document.xml.rels").asText();
      const relsParser = new DOMParser();
      const relsDoc = relsParser.parseFromString(relsXmlStr, "text/xml");
      const relationships = relsDoc.getElementsByTagName("Relationships")[0];

      if (relationships) {
        const newRel = relsDoc.createElementNS(
          "http://schemas.openxmlformats.org/package/2006/relationships",
          "Relationship"
        );
        newRel.setAttribute("Id", relsId);
        newRel.setAttribute(
          "Type",
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
        );
        newRel.setAttribute("Target", fileName);
        relationships.appendChild(newRel);

        const relsSerializer = new XMLSerializer();
        zip.file("word/_rels/document.xml.rels", relsSerializer.serializeToString(relsDoc));
      }

      const nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
      const nsA = "http://schemas.openxmlformats.org/drawingml/2006/main";
      const nsR = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

      const drawingXmlStr = `
        <w:p xmlns:w="${nsW}">
          <w:r>
            <w:drawing>
              <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
                <wp:extent cx="1000000" cy="350000"/>
                <wp:docPr id="1" name="Signature ${imgId}"/>
                <a:graphic xmlns:a="${nsA}">
                  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:nvPicPr>
                        <pic:cNvPr id="0" name="${fileName}"/>
                        <pic:cNvPicPr/>
                      </pic:nvPicPr>
                      <pic:blipFill>
                        <a:blip r:embed="${relsId}" xmlns:r="${nsR}"/>
                        <a:stretch><a:fillRect/></a:stretch>
                      </pic:blipFill>
                      <pic:spPr>
                        <a:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="350000"/></a:xfrm>
                        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                      </pic:spPr>
                    </pic:pic>
                  </a:graphicData>
                </a:graphic>
              </wp:inline>
            </w:drawing>
          </w:r>
          <w:r>
            <w:rPr><w:sz w:val="20"/></w:rPr>
            <w:t xml:space="preserve">   Dated: ${dateStr}</w:t>
          </w:r>
        </w:p>`;

      const imgDoc = new DOMParser().parseFromString(drawingXmlStr, "text/xml");
      const pNode = xmlDoc.importNode(imgDoc.documentElement, true);

      if (pNodeContainer.nodeName === 'w:tc') {
        while (pNodeContainer.firstChild) pNodeContainer.removeChild(pNodeContainer.firstChild);
        pNodeContainer.appendChild(pNode);
      } else if (pNodeContainer.nodeName === 'w:p') {
        pNodeContainer.parentNode.replaceChild(pNode, pNodeContainer);
      }
    } catch (e) {
      console.error("Failed to inject signature image into document:", e);
    }
  }

  const forceBlackTextOnRun = (runNode, xmlDoc) => {
    if (!runNode || runNode.nodeName !== "w:r") return;
    const nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    let rPr = runNode.getElementsByTagNameNS(nsW, "rPr")[0] || runNode.getElementsByTagName("w:rPr")[0];
    if (!rPr) {
      rPr = xmlDoc.createElementNS(nsW, "w:rPr");
      runNode.insertBefore(rPr, runNode.firstChild);
    }

    ["highlight", "shd", "color"].forEach((tag) => {
      const nsEls = Array.from(rPr.getElementsByTagNameNS(nsW, tag));
      const plainEls = Array.from(rPr.getElementsByTagName(tag));
      [...nsEls, ...plainEls].forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    });

    const colorEl = xmlDoc.createElementNS(nsW, "w:color");
    colorEl.setAttribute("w:val", "000000");
    rPr.appendChild(colorEl);
  };

  const findMarkerEndNodeIndex = (tNodes, markerText) => {
    const target = markerText.toLowerCase().replace(/\s+/g, " ").trim();
    if (!target) return -1;

    let combined = "";
    const ranges = [];

    for (let i = 0; i < tNodes.length; i++) {
      const raw = (tNodes[i].textContent || "").toLowerCase();
      const start = combined.length;
      combined += raw;
      ranges.push({ index: i, start, end: combined.length });
    }

    const normalizedCombined = combined.replace(/\s+/g, " ");
    const matchPos = normalizedCombined.indexOf(target);
    if (matchPos !== -1) {
      const matchEnd = matchPos + target.length;
      for (let i = 0; i < ranges.length; i++) {
        if (matchEnd <= ranges[i].end) {
          return ranges[i].index;
        }
      }
      return ranges[ranges.length - 1].index;
    }

    return -1;
  };

  const insertValueAfterMarkerNode = (pNode, tNodes, markerIndex, valueText, xmlDoc, trailingPad = "") => {
    const nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const cleanValue = valueText.trim();
    if (!cleanValue) return;

    const anchorRun = tNodes[markerIndex]?.parentNode;
    const formattedValue = ` ${cleanValue}${trailingPad}`;

    for (let i = markerIndex + 1; i < tNodes.length; i++) {
      const val = tNodes[i].textContent || "";
      const trimmed = val.trim();
      if (trimmed === "" || /^[_\s–-]+$/.test(trimmed)) {
        tNodes[i].textContent = formattedValue;
        tNodes[i].setAttribute("xml:space", "preserve");
        forceBlackTextOnRun(tNodes[i].parentNode, xmlDoc);
        return;
      }
      if (/[a-zA-Z0-9]/.test(trimmed) && !/^[_\s–-]+$/.test(trimmed)) {
        break;
      }
    }

    const r = xmlDoc.createElementNS(nsW, "w:r");
    const t = xmlDoc.createElementNS(nsW, "w:t");
    t.textContent = formattedValue;
    t.setAttribute("xml:space", "preserve");
    r.appendChild(t);
    forceBlackTextOnRun(r, xmlDoc);

    if (anchorRun && anchorRun.parentNode === pNode) {
      pNode.insertBefore(r, anchorRun.nextSibling);
    } else {
      pNode.appendChild(r);
    }
  };

  const setValueAfterLabel = (pNode, markerText, valueText, xmlDoc, trailingPad = "") => {
    const tNodes = Array.from(pNode.getElementsByTagName("w:t"));
    if (tNodes.length === 0) return;

    const markerIdx = findMarkerEndNodeIndex(tNodes, markerText);
    if (markerIdx !== -1) {
      insertValueAfterMarkerNode(pNode, tNodes, markerIdx, valueText, xmlDoc, trailingPad);
    }
  };

  const setTwoValuesInParagraph = (pNode, marker1, value1, marker2, value2, xmlDoc, pad1 = "") => {
    const tNodes = Array.from(pNode.getElementsByTagName("w:t"));
    if (tNodes.length === 0) return;

    const idx1 = findMarkerEndNodeIndex(tNodes, marker1);
    if (idx1 !== -1) {
      insertValueAfterMarkerNode(pNode, tNodes, idx1, value1, xmlDoc, pad1);
    }

    if (marker2) {
      const freshTNodes = Array.from(pNode.getElementsByTagName("w:t"));
      const idx2 = findMarkerEndNodeIndex(freshTNodes, marker2);
      if (idx2 !== -1) {
        insertValueAfterMarkerNode(pNode, freshTNodes, idx2, value2, xmlDoc, "");
      }
    }
  };

  const stripBottomBordersFromNode = (node) => {
    if (!node || !node.getElementsByTagName) return;
    const nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const pBdrs = [
      ...Array.from(node.getElementsByTagNameNS(nsW, "pBdr")),
      ...Array.from(node.getElementsByTagName("w:pBdr")),
    ];
    pBdrs.forEach((pBdr) => {
      const bottoms = [
        ...Array.from(pBdr.getElementsByTagNameNS(nsW, "bottom")),
        ...Array.from(pBdr.getElementsByTagName("w:bottom")),
      ];
      bottoms.forEach((b) => {
        if (b.parentNode) b.parentNode.removeChild(b);
      });
    });
  };

  const removeHorizontalLineShapesNearNode = (pNode) => {
    if (!pNode || !pNode.parentNode) return;

    const candidates = [];
    const collectLineNodes = (container) => {
      if (!container || !container.getElementsByTagName) return;
      ["v:line", "line", "w:pict", "pict"].forEach((tag) => {
        Array.from(container.getElementsByTagName(tag)).forEach((el) => {
          const isPicture =
            el.getElementsByTagName("v:imagedata").length > 0 ||
            el.getElementsByTagName("imagedata").length > 0 ||
            el.getElementsByTagName("a:blip").length > 0 ||
            el.getElementsByTagName("blip").length > 0;
          if (!isPicture) {
            candidates.push(el);
          }
        });
      });
    };

    collectLineNodes(pNode);

    let sibling = pNode.nextSibling;
    let steps = 0;
    while (sibling && steps < 4) {
      if (sibling.nodeType === 1) {
        const tagName = (sibling.nodeName || "").toLowerCase();
        if (tagName.endsWith("tbl")) break;
        const sibText = getCellText(sibling).toLowerCase();
        if (sibText.includes("agenda items")) break;

        collectLineNodes(sibling);

        const hasImage =
          sibling.getElementsByTagName("a:blip").length > 0 ||
          sibling.getElementsByTagName("blip").length > 0 ||
          sibling.getElementsByTagName("v:imagedata").length > 0 ||
          sibling.getElementsByTagName("imagedata").length > 0;

        if (!hasImage && (tagName.endsWith(":p") || tagName === "p")) {
          const hasVmlOrDrawing =
            sibling.getElementsByTagName("w:drawing").length > 0 ||
            sibling.getElementsByTagName("drawing").length > 0 ||
            sibling.getElementsByTagName("w:pict").length > 0 ||
            sibling.getElementsByTagName("pict").length > 0 ||
            sibling.getElementsByTagName("v:line").length > 0 ||
            sibling.getElementsByTagName("line").length > 0;

          if (hasVmlOrDrawing && sibText === "") {
            const toRemove = sibling;
            sibling = sibling.nextSibling;
            toRemove.parentNode.removeChild(toRemove);
            steps++;
            continue;
          }
        }
      }
      sibling = sibling.nextSibling;
      steps++;
    }

    candidates.forEach((el) => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  };

  const flattenSpacerParagraph = (pNode, xmlDoc) => {
    if (!pNode) return;
    const hasDrawing = pNode.getElementsByTagName("w:drawing").length > 0;
    const hasTable = pNode.getElementsByTagName("w:tbl").length > 0;
    if (hasDrawing || hasTable) return;

    stripBottomBordersFromNode(pNode);

    const text = getCellText(pNode).trim();
    if (text === "" || /^[_\s–—-]+$/.test(text)) {
      const nsW = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
      const tNodes = pNode.getElementsByTagName("w:t");
      for (let tn of tNodes) {
        tn.textContent = "";
      }

      let pPr = pNode.getElementsByTagNameNS(nsW, "pPr")[0] || pNode.getElementsByTagName("w:pPr")[0];
      if (!pPr) {
        pPr = xmlDoc.createElementNS(nsW, "w:pPr");
        pNode.insertBefore(pPr, pNode.firstChild);
      }

      let spacing = pPr.getElementsByTagNameNS(nsW, "spacing")[0] || pPr.getElementsByTagName("w:spacing")[0];
      if (!spacing) {
        spacing = xmlDoc.createElementNS(nsW, "w:spacing");
        pPr.appendChild(spacing);
      }
      spacing.setAttribute("w:before", "0");
      spacing.setAttribute("w:after", "0");
      spacing.setAttribute("w:line", "1");
      spacing.setAttribute("w:lineRule", "exact");

      const runs = Array.from(pNode.getElementsByTagName("w:r"));
      runs.forEach((r) => {
        let rPr = r.getElementsByTagNameNS(nsW, "rPr")[0] || r.getElementsByTagName("w:rPr")[0];
        if (!rPr) {
          rPr = xmlDoc.createElementNS(nsW, "w:rPr");
          r.insertBefore(rPr, r.firstChild);
        }
        ["sz", "szCs"].forEach((szTag) => {
          let szEl = rPr.getElementsByTagNameNS(nsW, szTag)[0] || rPr.getElementsByTagName(szTag)[0];
          if (!szEl) {
            szEl = xmlDoc.createElementNS(nsW, `w:${szTag}`);
            rPr.appendChild(szEl);
          }
          szEl.setAttribute("w:val", "2");
        });
      });
    }
  };

  const fillInspectionHeaderField = (pNode, labelMarker, valueText, xmlDoc) => {
    setValueAfterLabel(pNode, labelMarker, valueText, xmlDoc);
    const parentCell = pNode.parentNode;
    if (parentCell && parentCell.nodeName === "w:tc") {
      const parentRow = parentCell.parentNode;
      if (parentRow && parentRow.nodeName === "w:tr") {
        const cells = Array.from(parentRow.getElementsByTagName("w:tc"));
        const cellIdx = cells.indexOf(parentCell);
        if (cellIdx !== -1 && cells[cellIdx + 1]) {
          const nextCellText = getCellText(cells[cellIdx + 1]);
          if (!nextCellText || /^[_\s–-]+$/.test(nextCellText)) {
            setCellText(cells[cellIdx + 1], valueText.trim(), xmlDoc);
          }
        }
      }
    }
  };

  const generateInspectionZipBuffer = async (dataOverride = null) => {
    const sourceData = dataOverride || inspectionData;
    const templateFileName = 'Site Safety Inspection Report.docx';
    const response = await fetch(`/${templateFileName}`);
    if (!response.ok) throw new Error(`Template file '${templateFileName}' not found.`);
    const templateArrayBuffer = await response.arrayBuffer();
    const zip = new PZip(templateArrayBuffer);

    const docXmlStr = zip.file("word/document.xml").asText();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");

    const paragraphs = xmlDoc.getElementsByTagName("w:p");
    const rows = xmlDoc.getElementsByTagName("w:tr");

    for (let p of paragraphs) {
      const text = getCellText(p);
      const lower = text.toLowerCase();
      if (
        lower.includes("site:") ||
        lower.includes("week ending:") ||
        lower.includes("inspected by:") ||
        lower.includes("signed:")
      ) {
        if (lower.includes("site:")) {
          fillInspectionHeaderField(p, "site:", sourceData.site || '', xmlDoc);
        }
        if (lower.includes("week ending:")) {
          setTwoValuesInParagraph(
            p,
            "week ending:",
            sourceData.weekEnding || '',
            "time:",
            sourceData.time || '',
            xmlDoc,
            "    "
          );
        }
        if (lower.includes("inspected by:")) {
          fillInspectionHeaderField(p, "inspected by:", sourceData.inspectedBy || '', xmlDoc);
        }
        if (lower.includes("signed:")) {
          const formattedDate = formatDateShort(sourceData.dateSigned || sourceData.weekEnding);
          if (sourceData.signature) {
            insertSignatureWithParagraph(p, sourceData.signature, formattedDate, zip, xmlDoc);
          } else {
            setTwoValuesInParagraph(
              p,
              "signed:",
              "________________",
              "dated:",
              formattedDate,
              xmlDoc,
              "    "
            );
          }
        }
      }
    }

    const itemLookup = {};
    Object.values(sourceData.sections || defaultInspectionSections).forEach(sectionItems => {
      sectionItems.forEach(row => {
        if (row.item) itemLookup[row.item.toLowerCase().trim()] = row;
      });
    });

    for (let tr of rows) {
      const cells = tr.getElementsByTagName("w:tc");
      if (cells.length < 2) continue;
      const labelText = getCellText(cells[0]).toLowerCase().trim();
      const matchedItem = itemLookup[labelText];
      if (matchedItem) {
        if (cells[1]) setCellText(cells[1], matchedItem.complies || 'Yes', xmlDoc);
        if (cells[2]) setCellText(cells[2], matchedItem.action || '', xmlDoc);
        if (cells[3]) setCellText(cells[3], matchedItem.contractor || '', xmlDoc);
      }
    }

    cleanUnderscoreRuns(xmlDoc);
    const serializer = new XMLSerializer();
    zip.file("word/document.xml", serializer.serializeToString(xmlDoc));
    return zip.generate({ type: 'uint8array' });
  };

  const generateToolboxZipBuffer = async (dataOverride = null) => {
    const sourceData = dataOverride || toolboxData;
    const templateFileName = 'H&S and Toolbox Meeting Worksheet.docx';
    const response = await fetch(`/${templateFileName}`);
    if (!response.ok) throw new Error(`Template file '${templateFileName}' not found.`);
    const templateArrayBuffer = await response.arrayBuffer();
    const zip = new PZip(templateArrayBuffer);

    const docXmlStr = zip.file("word/document.xml").asText();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");

    const paragraphs = xmlDoc.getElementsByTagName("w:p");
    const tables = xmlDoc.getElementsByTagName("w:tbl");

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const tNodes = Array.from(p.getElementsByTagName("w:t"));
      if (tNodes.length === 0) continue;

      let pStr = "";
      for (let tn of tNodes) pStr += tn.textContent;
      const cleanPStr = pStr.toLowerCase().trim();

      if (cleanPStr.includes("date and time:")) {
        const dtCombined = `${sourceData.date || ''} ${sourceData.time || ''}`.trim();
        setTwoValuesInParagraph(
          p,
          "date and time:",
          dtCombined,
          "location:",
          sourceData.location || '',
          xmlDoc,
          "    "
        );
        stripBottomBordersFromNode(p);
        removeHorizontalLineShapesNearNode(p);
        if (paragraphs[i + 1]) {
          flattenSpacerParagraph(paragraphs[i + 1], xmlDoc);
        }
        if (paragraphs[i + 2]) {
          flattenSpacerParagraph(paragraphs[i + 2], xmlDoc);
        }
      } else if (cleanPStr.includes("meeting closed:")) {
        setTwoValuesInParagraph(
          p,
          "meeting closed:",
          sourceData.time || '',
          "next meeting:",
          "Next week",
          xmlDoc,
          "    "
        );
      } else if (cleanPStr.includes("signed – management:") || cleanPStr.includes("signed - management:")) {
        const labelMatch = cleanPStr.includes("signed – management:") ? "signed – management:" : "signed - management:";
        if (sourceData.managementSignature) {
          const dateVal = formatDateShort(sourceData.managementDate || sourceData.date);
          setTwoValuesInParagraph(
            p,
            labelMatch,
            `Signed (${dateVal})`,
            "dated:",
            dateVal,
            xmlDoc,
            "    "
          );
        } else {
          setTwoValuesInParagraph(
            p,
            labelMatch,
            "________________",
            "dated:",
            "____________",
            xmlDoc,
            "    "
          );
        }
      } else if (
        cleanPStr.startsWith("discussion about task planning and weekly goals") &&
        sourceData.taskPlanningDiscussion
      ) {
        const targetP = paragraphs[i + 1];
        if (targetP) {
          setParagraphText(targetP, sourceData.taskPlanningDiscussion, xmlDoc);
        }
      } else if (
        (cleanPStr === "operational issues/other business:" ||
          cleanPStr === "operational issues/other business" ||
          cleanPStr === "operational issues / other business:" ||
          cleanPStr === "operational issues / other business") &&
        sourceData.operationalIssues
      ) {
        const targetP = paragraphs[i + 1];
        const targetText = targetP ? getCellText(targetP).toLowerCase() : "";
        if (targetP && !targetText.startsWith("8)") && targetText !== "other") {
          setParagraphText(targetP, sourceData.operationalIssues, xmlDoc);
        }
      }
    }

    for (let table of tables) {
      const rows = table.getElementsByTagName("w:tr");
      if (rows.length < 2) continue;
      const headerCells = rows[0].getElementsByTagName("w:tc");
      if (headerCells.length === 0) continue;
      const tableLabel = getCellText(headerCells[0]).toLowerCase();

      if (tableLabel.includes("present")) {
        (sourceData.attendees || []).forEach((att, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], att.name || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], att.company || '', xmlDoc);
            if (cells[2]) {
              const formattedDate = formatDateShort(att.date || sourceData.date);
              if (att.signature) insertSignatureWithParagraph(cells[2], att.signature, formattedDate, zip, xmlDoc);
              else setCellText(cells[2], formattedDate, xmlDoc);
            }
          }
        });
      } else if (tableLabel.includes("issues raised from site safety inspection")) {
        (sourceData.siteSafetyReview || []).forEach((row, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
          }
        });
      } else if (tableLabel.includes("worker training needs")) {
        (sourceData.workerTraining || []).forEach((row, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
          }
        });
      } else if (tableLabel.includes("has any event") || tableLabel.includes("event investigations")) {
        (sourceData.eventInvestigations || []).forEach((row, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
          }
        });
      } else if (tableLabel.includes("hazard:") && !tableLabel.includes("board")) {
        (sourceData.hazards || []).forEach((haz, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], haz.hazard || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], haz.action || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], haz.whoWhen || '', xmlDoc);
          }
        });
      } else if (tableLabel.includes("hazard board")) {
        (sourceData.hazardBoard || []).forEach((hb, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], hb.item || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], hb.update || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], hb.whoWhen || '', xmlDoc);
          }
        });
      } else if (tableLabel.includes("plant and equipment requirements") || tableLabel.includes("plant and equipment (including")) {
        (sourceData.plantEquipment || []).forEach((plant, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], plant.requirement || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], plant.action || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], plant.whoWhen || '', xmlDoc);
          }
        });
      } else if (tableLabel.includes("task:")) {
        (sourceData.taskPlanning || []).forEach((tp, idx) => {
          const rowIndex = idx + 1;
          if (rows[rowIndex]) {
            const cells = rows[rowIndex].getElementsByTagName("w:tc");
            if (cells[0]) setCellText(cells[0], tp.task || '', xmlDoc);
            if (cells[1]) setCellText(cells[1], tp.ppe || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], tp.timeframe || '', xmlDoc);
            if (cells[3]) setCellText(cells[3], tp.whoWhen || '', xmlDoc);
          }
        });
      } else if (tableLabel.includes("agenda item")) {
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].getElementsByTagName("w:tc");
          if (cells.length < 2) continue;
          const rowLabel = getCellText(cells[0]).toLowerCase();
          const matchedPrevious = (sourceData.previousActions || []).find(p => rowLabel.includes(p.item.toLowerCase()));
          if (matchedPrevious) {
            if (cells[1]) setCellText(cells[1], matchedPrevious.action || '', xmlDoc);
            if (cells[2]) setCellText(cells[2], matchedPrevious.followUp || '', xmlDoc);
          }
        }
      }
    }

    cleanUnderscoreRuns(xmlDoc);
    const serializer = new XMLSerializer();
    zip.file("word/document.xml", serializer.serializeToString(xmlDoc));
    return zip.generate({ type: 'uint8array' });
  };

  const handleExportInspectionDocx = async () => {
    setExportingDocx(true);
    try {
      const siteName = (inspectionData.site || '').trim();
      if (!siteName) {
        alert("Please enter or select a Site / Project name before exporting.");
        setExportingDocx(false);
        return;
      }
      const siteNameClean = siteName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filesToShare = [];

      const inspectionUint8 = await generateInspectionZipBuffer(inspectionData);
      const inspectionFileName = `Site Safety Inspection - ${siteNameClean} (${inspectionData.weekEnding}).docx`;
      filesToShare.push(await writeBufferToCache(inspectionUint8, inspectionFileName));

      const toolboxDocId = buildToolboxDocId(siteName, inspectionData.weekEnding);
      const toolboxSnap = await getDoc(doc(db, 'health_safety', toolboxDocId));

      let toolboxIncluded = false;
      if (toolboxSnap.exists()) {
        const tData = toolboxSnap.data();
        const toolboxPayload = {
          ...createDefaultToolboxData(
            tData.date || inspectionData.weekEnding,
            tData.time || '10:00',
            userName || '',
            tData.location || tData.site || siteName
          ),
          ...tData,
          date: tData.date || inspectionData.weekEnding,
          time: tData.time || '10:00',
          location: tData.location || tData.site || siteName,
          managementDate: tData.managementDate || tData.date || inspectionData.weekEnding
        };

        const toolboxUint8 = await generateToolboxZipBuffer(toolboxPayload);
        const toolboxFileName = `Toolbox Meeting - ${siteNameClean} (${inspectionData.weekEnding}).docx`;
        filesToShare.push(await writeBufferToCache(toolboxUint8, toolboxFileName));
        toolboxIncluded = true;
      }

      await shareOrDownloadFiles(filesToShare);
      setStatusMessage({
        type: 'success',
        text: toolboxIncluded ? `Exported Inspection Report & Toolbox Meeting simultaneously!` : `Successfully generated inspection report!`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Export error:", err);
      alert(`Export Failed: ${err.message}`);
      setStatusMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportToolboxDocx = async () => {
    setExportingDocx(true);
    try {
      const locName = (toolboxData.location || '').trim();
      if (!locName) {
        alert("Please enter or select a Location / Site name before exporting.");
        setExportingDocx(false);
        return;
      }
      const locNameClean = locName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filesToShare = [];

      const toolboxUint8 = await generateToolboxZipBuffer(toolboxData);
      const toolboxFileName = `Toolbox Meeting - ${locNameClean} (${toolboxData.date}).docx`;
      filesToShare.push(await writeBufferToCache(toolboxUint8, toolboxFileName));

      const inspectionDocId = buildInspectionDocId(locName, toolboxData.date);
      const inspectionSnap = await getDoc(doc(db, 'health_safety', inspectionDocId));

      let inspectionIncluded = false;
      if (inspectionSnap.exists()) {
        const iData = inspectionSnap.data();
        const inspectionPayload = {
          ...createDefaultInspectionData(
            iData.weekEnding || toolboxData.date,
            iData.time || '10:00',
            iData.inspectedBy || userName || '',
            iData.site || iData.location || locName
          ),
          ...iData,
          site: iData.site || iData.location || locName,
          weekEnding: iData.weekEnding || toolboxData.date,
          time: iData.time || '10:00',
          inspectedBy: iData.inspectedBy || userName || '',
          dateSigned: iData.dateSigned || toolboxData.date,
          sections: iData.sections || defaultInspectionSections
        };

        const inspectionUint8 = await generateInspectionZipBuffer(inspectionPayload);
        const inspectionFileName = `Site Safety Inspection - ${locNameClean} (${toolboxData.date}).docx`;
        filesToShare.push(await writeBufferToCache(inspectionUint8, inspectionFileName));
        inspectionIncluded = true;
      }

      await shareOrDownloadFiles(filesToShare);
      setStatusMessage({
        type: 'success',
        text: inspectionIncluded ? `Exported Toolbox Meeting & Inspection Report simultaneously!` : `Successfully generated toolbox meeting!`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Export error:", err);
      alert(`Export Failed: ${err.message}`);
      setStatusMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setExportingDocx(false);
    }
  };

  const writeBufferToCache = async (uint8Array, outputFileName) => {
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = window.btoa(binary);

    const writtenFile = await Filesystem.writeFile({
      path: outputFileName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true
    });

    const uriResult = await Filesystem.getUri({
      path: outputFileName,
      directory: Directory.Cache,
    });

    return uriResult?.uri || writtenFile?.uri;
  };

  const shareOrDownloadFiles = async (fileUris) => {
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        files: fileUris,
        title: 'Export H&S Documents',
        text: 'Here are your generated health & safety documents.',
        dialogTitle: 'Export Documents',
      });
    } else {
      fileUris.forEach(uri => {
        const link = document.createElement("a");
        link.href = uri;
        link.download = uri.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    const siteVal = (inspectionData.site || '').trim();
    if (!siteVal) {
      alert("Please enter or select a Site / Project name before submitting.");
      return;
    }

    setLoading(true);
    try {
      const mondayStr = getMondayOfWeek(inspectionData.weekEnding || currentWeek);
      const docId = buildInspectionDocId(siteVal, mondayStr);

      setActiveSite(siteVal);
      setActiveDate(inspectionData.weekEnding || mondayStr);
      setCurrentWeek(mondayStr);

      const payload = {
        userId,
        userName,
        ...inspectionData,
        site: siteVal,
        location: siteVal,
        weekStarting: mondayStr,
        type: INSPECTION_TYPE,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'health_safety', docId), payload, { merge: true });

      setSelectedReportId(docId);
      await fetchAllReports();
      setStatusMessage({ type: 'success', text: "Site Safety Inspection Report saved separately!" });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Error saving inspection:", err);
      setStatusMessage({ type: 'error', text: "Failed to save inspection report." });
    } finally {
      setLoading(false);
    }
  };

  const handleToolboxSubmit = async (e) => {
    e.preventDefault();
    const locVal = (toolboxData.location || '').trim();
    if (!locVal) {
      alert("Please enter or select a Location / Site name before submitting.");
      return;
    }

    setLoading(true);
    try {
      const mondayStr = getMondayOfWeek(toolboxData.date || currentWeek);
      const docId = buildToolboxDocId(locVal, mondayStr);

      setActiveSite(locVal);
      setActiveDate(toolboxData.date || mondayStr);
      setCurrentWeek(mondayStr);

      const payload = {
        userId,
        userName,
        ...toolboxData,
        location: locVal,
        site: locVal,
        weekStarting: mondayStr,
        type: TOOLBOX_TYPE,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'health_safety', docId), payload, { merge: true });

      setSelectedReportId(docId);
      await fetchAllReports();
      setStatusMessage({ type: 'success', text: "Toolbox Meeting Worksheet saved separately!" });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Error saving toolbox meeting:", err);
      setStatusMessage({ type: 'error', text: "Failed to save toolbox meeting." });
    } finally {
      setLoading(false);
    }
  };

  const currentFormSite = (
    (hsSubView === 'inspection' ? inspectionData.site : toolboxData.location) || activeSite
  ).trim();
  const currentFormDate =
    (hsSubView === 'inspection' ? inspectionData.weekEnding : toolboxData.date) || activeDate || activeMonday;

  const isSelectedIdInOptions =
    selectedReportId &&
    (reportsForThisWeek.some(r => r.id === selectedReportId) ||
      previousTwoWeeksReports.some(r => r.id === selectedReportId));

  return (
    <div className="max-w-xl mx-auto space-y-4 my-4 pb-12">
      <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner gap-1">
        <button
          type="button"
          onClick={() => handleSwitchSubView('inspection')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            hsSubView === 'inspection' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          📋 Safety Inspection Report
        </button>
        <button
          type="button"
          onClick={() => handleSwitchSubView('toolbox')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            hsSubView === 'toolbox' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          🛠️ Toolbox Meeting Worksheet
        </button>
      </div>

      <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => handleShiftWeek(-1)}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs cursor-pointer"
            >
              ← Prev Week
            </button>
            <button
              type="button"
              onClick={handleThisWeek}
              className="bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs cursor-pointer"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(1)}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs cursor-pointer"
            >
              Next Week →
            </button>
          </div>
          <div className="text-xs font-bold text-slate-700 text-center sm:text-right">
            Week Starting (Mon): <span className="text-emerald-700">{activeMonday}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="w-full sm:w-auto flex-1">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
              {hsSubView === 'inspection'
                ? `Submitted Inspections (${reportsForThisWeek.length} this week)`
                : `Submitted Toolbox Meetings (${reportsForThisWeek.length} this week)`}
            </label>

            {reportsError && (
              <p className="text-[11px] font-semibold text-rose-600 mb-1.5">
                ⚠️ {reportsError}
              </p>
            )}

            <select
              value={isSelectedIdInOptions ? selectedReportId : (currentFormSite ? '__ACTIVE_DRAFT__' : '')}
              onChange={(e) => {
                if (e.target.value === '__ACTIVE_DRAFT__') return;
                handleSelectReportById(e.target.value);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
            >
              <option value="">
                {hsSubView === 'inspection'
                  ? '-- Choose submitted inspection or click Add Site --'
                  : '-- Choose submitted toolbox meeting or click Add Site --'}
              </option>

              {!isSelectedIdInOptions && currentFormSite && (
                <option value="__ACTIVE_DRAFT__">
                  {currentFormSite} ({currentFormDate})
                </option>
              )}

              <optgroup label={`This Week (Mon ${activeMonday})`}>
                {reportsForThisWeek.length > 0 ? (
                  reportsForThisWeek.map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {(rep.site || rep.location || 'Unknown Site')} ({rep.weekEnding || rep.date || activeMonday})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No sites submitted for this week yet
                  </option>
                )}
              </optgroup>

              {previousTwoWeeksReports.length > 0 && (
                <optgroup label="Previous 2 Weeks">
                  {previousTwoWeeksReports.map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {(rep.site || rep.location || 'Unknown Site')} — {rep.weekEnding || rep.date || getReportMonday(rep)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={handleStartFreshForm}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow transition-colors cursor-pointer whitespace-nowrap mt-2 sm:mt-5"
          >
            + Add Site
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
          statusMessage.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          <span>{statusMessage.type === 'error' ? '⚠️' : '✓'}</span>
          {statusMessage.text}
        </div>
      )}

      {hsSubView === 'inspection' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={sjrLogo} alt="SJR Builders Logo" className="h-10 w-auto object-contain" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">Site Safety Inspection Report</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Weekly safety check & live collaboration audit</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportInspectionDocx}
              disabled={exportingDocx}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{exportingDocx ? "Exporting..." : "Download DOCX"}</span>
            </button>
          </div>

          <form onSubmit={handleInspectionSubmit} className="space-y-6">
            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-900">⚡ Auto-fill Contractor across all rows:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFillContractor}
                  onChange={(e) => setAutoFillContractor(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Site / Project</label>
                <SiteAutoCompleteInput
                  value={inspectionData.site}
                  onChange={(val) => handleSiteOrWeekChange(val, inspectionData.weekEnding)}
                  existingSites={savedSites}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Week Starting (Mon)</label>
                <input
                  type="date"
                  value={inspectionData.weekEnding}
                  onChange={(e) => {
                    const newWk = e.target.value;
                    handleSiteOrWeekChange(inspectionData.site, newWk);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Time</label>
                <input
                  type="time"
                  value={inspectionData.time}
                  onChange={(e) => setInspectionData({ ...inspectionData, time: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Inspected By</label>
                <input
                  type="text"
                  value={inspectionData.inspectedBy}
                  onChange={(e) => setInspectionData({ ...inspectionData, inspectedBy: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            {Object.entries(inspectionData.sections).map(([sectionKey, items]) => (
              <div key={sectionKey} className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">
                  {sectionKey.replace(/([A-Z])/g, ' $1')}
                </h3>
                {items.map((row, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <span className="font-semibold text-slate-800 block">{row.item}</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">Complies</label>
                        <select
                          value={row.complies}
                          onChange={(e) => handleInspectionItemChange(sectionKey, idx, 'complies', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 font-medium text-slate-800"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">Action & Comment</label>
                        <textarea
                          rows={1}
                          value={row.action}
                          onChange={(e) => handleInspectionItemChange(sectionKey, idx, 'action', e.target.value)}
                          onInput={handleAutoResize}
                          placeholder="Optional notes"
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="text-slate-500 font-medium text-[10px] block">Contractor</label>
                          {userName && (
                            <button
                              type="button"
                              onClick={() => handleInspectionItemChange(sectionKey, idx, 'contractor', userName)}
                              className="text-[9px] text-emerald-700 font-bold underline hover:text-emerald-800 cursor-pointer"
                            >
                              + Me
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={1}
                          value={row.contractor}
                          onChange={(e) => handleInspectionItemChange(sectionKey, idx, 'contractor', e.target.value)}
                          onInput={handleAutoResize}
                          placeholder="Name"
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">Inspector Sign-off</label>
              {inspectionData.signature ? (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between">
                  <img src={inspectionData.signature} alt="Inspector Signature" className="h-12 object-contain bg-white px-2 rounded" />
                  <button
                    type="button"
                    onClick={() => setInspectionData({ ...inspectionData, signature: '' })}
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Resign
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSignatureTarget({ type: 'inspection' });
                    setSignatureModalOpen(true);
                  }}
                  className="w-full py-3 border-2 border-dashed border-emerald-600 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 text-xs transition-colors cursor-pointer"
                >
                  ✍️ Tap to Sign Report
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving Report..." : "Submit / Sync Site Safety Inspection Report"}
            </button>
          </form>
        </div>
      )}

      {hsSubView === 'toolbox' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={sjrLogo} alt="SJR Builders Logo" className="h-10 w-auto object-contain" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">H&S and Toolbox Meeting Worksheet</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Record meeting discussions, hazards, and attendance</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportToolboxDocx}
              disabled={exportingDocx}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{exportingDocx ? "Exporting..." : "Download DOCX"}</span>
            </button>
          </div>

          <form onSubmit={handleToolboxSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={toolboxData.date}
                  onChange={(e) => {
                    const newDt = e.target.value;
                    handleToolboxLocationOrDateChange(toolboxData.location, newDt);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Time</label>
                <input
                  type="time"
                  value={toolboxData.time}
                  onChange={(e) => setToolboxData({ ...toolboxData, time: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location / Site</label>
                <SiteAutoCompleteInput
                  value={toolboxData.location}
                  onChange={(val) => handleToolboxLocationOrDateChange(val, toolboxData.date)}
                  existingSites={savedSites}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">
                Action Follow ups from Previous Meeting
              </h3>
              {toolboxData.previousActions.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block">{row.item}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action Taken</label>
                      <textarea
                        rows={1}
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('previousActions', idx, 'action', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Action taken..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Further Follow up</label>
                      <textarea
                        rows={1}
                        value={row.followUp}
                        onChange={(e) => handleToolboxRowChange('previousActions', idx, 'followUp', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Follow up details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">
                  Issues Raised from Site Safety Inspection
                </h3>
              </div>
              {toolboxData.siteSafetyReview.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Issues Raised</label>
                      <textarea
                        rows={1}
                        value={row.details || ''}
                        onChange={(e) => handleToolboxRowChange('siteSafetyReview', idx, 'details', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Enter details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                      <textarea
                        rows={1}
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('siteSafetyReview', idx, 'action', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Action..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <textarea
                        rows={1}
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('siteSafetyReview', idx, 'whoWhen', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">
                  Worker Training Needs
                </h3>
              </div>
              {toolboxData.workerTraining.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Worker Training Needs</label>
                      <textarea
                        rows={1}
                        value={row.details || ''}
                        onChange={(e) => handleToolboxRowChange('workerTraining', idx, 'details', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Enter training needs..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                      <textarea
                        rows={1}
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('workerTraining', idx, 'action', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Action..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <textarea
                        rows={1}
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('workerTraining', idx, 'whoWhen', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">
                  Event Investigations and Recorded Accidents/Incidents
                </h3>
                <button
                  type="button"
                  onClick={() => addToolboxRow('eventInvestigations', { details: '', action: '', whoWhen: '' })}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  + Add Event Row
                </button>
              </div>

              {toolboxData.eventInvestigations.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase">Event Row #{idx + 1}</span>
                    {toolboxData.eventInvestigations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeToolboxRow('eventInvestigations', idx)}
                        className="text-rose-600 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Has any Event/Accident/Incident occurred</label>
                      <textarea
                        rows={1}
                        value={row.details || ''}
                        onChange={(e) => handleToolboxRowChange('eventInvestigations', idx, 'details', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Yes / No or details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action Taken</label>
                      <textarea
                        rows={1}
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('eventInvestigations', idx, 'action', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Action..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <textarea
                        rows={1}
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('eventInvestigations', idx, 'whoWhen', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">Hazards</h3>
                <button
                  type="button"
                  onClick={() => addToolboxRow('hazards', { hazard: '', action: '', whoWhen: '' })}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  + Add Hazard Row
                </button>
              </div>

              {toolboxData.hazards.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase">Hazard Row #{idx + 1}</span>
                    {toolboxData.hazards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeToolboxRow('hazards', idx)}
                        className="text-rose-600 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Hazard</label>
                      <textarea
                        rows={1}
                        value={row.hazard}
                        onChange={(e) => handleToolboxRowChange('hazards', idx, 'hazard', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Hazard description..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                      <textarea
                        rows={1}
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('hazards', idx, 'action', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Action..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <textarea
                        rows={1}
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('hazards', idx, 'whoWhen', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">Hazard Board - Updating</h3>
                <button
                  type="button"
                  onClick={() => addToolboxRow('hazardBoard', { item: '', update: '', whoWhen: '' })}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  + Add Board Row
                </button>
              </div>

              {toolboxData.hazardBoard.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase">Board Row #{idx + 1}</span>
                    {toolboxData.hazardBoard.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeToolboxRow('hazardBoard', idx)}
                        className="text-rose-600 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Hazard Board Item</label>
                      <textarea
                        rows={1}
                        value={row.item}
                        onChange={(e) => handleToolboxRowChange('hazardBoard', idx, 'item', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Item..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">What needs to be updated</label>
                      <textarea
                        rows={1}
                        value={row.update}
                        onChange={(e) => handleToolboxRowChange('hazardBoard', idx, 'update', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Update details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <textarea
                        rows={1}
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('hazardBoard', idx, 'whoWhen', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">Plant and Equipment (including Test & Tag)</h3>
                <button
                  type="button"
                  onClick={() => addToolboxRow('plantEquipment', { requirement: '', action: '', whoWhen: '' })}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  + Add Plant Row
                </button>
              </div>

              {toolboxData.plantEquipment.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase">Plant Row #{idx + 1}</span>
                    {toolboxData.plantEquipment.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeToolboxRow('plantEquipment', idx)}
                        className="text-rose-600 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Requirements</label>
                      <textarea
                        rows={1}
                        value={row.requirement}
                        onChange={(e) => handleToolboxRowChange('plantEquipment', idx, 'requirement', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Requirements..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                      <textarea
                        rows={1}
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('plantEquipment', idx, 'action', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Action..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <textarea
                        rows={1}
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('plantEquipment', idx, 'whoWhen', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">Task Planning and Weekly Goals</h3>
                <button
                  type="button"
                  onClick={() => addToolboxRow('taskPlanning', { task: '', ppe: '', timeframe: '', whoWhen: '' })}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  + Add Task Row
                </button>
              </div>

              {toolboxData.taskPlanning.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase">Task Row #{idx + 1}</span>
                    {toolboxData.taskPlanning.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeToolboxRow('taskPlanning', idx)}
                        className="text-rose-600 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Task</label>
                      <textarea
                        rows={1}
                        value={row.task}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'task', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Task..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Equipment/PPE Required</label>
                      <textarea
                        rows={1}
                        value={row.ppe}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'ppe', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Equipment / PPE..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Time Frame</label>
                      <textarea
                        rows={1}
                        value={row.timeframe}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'timeframe', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Time frame..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <textarea
                        rows={1}
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'whoWhen', e.target.value)}
                        onInput={handleAutoResize}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">
                Discussion About Task Planning and Weekly Goals
              </label>
              <textarea
                rows={2}
                value={toolboxData.taskPlanningDiscussion}
                onChange={(e) => setToolboxData({ ...toolboxData, taskPlanningDiscussion: e.target.value })}
                onInput={handleAutoResize}
                placeholder="Enter discussion notes and comments..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">
                Operational Issues / other Business
              </label>
              <textarea
                rows={2}
                value={toolboxData.operationalIssues}
                onChange={(e) => setToolboxData({ ...toolboxData, operationalIssues: e.target.value })}
                onInput={handleAutoResize}
                placeholder="Enter operational issues or other business notes..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 resize-none overflow-hidden focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">Present / Attendees</h3>
                <button
                  type="button"
                  onClick={addAttendeeRow}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  + Add Attendee
                </button>
              </div>

              {toolboxData.attendees.map((attendee, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 uppercase">Attendee #{idx + 1}</span>
                    {toolboxData.attendees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttendeeRow(idx)}
                        className="text-rose-600 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <WorkerAutoCompleteInput
                      value={attendee.name}
                      onChange={(val) => {
                        const updated = [...toolboxData.attendees];
                        updated[idx].name = val;
                        setToolboxData({ ...toolboxData, attendees: updated });
                      }}
                      registeredWorkers={registeredWorkers}
                    />
                    <input
                      type="text"
                      value={attendee.company}
                      onChange={(e) => {
                        const updated = [...toolboxData.attendees];
                        updated[idx].company = e.target.value;
                        setToolboxData({ ...toolboxData, attendees: updated });
                      }}
                      placeholder="Employer / Company"
                      className="bg-white border border-slate-300 rounded p-2 text-slate-800"
                    />
                  </div>

                  {attendee.signature ? (
                    <div className="flex items-center justify-between bg-white p-2 border border-slate-200 rounded">
                      <span className="text-xs font-semibold text-emerald-700">✓ Signed by {attendee.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...toolboxData.attendees];
                          updated[idx].signature = '';
                          setToolboxData({ ...toolboxData, attendees: updated });
                        }}
                        className="text-rose-600 font-bold hover:underline"
                      >
                        Resign
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSignatureTarget({ type: 'attendee', index: idx });
                        setSignatureModalOpen(true);
                      }}
                      className="w-full py-2 border border-dashed border-emerald-600 text-emerald-700 font-bold rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      ✍️ Capture Attendee Signature
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">Management Sign-off</label>
              {toolboxData.managementSignature ? (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">✓ Signed as Management</span>
                  <button
                    type="button"
                    onClick={() => setToolboxData({ ...toolboxData, managementSignature: '' })}
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Resign
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSignatureTarget({ type: 'management' });
                    setSignatureModalOpen(true);
                  }}
                  className="w-full py-3 border-2 border-dashed border-emerald-600 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 text-xs transition-colors cursor-pointer"
                >
                  ✍️ Tap to Sign as Management
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving Meeting..." : "Submit / Sync Toolbox Meeting Worksheet"}
            </button>
          </form>
        </div>
      )}

      <SignaturePadModal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        onSave={handleSaveSignature}
        title={activeSignatureTarget?.type === 'attendee' ? "Attendee Signature" : "Authorised Signature"}
      />
    </div>
  );
}
