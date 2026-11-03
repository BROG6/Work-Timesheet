// src/ManagerHealthAndSafetyDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebaseConfig';
import { collection, query, orderBy, getDocs, getDocsFromCache, doc, deleteDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import PZip from 'pizzip';
import sjrLogo from './assets/logo.jpg';

export default function ManagerHealthAndSafetyDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
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

  const handleDeleteSubmission = async (record) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this ${record.type} for ${record.site || record.location}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setDeletingId(record.id);
    try {
      await deleteDoc(doc(db, 'health_safety', record.id));
      setSubmissions((prev) => prev.filter((item) => item.id !== record.id));
      if (selectedSubmission?.id === record.id) {
        setSelectedSubmission(null);
      }
      setStatusMessage({ type: 'success', text: 'Entry deleted successfully!' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error deleting submission:', err);
      alert(`Failed to delete entry: ${err.message}`);
      setStatusMessage({ type: 'error', text: `Delete failed: ${err.message}` });
    } finally {
      setDeletingId(null);
    }
  };

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

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // --- DOM PARSER & IMAGE INJECTION HELPER FUNCTIONS ---
  function setCellText(cell, text, xmlDoc) {
    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const tNodes = cell.getElementsByTagNameNS(ns, "t");
    if (tNodes.length > 0) {
      tNodes[0].textContent = text;
      tNodes[0].setAttribute("xml:space", "preserve");
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

  function getCellText(cell) {
    const tNodes = cell.getElementsByTagName("w:t");
    let str = "";
    for (let tn of tNodes) str += tn.textContent;
    return str.replace(/\s+/g, ' ').trim();
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

  const saveAndShareFile = async (zip, outputFileName) => {
    if (Capacitor.isNativePlatform()) {
      const content = zip.generate({ type: 'uint8array' });
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
      const blob = zip.generate({
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
  };

  const exportDocxForRecord = async (record) => {
    setExportingId(record.id);
    try {
      const isInspection = record.type === 'Site Safety Inspection Report';
      const templateFileName = isInspection
        ? 'Site Safety Inspection Report.docx'
        : 'H&S and Toolbox Meeting Worksheet.docx';

      const response = await fetch(`/${templateFileName}`);
      if (!response.ok) {
        throw new Error(`Template file '${templateFileName}' not found in public folder.`);
      }
      const templateArrayBuffer = await response.arrayBuffer();
      const zip = new PZip(templateArrayBuffer);

      const docXmlStr = zip.file("word/document.xml").asText();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");

      if (isInspection) {
        const paragraphs = xmlDoc.getElementsByTagName("w:p");
        const rows = xmlDoc.getElementsByTagName("w:tr");

        for (let p of paragraphs) {
          const text = getCellText(p);
          if (text.includes("Site:") || text.includes("Week Ending:") || text.includes("Inspected By:") || text.includes("Signed:")) {
            const tNodes = p.getElementsByTagName("w:t");
            if (tNodes.length > 0) {
              let pStr = "";
              for (let tn of tNodes) pStr += tn.textContent;
              
              if (pStr.includes("Site:")) {
                pStr = `Site: ${record.site || ''}`;
                tNodes[0].textContent = pStr;
                for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
              }
              if (pStr.includes("Week Ending:")) {
                pStr = `Week Ending: ${record.weekEnding || ''}      Time: ${record.time || ''}`;
                tNodes[0].textContent = pStr;
                for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
              }
              if (pStr.includes("Inspected By:")) {
                pStr = `Inspected By: ${record.inspectedBy || record.userName || ''}`;
                tNodes[0].textContent = pStr;
                for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
              }
              if (pStr.includes("Signed:")) {
                const formattedDate = formatDateShort(record.dateSigned || record.weekEnding);
                if (record.signature) {
                  insertSignatureWithParagraph(p, record.signature, formattedDate, zip, xmlDoc);
                } else {
                  pStr = `Signed: ________________      Dated: ${formattedDate}`;
                  tNodes[0].textContent = pStr;
                  for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
                }
              }
            }
          }
        }

        const itemLookup = {};
        if (record.sections) {
          Object.values(record.sections).forEach(sectionItems => {
            sectionItems.forEach(row => {
              if (row.item) {
                itemLookup[row.item.toLowerCase().trim()] = row;
              }
            });
          });
        }

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

        const serializer = new XMLSerializer();
        zip.file("word/document.xml", serializer.serializeToString(xmlDoc));

        const siteNameClean = (record.site || 'Site').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const outputFileName = `Site Safety Inspection - ${siteNameClean} (${record.weekEnding}).docx`;
        await saveAndShareFile(zip, outputFileName);

      } else {
        const paragraphs = xmlDoc.getElementsByTagName("w:p");
        const tables = xmlDoc.getElementsByTagName("w:tbl");

        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          const tNodes = p.getElementsByTagName("w:t");
          if (tNodes.length > 0) {
            let pStr = "";
            for (let tn of tNodes) pStr += tn.textContent;

            if (pStr.includes("Date and Time:")) {
              pStr = `Date and Time: ${record.date || ''} ${record.time || ''}    Location: ${record.location || ''}`;
              tNodes[0].textContent = pStr;
              for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";
            } else if (pStr.includes("Meeting Closed:")) {
              pStr = `Meeting Closed: ${record.time || ''}    Next Meeting: Next week`;
              tNodes[0].textContent = pStr;
              for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";
            } else if (pStr.includes("Signed – Management:")) {
              if (record.managementSignature) {
                const dateVal = formatDateShort(record.managementDate || record.date);
                pStr = `Signed – Management: Signed (${dateVal})    Dated: ${dateVal}`;
                tNodes[0].textContent = pStr;
                for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";
              } else {
                pStr = `Signed – Management: ________________    Dated: ____________`;
                tNodes[0].textContent = pStr;
                for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";
              }
            } else if (pStr.toLowerCase().startsWith("discussion about task planning")) {
              tNodes[0].textContent = "Discussion About Task Planning and Weekly Goals:";
              for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";

              let nextSibling = p.parentNode && p.parentNode.nodeName === 'w:tc' ? p.parentNode.parentNode.nextElementSibling : p.nextElementSibling;
              if (nextSibling && record.taskPlanningDiscussion) {
                const targetCell = nextSibling.getElementsByTagName ? nextSibling.getElementsByTagName("w:tc")[0] : null;
                if (targetCell) {
                  setCellText(targetCell, record.taskPlanningDiscussion, xmlDoc);
                }
              }
            } else if (pStr.toLowerCase().startsWith("operational issues/other business")) {
              tNodes[0].textContent = "Operational Issues/other Business:";
              for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";

              let nextSibling = p.parentNode && p.parentNode.nodeName === 'w:tc' ? p.parentNode.parentNode.nextElementSibling : p.nextElementSibling;
              if (nextSibling && record.operationalIssues) {
                const targetCell = nextSibling.getElementsByTagName ? nextSibling.getElementsByTagName("w:tc")[0] : null;
                if (targetCell) {
                  setCellText(targetCell, record.operationalIssues, xmlDoc);
                }
              }
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
            (record.attendees || []).forEach((att, idx) => {
              const rowIndex = idx + 1;
              if (rows[rowIndex]) {
                const cells = rows[rowIndex].getElementsByTagName("w:tc");
                if (cells[0]) setCellText(cells[0], att.name || '', xmlDoc);
                if (cells[1]) setCellText(cells[1], att.company || '', xmlDoc);
                if (cells[2]) {
                  const formattedDate = formatDateShort(att.date || record.date);
                  if (att.signature) {
                    insertSignatureWithParagraph(cells[2], att.signature, formattedDate, zip, xmlDoc);
                  } else {
                    setCellText(cells[2], formattedDate, xmlDoc);
                  }
                }
              }
            });
          } else if (tableLabel.includes("issues raised from site safety inspection")) {
            (record.siteSafetyReview || []).forEach((row, idx) => {
              const rowIndex = idx + 1;
              if (rows[rowIndex]) {
                const cells = rows[rowIndex].getElementsByTagName("w:tc");
                if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
                if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
                if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
              }
            });
          } else if (tableLabel.includes("worker training needs")) {
            (record.workerTraining || []).forEach((row, idx) => {
              const rowIndex = idx + 1;
              if (rows[rowIndex]) {
                const cells = rows[rowIndex].getElementsByTagName("w:tc");
                if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
                if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
                if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
              }
            });
          } else if (tableLabel.includes("has any event") || tableLabel.includes("event investigations")) {
            (record.eventInvestigations || []).forEach((row, idx) => {
              const rowIndex = idx + 1;
              if (rows[rowIndex]) {
                const cells = rows[rowIndex].getElementsByTagName("w:tc");
                if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
                if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
                if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
              }
            });
          } else if (tableLabel.includes("hazard:") && !tableLabel.includes("board")) {
            (record.hazards || []).forEach((haz, idx) => {
              const rowIndex = idx + 1;
              if (rows[rowIndex]) {
                const cells = rows[rowIndex].getElementsByTagName("w:tc");
                if (cells[0]) setCellText(cells[0], haz.hazard || '', xmlDoc);
                if (cells[1]) setCellText(cells[1], haz.action || '', xmlDoc);
                if (cells[2]) setCellText(cells[2], haz.whoWhen || '', xmlDoc);
              }
            });
          } else if (tableLabel.includes("hazard board")) {
            (record.hazardBoard || []).forEach((hb, idx) => {
              const rowIndex = idx + 1;
              if (rows[rowIndex]) {
                const cells = rows[rowIndex].getElementsByTagName("w:tc");
                if (cells[0]) setCellText(cells[0], hb.item || '', xmlDoc);
                if (cells[1]) setCellText(cells[1], hb.update || '', xmlDoc);
                if (cells[2]) setCellText(cells[2], hb.whoWhen || '', xmlDoc);
              }
            });
          } else if (tableLabel.includes("plant and equipment requirements") || tableLabel.includes("plant and equipment (including")) {
            (record.plantEquipment || []).forEach((plant, idx) => {
              const rowIndex = idx + 1;
              if (rows[rowIndex]) {
                const cells = rows[rowIndex].getElementsByTagName("w:tc");
                if (cells[0]) setCellText(cells[0], plant.requirement || '', xmlDoc);
                if (cells[1]) setCellText(cells[1], plant.action || '', xmlDoc);
                if (cells[2]) setCellText(cells[2], plant.whoWhen || '', xmlDoc);
              }
            });
          } else if (tableLabel.includes("task:")) {
            (record.taskPlanning || []).forEach((tp, idx) => {
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

              const matchedPrevious = (record.previousActions || []).find(p => rowLabel.includes(p.item.toLowerCase()));
              if (matchedPrevious) {
                if (cells[1]) setCellText(cells[1], matchedPrevious.action || '', xmlDoc);
                if (cells[2]) setCellText(cells[2], matchedPrevious.followUp || '', xmlDoc);
              }
            }
          }
        }

        const serializer = new XMLSerializer();
        zip.file("word/document.xml", serializer.serializeToString(xmlDoc));

        const locClean = (record.location || 'Site').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const outputFileName = `Toolbox Meeting - ${locClean} (${record.date}).docx`;
        await saveAndShareFile(zip, outputFileName);
      }

      setStatusMessage({ type: 'success', text: `Downloaded successfully!` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Manager Export Error:", err);
      alert(`Export Failed: ${err?.message || "Could not generate file"}`);
      setStatusMessage({ type: 'error', text: `Export failed: ${err.message}` });
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
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmission(item)}
                          disabled={deletingId === item.id}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
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
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmission(item)}
                          disabled={deletingId === item.id}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
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

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDeleteSubmission(selectedSubmission)}
                disabled={deletingId === selectedSubmission.id}
                className="px-3 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {deletingId === selectedSubmission.id ? "Deleting..." : "Delete Entry"}
              </button>
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
