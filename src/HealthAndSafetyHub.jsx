// src/HealthAndSafetyHub.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, doc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import PZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import SignaturePadModal from './components/SignaturePadModal';
import sjrLogo from './assets/logo.jpg';

function dataURLtoArrayBuffer(dataURL) {
  if (!dataURL || !dataURL.includes(',')) return null;
  const base64 = dataURL.split(',')[1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const imageOptions = {
  getImage(tagValue) {
    return dataURLtoArrayBuffer(tagValue);
  },
  getSize() {
    return [150, 45];
  }
};

export default function HealthAndSafetyHub({ userId, userName }) {
  const [hsSubView, setHsSubView] = useState('inspection'); // 'inspection' or 'toolbox'
  const [loading, setLoading] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [savedSites, setSavedSites] = useState([]);

  // Signature Modal State
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [activeSignatureTarget, setActiveSignatureTarget] = useState(null);

  // Load existing sites synchronized with TimesheetEntry storage keys (`sjr_known_sites`)
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sitesSet = new Set();

        // 1. Load instantly from the exact timesheet storage key
        const knownSitesRaw = localStorage.getItem('sjr_known_sites');
        if (knownSitesRaw) {
          const parsed = JSON.parse(knownSitesRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach(site => site && sitesSet.add(site.trim()));
          }
        }

        // 2. Check last selected project/site from timesheet cache
        const lastProject = localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name');
        if (lastProject) {
          sitesSet.add(lastProject.trim());
        }

        // 3. Sync with Firestore timesheets collection if online
        if (userId) {
          const q = query(collection(db, 'timesheets'), where('userId', '==', userId));
          const snapshot = await getDocs(q);
          snapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (d.project && d.project.trim() !== '') {
              sitesSet.add(d.project.trim());
            }
          });
        }

        setSavedSites(Array.from(sitesSet));
      } catch (err) {
        console.warn("Could not load past sites for H&S:", err);
        const saved = localStorage.getItem('sjr_known_sites');
        if (saved) setSavedSites(JSON.parse(saved));
      }
    };
    fetchSites();
  }, [userId]);

  // 1. Site Safety Inspection Form State
  const [inspectionData, setInspectionData] = useState({
    site: localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name') || '',
    weekEnding: new Date().toISOString().split('T')[0],
    time: '07:30',
    inspectedBy: userName || '',
    signature: '',
    dateSigned: new Date().toISOString().split('T')[0],
    sections: {
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
      electrical: [
        { item: "Main board locked and waterproof", complies: "Yes", action: "", contractor: "" },
        { item: "Condition and position of cables and leads", complies: "Yes", action: "", contractor: "" },
        { item: "3 monthly tags on all tools and leads", complies: "Yes", action: "", contractor: "" },
        { item: "RCD’s in use and tagged", complies: "Yes", action: "", contractor: "" },
        { item: "No domestic multi boxes being used", complies: "Yes", action: "", contractor: "" },
      ]
    }
  });

  // 2. Toolbox Meeting Worksheet Form State
  const [toolboxData, setToolboxData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '07:00',
    location: localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name') || '',
    agendaNotes: {
      previousActions: '',
      safetyInspectionReview: '',
      incidents: '',
      hazards: '',
      plantAndEquipment: '',
      taskPlanning: '',
      operationalIssues: '',
      otherBusiness: ''
    },
    attendees: [
      { name: userName || '', company: 'SJR Builders', signature: '', date: new Date().toISOString().split('T')[0] }
    ],
    managementSignature: '',
    managementDate: new Date().toISOString().split('T')[0]
  });

  const handleInspectionItemChange = (sectionKey, index, field, value) => {
    setInspectionData(prev => {
      const updatedSection = [...prev.sections[sectionKey]];
      updatedSection[index][field] = value;
      return {
        ...prev,
        sections: { ...prev.sections, [sectionKey]: updatedSection }
      };
    });
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
      attendees: [...prev.attendees, { name: '', company: 'SJR Builders', signature: '', date: new Date().toISOString().split('T')[0] }]
    }));
  };

  const removeAttendeeRow = (index) => {
    setToolboxData(prev => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index)
    }));
  };

  // Generic Template Filling with nullGetter safeguard against MultiError
  const fillAndExportDocx = async (templateFileName, outputFileName, templatePayload) => {
    setExportingDocx(true);
    try {
      const response = await fetch(`/${templateFileName}`);
      if (!response.ok) {
        throw new Error(`Template file '${templateFileName}' not found in public folder.`);
      }
      const templateArrayBuffer = await response.arrayBuffer();
      const zip = new PZip(templateArrayBuffer);

      const imageModule = new ImageModule(imageOptions);
      const docx = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() { return ""; } // Prevents MultiError crashes if a template tag is missing in Word docs
      });

      docx.render(templatePayload);
      const generatedZip = docx.getZip();

      if (Capacitor.isNativePlatform()) {
        const content = generatedZip.generate({ type: 'uint8array' });
        let binary = '';
        const bytes = new Uint8Array(content);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
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

        await Share.share({
          files: [uriResult.uri || writtenFile.uri],
          dialogTitle: `Export ${outputFileName}`,
        });
      } else {
        const blob = generatedZip.generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = outputFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setStatusMessage({ type: 'success', text: `Successfully generated ${outputFileName}!` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Export error details:", err);
      if (!err?.message?.includes('canceled') && !err?.message?.includes('cancelled')) {
        alert(`Export Failed: ${err?.message || "Check template placeholders"}`);
        setStatusMessage({ type: 'error', text: `Export failed: ${err?.message || "Error generating document"}` });
      }
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportInspectionDocx = () => {
    const siteNameClean = (inspectionData.site || 'Site').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const fileName = `Site Safety Inspection - ${siteNameClean} (${inspectionData.weekEnding}).docx`;

    const templatePayload = {
      site: inspectionData.site || '',
      weekEnding: inspectionData.weekEnding || '',
      time: inspectionData.time || '',
      inspectedBy: inspectionData.inspectedBy || '',
      signature: inspectionData.signature || '',
      dateSigned: inspectionData.dateSigned || inspectionData.weekEnding || ''
    };

    let idx = 0;
    Object.values(inspectionData.sections).forEach((sectionItems) => {
      sectionItems.forEach((row) => {
        templatePayload[`items_${idx}_complies`] = row.complies || 'Yes';
        templatePayload[`items_${idx}_action`] = row.action || '';
        templatePayload[`items_${idx}_contractor`] = row.contractor || '';
        idx++;
      });
    });

    fillAndExportDocx('Site Safety Inspection Report.docx', fileName, templatePayload);
  };

  const handleExportToolboxDocx = () => {
    const locClean = (toolboxData.location || 'Site').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const fileName = `Toolbox Meeting - ${locClean} (${toolboxData.date}).docx`;

    const templatePayload = {
      date: toolboxData.date || '',
      time: toolboxData.time || '',
      location: toolboxData.location || '',
      
      previousActions: toolboxData.agendaNotes.previousActions || 'N/A',
      previousActions_action: 'Reviewed',
      previousActions_byWho: userName || '',

      safetyInspectionReview_action: toolboxData.agendaNotes.safetyInspectionReview || 'Reviewed',
      safetyInspectionReview_followup: 'Ongoing',

      trainingNeeds: 'Standard induction',
      trainingNeeds_action: 'Briefed',
      trainingNeeds_byWho: userName || '',

      incidents: toolboxData.agendaNotes.incidents || 'None reported',
      incidents_actionTaken: 'N/A',
      incidents_byWho: userName || '',

      hazards: toolboxData.agendaNotes.hazards || 'Standard hazards',
      hazards_actionTaken: 'PPE active',
      hazards_byWho: userName || '',

      hazardBoard: toolboxData.location || 'Main Site',
      hazardBoard_updates: 'Current',
      hazardBoard_byWho: userName || '',

      plantAndEquipment: toolboxData.agendaNotes.plantAndEquipment || 'Checked',
      plantAndEquipment_byWho: userName || '',

      weeklyTask: toolboxData.agendaNotes.taskPlanning || 'General construction',
      weeklyTask_ppe: 'Standard PPE',
      weeklyTask_timeframe: 'This week',
      weeklyTask_byWho: userName || '',

      taskPlanningDiscussion: toolboxData.agendaNotes.taskPlanning || '',
      operationalIssuesNotes: toolboxData.agendaNotes.operationalIssues || '',

      meetingClosed: toolboxData.time || '16:00',
      nextMeetingDate: 'Next week',

      attendees: toolboxData.attendees.map(att => ({
        name: att.name || '',
        company: att.company || '',
        signature: att.signature || ''
      })),

      managementSignature: toolboxData.managementSignature || '',
      managementDate: toolboxData.managementDate || toolboxData.date || ''
    };

    fillAndExportDocx('H&S and Toolbox Meeting Worksheet.docx', fileName, templatePayload);
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docId = `hs_inspection_${userId}_${Date.now()}`;
      await setDoc(doc(db, 'health_safety', docId), {
        userId,
        userName,
        type: 'Site Safety Inspection Report',
        createdAt: serverTimestamp(),
        ...inspectionData
      });
      setStatusMessage({ type: 'success', text: "Site Safety Inspection Report submitted successfully!" });
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
    setLoading(true);
    try {
      const docId = `hs_toolbox_${userId}_${Date.now()}`;
      await setDoc(doc(db, 'health_safety', docId), {
        userId,
        userName,
        type: 'H&S and Tool Box Meeting Worksheet',
        createdAt: serverTimestamp(),
        ...toolboxData
      });
      setStatusMessage({ type: 'success', text: "Toolbox Meeting Worksheet submitted successfully!" });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Error saving toolbox meeting:", err);
      setStatusMessage({ type: 'error', text: "Failed to save toolbox meeting." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 my-4 pb-12">
      {/* Shared Site Datalist matching Timesheet suggestions */}
      <datalist id="saved-sites-list">
        {savedSites.map((site, i) => (
          <option key={i} value={site} />
        ))}
      </datalist>

      {/* H&S Sub-Navigation Switcher */}
      <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner gap-1">
        <button
          type="button"
          onClick={() => setHsSubView('inspection')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            hsSubView === 'inspection'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          📋 Safety Inspection Report
        </button>
        <button
          type="button"
          onClick={() => setHsSubView('toolbox')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            hsSubView === 'toolbox'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          🛠️ Toolbox Meeting Worksheet
        </button>
      </div>

      {statusMessage && (
        <div className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
          statusMessage.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          <span>{statusMessage.type === 'error' ? '⚠️' : '✓'}</span>
          {statusMessage.text}
        </div>
      )}

      {/* VIEW 1: SITE SAFETY INSPECTION REPORT */}
      {hsSubView === 'inspection' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={sjrLogo} alt="SJR Builders Logo" className="h-10 w-auto object-contain" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">Site Safety Inspection Report</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Weekly safety check & compliance audit</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportInspectionDocx}
              disabled={exportingDocx}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
              title="Download Safety Inspection DOCX"
            >
              <span>{exportingDocx ? "Exporting..." : "Download DOCX"}</span>
            </button>
          </div>

          <form onSubmit={handleInspectionSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Site / Project</label>
                <input
                  type="text"
                  list="saved-sites-list"
                  value={inspectionData.site}
                  onChange={(e) => setInspectionData({ ...inspectionData, site: e.target.value })}
                  placeholder="Select or enter site name"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Week Ending</label>
                <input
                  type="date"
                  value={inspectionData.weekEnding}
                  onChange={(e) => setInspectionData({ ...inspectionData, weekEnding: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

            {/* Checklist Sections */}
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
                        <input
                          type="text"
                          value={row.action}
                          onChange={(e) => handleInspectionItemChange(sectionKey, idx, 'action', e.target.value)}
                          placeholder="Optional notes"
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">Contractor Responsible</label>
                        <input
                          type="text"
                          value={row.contractor}
                          onChange={(e) => handleInspectionItemChange(sectionKey, idx, 'contractor', e.target.value)}
                          placeholder="Name"
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Signature Area */}
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
              {loading ? "Saving Report..." : "Submit Site Safety Inspection Report"}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: TOOLBOX MEETING WORKSHEET */}
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
              title="Download Toolbox Meeting DOCX"
            >
              <span>{exportingDocx ? "Exporting..." : "Download DOCX"}</span>
            </button>
          </div>

          <form onSubmit={handleToolboxSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={toolboxData.date}
                  onChange={(e) => setToolboxData({ ...toolboxData, date: e.target.value })}
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
                <input
                  type="text"
                  list="saved-sites-list"
                  value={toolboxData.location}
                  onChange={(e) => setToolboxData({ ...toolboxData, location: e.target.value })}
                  placeholder="Select or enter site location"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Agenda Notes */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">Agenda Items & Discussions</h3>
              {[
                { key: 'previousActions', label: 'Action Follow ups from Previous Meeting' },
                { key: 'safetyInspectionReview', label: 'Review Site Safety Inspection Report & Training Needs' },
                { key: 'incidents', label: 'Event Investigations and Recorded Accidents/Incidents' },
                { key: 'hazards', label: 'Hazards & Control Measures (PPE, Hazard Board)' },
                { key: 'plantAndEquipment', label: 'Plant and Equipment (including Test & Tag)' },
                { key: 'taskPlanning', label: 'Weekly Task Planning and Goals' },
                { key: 'operationalIssues', label: 'Operational Issues / Other Business' },
              ].map((agenda) => (
                <div key={agenda.key} className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">{agenda.label}</label>
                  <textarea
                    rows="2"
                    value={toolboxData.agendaNotes[agenda.key]}
                    onChange={(e) => setToolboxData({
                      ...toolboxData,
                      agendaNotes: { ...toolboxData.agendaNotes, [agenda.key]: e.target.value }
                    })}
                    placeholder="Enter discussion notes..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm text-slate-800"
                  />
                </div>
              ))}
            </div>

            {/* Attendees Sign-off List */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={attendee.name}
                      onChange={(e) => {
                        const updated = [...toolboxData.attendees];
                        updated[idx].name = e.target.value;
                        setToolboxData({ ...toolboxData, attendees: updated });
                      }}
                      placeholder="Full Name"
                      className="bg-white border border-slate-300 rounded p-2 text-slate-800"
                      required
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
                      <img src={attendee.signature} alt="Attendee Signature" className="h-10 object-contain" />
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

            {/* Management Sign-off */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">Management Sign-off</label>
              {toolboxData.managementSignature ? (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between">
                  <img src={toolboxData.managementSignature} alt="Management Signature" className="h-12 object-contain bg-white px-2 rounded" />
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
              {loading ? "Saving Meeting..." : "Submit Toolbox Meeting Worksheet"}
            </button>
          </form>
        </div>
      )}

      {/* Reusable Signature Modal Dialog */}
      <SignaturePadModal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        onSave={handleSaveSignature}
        title={activeSignatureTarget?.type === 'attendee' ? "Attendee Signature" : "Authorised Signature"}
      />
    </div>
  );
}
