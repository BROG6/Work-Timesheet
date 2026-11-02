// src/ManagerHealthAndSafetyDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebaseConfig';
import { collection, query, orderBy, getDocs, getDocsFromCache } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import PZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import sjrLogo from './assets/logo.jpg';

// Helper to convert base64 signatures for DOCX embedding
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

export default function ManagerHealthAndSafetyDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'health_safety'), orderBy('createdAt', 'desc'));
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch {
        snapshot = await getDocsFromCache(q);
      }

      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSubmissions(list);
    } catch (err) {
      console.warn("Could not fetch H&S submissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Group submissions by site name
  const siteMap = {};
  submissions.forEach((item) => {
    const siteName = item.site || item.location || item.project || "General / Unassigned";
    if (!siteMap[siteName]) {
      siteMap[siteName] = { inspections: [], toolboxes: [] };
    }
    if (item.type === 'Site Safety Inspection Report') {
      siteMap[siteName].inspections.push(item);
    } else {
      siteMap[siteName].toolboxes.push(item);
    }
  });

  const exportDocxForRecord = async (record) => {
    setExportingId(record.id);
    try {
      const isInspection = record.type === 'Site Safety Inspection Report';
      const templateName = isInspection 
        ? 'Site Safety Inspection Report.docx' 
        : 'H&S and Toolbox Meeting Worksheet.docx';

      const response = await fetch(`/${templateName}`);
      if (!response.ok) {
        throw new Error(`Template file '${templateName}' not found in public folder.`);
      }
      const templateArrayBuffer = await response.arrayBuffer();
      const zip = new PZip(templateArrayBuffer);

      const imageModule = new ImageModule(imageOptions);
      const docx = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });

      // Build payload based on record type
      let templatePayload = {};

      if (isInspection) {
        templatePayload = {
          site: record.site || '',
          weekEnding: record.weekEnding || '',
          time: record.time || '',
          inspectedBy: record.inspectedBy || record.userName || '',
          signature: record.signature || '',
          dateSigned: record.dateSigned || record.weekEnding || ''
        };

        // Map checklist items back into template indices if stored as sections
        if (record.sections) {
          let idx = 0;
          Object.values(record.sections).forEach((sectionItems) => {
            sectionItems.forEach((row) => {
              templatePayload[`items_${idx}_complies`] = row.complies || 'Yes';
              templatePayload[`items_${idx}_action`] = row.action || '';
              templatePayload[`items_${idx}_contractor`] = row.contractor || '';
              idx++;
            });
          });
        }
      } else {
        // Toolbox Meeting Payload
        templatePayload = {
          date: record.date || '',
          time: record.time || '',
          location: record.location || '',
          
          previousActions: record.agendaNotes?.previousActions || 'N/A',
          previousActions_action: 'Reviewed',
          previousActions_byWho: record.userName || '',

          safetyInspectionReview_action: record.agendaNotes?.safetyInspectionReview || 'Reviewed',
          safetyInspectionReview_followup: 'Ongoing',

          trainingNeeds: 'Standard induction',
          trainingNeeds_action: 'Briefed',
          trainingNeeds_byWho: record.userName || '',

          incidents: record.agendaNotes?.incidents || 'None reported',
          incidents_actionTaken: 'N/A',
          incidents_byWho: record.userName || '',

          hazards: record.agendaNotes?.hazards || 'Standard hazards',
          hazards_actionTaken: 'PPE active',
          hazards_byWho: record.userName || '',

          hazardBoard: record.location || 'Main Site',
          hazardBoard_updates: 'Current',
          hazardBoard_byWho: record.userName || '',

          plantAndEquipment: record.agendaNotes?.plantAndEquipment || 'Checked',
          plantAndEquipment_byWho: record.userName || '',

          weeklyTask: record.agendaNotes?.taskPlanning || 'General construction',
          weeklyTask_ppe: 'Standard PPE',
          weeklyTask_timeframe: 'This week',
          weeklyTask_byWho: record.userName || '',

          taskPlanningDiscussion: record.agendaNotes?.taskPlanning || '',
          operationalIssuesNotes: record.agendaNotes?.operationalIssues || '',

          meetingClosed: record.time || '16:00',
          nextMeetingDate: 'Next week',

          attendees: (record.attendees || []).map(att => ({
            name: att.name || '',
            company: att.company || '',
            signature: att.signature || ''
          })),

          managementSignature: record.managementSignature || '',
          managementDate: record.managementDate || record.date || ''
        };
      }

      docx.render(templatePayload);
      const generatedZip = docx.getZip();

      const siteName = record.site || record.location || 'Site';
      const dateStr = record.weekEnding || record.date || 'Record';
      const cleanName = `${record.type} - ${siteName} (${dateStr})`.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.docx';

      if (Capacitor.isNativePlatform()) {
        const content = generatedZip.generate({ type: 'uint8array' });
        let binary = '';
        const bytes = new Uint8Array(content);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = window.btoa(binary);

        const writtenFile = await Filesystem.writeFile({
          path: cleanName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true
        });

        const uriResult = await Filesystem.getUri({
          path: cleanName,
          directory: Directory.Cache,
        });

        await Share.share({
          files: [uriResult.uri || writtenFile.uri],
          dialogTitle: `Export ${cleanName}`,
        });
      } else {
        const blob = generatedZip.generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = cleanName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setStatusMessage({ type: 'success', text: `Downloaded ${cleanName}!` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Manager Export Error:", err);
      alert(`Export Failed: ${err?.message || "Could not generate file"}`);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 my-4 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={sjrLogo} alt="SJR Builders Logo" className="h-10 w-auto object-contain" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Health & Safety Site Register</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manager overview of submitted weekly site documents & compliance</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSubmissions}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer"
        >
          🔄 Refresh
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

      {loading ? (
        <div className="text-center py-10 text-xs font-semibold text-slate-500 animate-pulse">
          Loading site submissions...
        </div>
      ) : Object.keys(siteMap).length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
          No Health & Safety documents submitted by site workers yet.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(siteMap).map(([siteName, data]) => (
            <div key={siteName} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <h3 className="text-base font-extrabold text-slate-900">{siteName}</h3>
                <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                  {data.inspections.length + data.toolboxes.length} Document(s) Total
                </span>
              </div>

              {/* Inspections Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Site Safety Inspection Reports</h4>
                {data.inspections.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No inspection reports submitted for this site.</p>
                ) : (
                  data.inspections.map((item) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">Week Ending: {item.weekEnding}</span>
                        <span className="text-slate-500">Submitted by: <strong className="text-slate-700">{item.userName || item.inspectedBy}</strong></span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(item)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => exportDocxForRecord(item)}
                          disabled={exportingId === item.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {exportingId === item.id ? "Exporting..." : "Download DOCX"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Toolboxes Table */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Toolbox Meeting Worksheets</h4>
                {data.toolboxes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No toolbox meetings submitted for this site.</p>
                ) : (
                  data.toolboxes.map((item) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">Meeting Date: {item.date} ({item.attendees?.length || 0} Attendees)</span>
                        <span className="text-slate-500">Submitted by: <strong className="text-slate-700">{item.userName}</strong></span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(item)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => exportDocxForRecord(item)}
                          disabled={exportingId === item.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {exportingId === item.id ? "Exporting..." : "Download DOCX"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Inspector Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {selectedSubmission.type}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p><strong>Submitted By:</strong> {selectedSubmission.userName || selectedSubmission.inspectedBy}</p>
              <p><strong>Site / Location:</strong> {selectedSubmission.site || selectedSubmission.location}</p>
              <p><strong>Date / Week Ending:</strong> {selectedSubmission.weekEnding || selectedSubmission.date}</p>

              {selectedSubmission.signature && (
                <div className="space-y-1">
                  <span className="font-bold block">Inspector Signature:</span>
                  <img src={selectedSubmission.signature} alt="Signature" className="h-16 border rounded bg-slate-50 p-1" />
                </div>
              )}

              {selectedSubmission.managementSignature && (
                <div className="space-y-1">
                  <span className="font-bold block">Management Signature:</span>
                  <img src={selectedSubmission.managementSignature} alt="Management Signature" className="h-16 border rounded bg-slate-50 p-1" />
                </div>
              )}

              {selectedSubmission.attendees && (
                <div className="space-y-2 pt-2">
                  <strong className="block uppercase">Attendees ({selectedSubmission.attendees.length}):</strong>
                  {selectedSubmission.attendees.map((att, i) => (
                    <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold">{att.name}</span> ({att.company})
                      </div>
                      {att.signature && <img src={att.signature} alt="Attendee Sig" className="h-8 bg-white px-1 border rounded" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
