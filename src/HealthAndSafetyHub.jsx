// src/HealthAndSafetyHub.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebaseConfig';
import { collection, doc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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

export default function HealthAndSafetyHub({ userId, userName }) {
  const [hsSubView, setHsSubView] = useState('inspection');
  const [loading, setLoading] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [savedSites, setSavedSites] = useState([]);

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
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sitesSet = new Set();
        const knownSitesRaw = localStorage.getItem('sjr_known_sites');
        if (knownSitesRaw) {
          const parsed = JSON.parse(knownSitesRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach(site => site && sitesSet.add(site.trim()));
          }
        }

        const lastProject = localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name');
        if (lastProject) {
          sitesSet.add(lastProject.trim());
        }

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

  // STATE: Site Safety Inspection Report
  const [inspectionData, setInspectionData] = useState({
    site: localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name') || '',
    weekEnding: new Date().toISOString().split('T')[0],
    time: getCurrentTimeString(),
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
    }
  });

  // STATE: Toolbox Meeting Worksheet
  const [toolboxData, setToolboxData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: getCurrentTimeString(),
    location: localStorage.getItem(`sjr_last_project_${userId}`) || localStorage.getItem('last_site_name') || '',
    previousActions: [
      { item: "Health and Safety", action: "", followUp: "" },
      { item: "Event Investigations", action: "", followUp: "" },
      { item: "Hazards", action: "", followUp: "" },
      { item: "Plant and Equipment", action: "", followUp: "" },
      { item: "Task Planning and Weekly Goals", action: "", followUp: "" },
      { item: "Operational Issues/other Business", action: "", followUp: "" },
      { item: "Other", action: "", followUp: "" },
    ],
    siteSafetyReview: [
      { details: "", action: "", whoWhen: "" },
    ],
    workerTraining: [
      { details: "", action: "", whoWhen: "" },
    ],
    eventInvestigations: [
      { details: "", action: "", whoWhen: "" },
    ],
    hazards: [
      { hazard: "", action: "", whoWhen: "" },
    ],
    hazardBoard: [
      { item: "", update: "", whoWhen: "" },
    ],
    plantEquipment: [
      { requirement: "", action: "", whoWhen: "" },
    ],
    taskPlanning: [
      { task: "", ppe: "", timeframe: "", whoWhen: "" },
    ],
    taskPlanningDiscussion: "",
    operationalIssues: "",
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
      attendees: [...prev.attendees, { name: '', company: 'SJR Builders', signature: '', date: new Date().toISOString().split('T')[0] }]
    }));
  };

  const removeAttendeeRow = (index) => {
    setToolboxData(prev => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index)
    }));
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

  // DOM Parser Export for Site Safety Inspection Report
  const handleExportInspectionDocx = async () => {
    setExportingDocx(true);
    try {
      const templateFileName = 'Site Safety Inspection Report.docx';
      const response = await fetch(`/${templateFileName}`);
      if (!response.ok) {
        throw new Error(`Template file '${templateFileName}' not found in public folder.`);
      }
      const templateArrayBuffer = await response.arrayBuffer();
      const zip = new PZip(templateArrayBuffer);

      const docXmlStr = zip.file("word/document.xml").asText();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");

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
              pStr = `Site: ${inspectionData.site || ''}`;
              tNodes[0].textContent = pStr;
              for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
            } else if (pStr.includes("Week Ending:")) {
              pStr = `Week Ending: ${inspectionData.weekEnding || ''}      Time: ${inspectionData.time || ''}`;
              tNodes[0].textContent = pStr;
              for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
            } else if (pStr.includes("Inspected By:")) {
              pStr = `Inspected By: ${inspectionData.inspectedBy || ''}`;
              tNodes[0].textContent = pStr;
              for (let i = 1; i < tNodes.length; i++) tNodes[i].textContent = "";
            } else if (pStr.includes("Signed:")) {
              const formattedDate = formatDateShort(inspectionData.dateSigned || inspectionData.weekEnding);
              if (inspectionData.signature) {
                insertSignatureWithParagraph(p, inspectionData.signature, formattedDate, zip, xmlDoc);
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
      Object.values(inspectionData.sections).forEach(sectionItems => {
        sectionItems.forEach(row => {
          if (row.item) {
            itemLookup[row.item.toLowerCase().trim()] = row;
          }
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

      const serializer = new XMLSerializer();
      const updatedXmlStr = serializer.serializeToString(xmlDoc);
      zip.file("word/document.xml", updatedXmlStr);

      const siteNameClean = (inspectionData.site || 'Site').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const outputFileName = `Site Safety Inspection - ${siteNameClean} (${inspectionData.weekEnding}).docx`;

      await saveAndShareFile(zip, outputFileName);
      setStatusMessage({ type: 'success', text: `Successfully generated ${outputFileName}!` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Export error details:", err);
      alert(`Export Failed: ${err.message}`);
      setStatusMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setExportingDocx(false);
    }
  };

  // DOM Parser Export for H&S and Toolbox Meeting Worksheet
  const handleExportToolboxDocx = async () => {
    setExportingDocx(true);
    try {
      const templateFileName = 'H&S and Toolbox Meeting Worksheet.docx';
      const response = await fetch(`/${templateFileName}`);
      if (!response.ok) {
        throw new Error(`Template file '${templateFileName}' not found in public folder.`);
      }
      const templateArrayBuffer = await response.arrayBuffer();
      const zip = new PZip(templateArrayBuffer);

      const docXmlStr = zip.file("word/document.xml").asText();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");

      const paragraphs = xmlDoc.getElementsByTagName("w:p");
      const tables = xmlDoc.getElementsByTagName("w:tbl");

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const tNodes = p.getElementsByTagName("w:t");
        if (tNodes.length > 0) {
          let pStr = "";
          for (let tn of tNodes) pStr += tn.textContent;

          if (pStr.includes("Date and Time:")) {
            pStr = `Date and Time: ${toolboxData.date || ''} ${toolboxData.time || ''}    Location: ${toolboxData.location || ''}`;
            tNodes[0].textContent = pStr;
            for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";
          } else if (pStr.includes("Meeting Closed:")) {
            pStr = `Meeting Closed: ${toolboxData.time || ''}    Next Meeting: Next week`;
            tNodes[0].textContent = pStr;
            for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";
          } else if (pStr.includes("Signed – Management:")) {
            if (toolboxData.managementSignature) {
              const dateVal = formatDateShort(toolboxData.managementDate || toolboxData.date);
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
            if (nextSibling && toolboxData.taskPlanningDiscussion) {
              const targetCell = nextSibling.getElementsByTagName ? nextSibling.getElementsByTagName("w:tc")[0] : null;
              if (targetCell) {
                setCellText(targetCell, toolboxData.taskPlanningDiscussion, xmlDoc);
              }
            }
          } else if (pStr.toLowerCase().startsWith("operational issues/other business")) {
            tNodes[0].textContent = "Operational Issues/other Business:";
            for (let j = 1; j < tNodes.length; j++) tNodes[j].textContent = "";

            let nextSibling = p.parentNode && p.parentNode.nodeName === 'w:tc' ? p.parentNode.parentNode.nextElementSibling : p.nextElementSibling;
            if (nextSibling && toolboxData.operationalIssues) {
              const targetCell = nextSibling.getElementsByTagName ? nextSibling.getElementsByTagName("w:tc")[0] : null;
              if (targetCell) {
                setCellText(targetCell, toolboxData.operationalIssues, xmlDoc);
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
          toolboxData.attendees.forEach((att, idx) => {
            const rowIndex = idx + 1;
            if (rows[rowIndex]) {
              const cells = rows[rowIndex].getElementsByTagName("w:tc");
              if (cells[0]) setCellText(cells[0], att.name || '', xmlDoc);
              if (cells[1]) setCellText(cells[1], att.company || '', xmlDoc);
              if (cells[2]) {
                const formattedDate = formatDateShort(att.date || toolboxData.date);
                if (att.signature) {
                  insertSignatureWithParagraph(cells[2], att.signature, formattedDate, zip, xmlDoc);
                } else {
                  setCellText(cells[2], formattedDate, xmlDoc);
                }
              }
            }
          });
        } else if (tableLabel.includes("issues raised from site safety inspection")) {
          toolboxData.siteSafetyReview.forEach((row, idx) => {
            const rowIndex = idx + 1;
            if (rows[rowIndex]) {
              const cells = rows[rowIndex].getElementsByTagName("w:tc");
              if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
              if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
              if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
            }
          });
        } else if (tableLabel.includes("worker training needs")) {
          toolboxData.workerTraining.forEach((row, idx) => {
            const rowIndex = idx + 1;
            if (rows[rowIndex]) {
              const cells = rows[rowIndex].getElementsByTagName("w:tc");
              if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
              if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
              if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
            }
          });
        } else if (tableLabel.includes("has any event") || tableLabel.includes("event investigations")) {
          toolboxData.eventInvestigations.forEach((row, idx) => {
            const rowIndex = idx + 1;
            if (rows[rowIndex]) {
              const cells = rows[rowIndex].getElementsByTagName("w:tc");
              if (cells[0]) setCellText(cells[0], row.details || '', xmlDoc);
              if (cells[1]) setCellText(cells[1], row.action || '', xmlDoc);
              if (cells[2]) setCellText(cells[2], row.whoWhen || '', xmlDoc);
            }
          });
        } else if (tableLabel.includes("hazard:") && !tableLabel.includes("board")) {
          toolboxData.hazards.forEach((haz, idx) => {
            const rowIndex = idx + 1;
            if (rows[rowIndex]) {
              const cells = rows[rowIndex].getElementsByTagName("w:tc");
              if (cells[0]) setCellText(cells[0], haz.hazard || '', xmlDoc);
              if (cells[1]) setCellText(cells[1], haz.action || '', xmlDoc);
              if (cells[2]) setCellText(cells[2], haz.whoWhen || '', xmlDoc);
            }
          });
        } else if (tableLabel.includes("hazard board")) {
          toolboxData.hazardBoard.forEach((hb, idx) => {
            const rowIndex = idx + 1;
            if (rows[rowIndex]) {
              const cells = rows[rowIndex].getElementsByTagName("w:tc");
              if (cells[0]) setCellText(cells[0], hb.item || '', xmlDoc);
              if (cells[1]) setCellText(cells[1], hb.update || '', xmlDoc);
              if (cells[2]) setCellText(cells[2], hb.whoWhen || '', xmlDoc);
            }
          });
        } else if (tableLabel.includes("plant and equipment requirements") || tableLabel.includes("plant and equipment (including")) {
          toolboxData.plantEquipment.forEach((plant, idx) => {
            const rowIndex = idx + 1;
            if (rows[rowIndex]) {
              const cells = rows[rowIndex].getElementsByTagName("w:tc");
              if (cells[0]) setCellText(cells[0], plant.requirement || '', xmlDoc);
              if (cells[1]) setCellText(cells[1], plant.action || '', xmlDoc);
              if (cells[2]) setCellText(cells[2], plant.whoWhen || '', xmlDoc);
            }
          });
        } else if (tableLabel.includes("task:")) {
          toolboxData.taskPlanning.forEach((tp, idx) => {
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

            const matchedPrevious = toolboxData.previousActions.find(p => rowLabel.includes(p.item.toLowerCase()));
            if (matchedPrevious) {
              if (cells[1]) setCellText(cells[1], matchedPrevious.action || '', xmlDoc);
              if (cells[2]) setCellText(cells[2], matchedPrevious.followUp || '', xmlDoc);
            }
          }
        }
      }

      const serializer = new XMLSerializer();
      const updatedXmlStr = serializer.serializeToString(xmlDoc);
      zip.file("word/document.xml", updatedXmlStr);

      const locClean = (toolboxData.location || 'Site').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const outputFileName = `Toolbox Meeting - ${locClean} (${toolboxData.date}).docx`;

      await saveAndShareFile(zip, outputFileName);
      setStatusMessage({ type: 'success', text: `Successfully generated ${outputFileName}!` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Export error details:", err);
      alert(`Export Failed: ${err.message}`);
      setStatusMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setExportingDocx(false);
    }
  };

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
            >
              <span>{exportingDocx ? "Exporting..." : "Download DOCX"}</span>
            </button>
          </div>

          <form onSubmit={handleInspectionSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Site / Project</label>
                <SiteAutoCompleteInput
                  value={inspectionData.site}
                  onChange={(val) => setInspectionData({ ...inspectionData, site: val })}
                  existingSites={savedSites}
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
                <SiteAutoCompleteInput
                  value={toolboxData.location}
                  onChange={(val) => setToolboxData({ ...toolboxData, location: val })}
                  existingSites={savedSites}
                />
              </div>
            </div>

            {/* SECTION: Action Follow ups from Previous Meeting */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">
                Action Follow ups from Previous Meeting
              </h3>
              {toolboxData.previousActions.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block">{row.item}</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action Taken</label>
                      <input
                        type="text"
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('previousActions', idx, 'action', e.target.value)}
                        placeholder="Action taken..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Further Follow up</label>
                      <input
                        type="text"
                        value={row.followUp}
                        onChange={(e) => handleToolboxRowChange('previousActions', idx, 'followUp', e.target.value)}
                        placeholder="Follow up details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CARD 1: Issues Raised from Site Safety Inspection: */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">
                  Issues Raised from Site Safety Inspection
                </h3>
              </div>
              {toolboxData.siteSafetyReview.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="space-y-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Issues Raised</label>
                      <input
                        type="text"
                        value={row.details || ''}
                        onChange={(e) => handleToolboxRowChange('siteSafetyReview', idx, 'details', e.target.value)}
                        placeholder="Enter details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                        <input
                          type="text"
                          value={row.action}
                          onChange={(e) => handleToolboxRowChange('siteSafetyReview', idx, 'action', e.target.value)}
                          placeholder="Action..."
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                        <input
                          type="text"
                          value={row.whoWhen}
                          onChange={(e) => handleToolboxRowChange('siteSafetyReview', idx, 'whoWhen', e.target.value)}
                          placeholder="Name / Date"
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CARD 2: Worker Training Needs: */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase">
                  Worker Training Needs
                </h3>
              </div>
              {toolboxData.workerTraining.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="space-y-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Worker Training Needs</label>
                      <input
                        type="text"
                        value={row.details || ''}
                        onChange={(e) => handleToolboxRowChange('workerTraining', idx, 'details', e.target.value)}
                        placeholder="Enter training needs..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                        <input
                          type="text"
                          value={row.action}
                          onChange={(e) => handleToolboxRowChange('workerTraining', idx, 'action', e.target.value)}
                          placeholder="Action..."
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                        <input
                          type="text"
                          value={row.whoWhen}
                          onChange={(e) => handleToolboxRowChange('workerTraining', idx, 'whoWhen', e.target.value)}
                          placeholder="Name / Date"
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CARD 3: Event Investigations */}
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
                  <div className="space-y-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Has any Event/Accident/Incident occurred</label>
                      <input
                        type="text"
                        value={row.details || ''}
                        onChange={(e) => handleToolboxRowChange('eventInvestigations', idx, 'details', e.target.value)}
                        placeholder="Yes / No or details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">Action Taken</label>
                        <input
                          type="text"
                          value={row.action}
                          onChange={(e) => handleToolboxRowChange('eventInvestigations', idx, 'action', e.target.value)}
                          placeholder="Action..."
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                        <input
                          type="text"
                          value={row.whoWhen}
                          onChange={(e) => handleToolboxRowChange('eventInvestigations', idx, 'whoWhen', e.target.value)}
                          placeholder="Name / Date"
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION: Hazards (3-Column) */}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Hazard</label>
                      <input
                        type="text"
                        value={row.hazard}
                        onChange={(e) => handleToolboxRowChange('hazards', idx, 'hazard', e.target.value)}
                        placeholder="Hazard description..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                      <input
                        type="text"
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('hazards', idx, 'action', e.target.value)}
                        placeholder="Action..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <input
                        type="text"
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('hazards', idx, 'whoWhen', e.target.value)}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION: Hazard Board - Updating (3-Column) */}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Hazard Board Item</label>
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => handleToolboxRowChange('hazardBoard', idx, 'item', e.target.value)}
                        placeholder="Item..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">What needs to be updated</label>
                      <input
                        type="text"
                        value={row.update}
                        onChange={(e) => handleToolboxRowChange('hazardBoard', idx, 'update', e.target.value)}
                        placeholder="Update details..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <input
                        type="text"
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('hazardBoard', idx, 'whoWhen', e.target.value)}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION: Plant and Equipment (3-Column) */}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Requirements</label>
                      <input
                        type="text"
                        value={row.requirement}
                        onChange={(e) => handleToolboxRowChange('plantEquipment', idx, 'requirement', e.target.value)}
                        placeholder="Requirements..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Action</label>
                      <input
                        type="text"
                        value={row.action}
                        onChange={(e) => handleToolboxRowChange('plantEquipment', idx, 'action', e.target.value)}
                        placeholder="Action..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <input
                        type="text"
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('plantEquipment', idx, 'whoWhen', e.target.value)}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION: Task Planning and Weekly Goals (4-Column Table) */}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Task</label>
                      <input
                        type="text"
                        value={row.task}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'task', e.target.value)}
                        placeholder="Task..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Equipment/PPE Required</label>
                      <input
                        type="text"
                        value={row.ppe}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'ppe', e.target.value)}
                        placeholder="Equipment / PPE..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">Time Frame</label>
                      <input
                        type="text"
                        value={row.timeframe}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'timeframe', e.target.value)}
                        placeholder="Time frame..."
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium text-[10px] block">By Who and When</label>
                      <input
                        type="text"
                        value={row.whoWhen}
                        onChange={(e) => handleToolboxRowChange('taskPlanning', idx, 'whoWhen', e.target.value)}
                        placeholder="Name / Date"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION: Discussion About Task Planning and Weekly Goals (Comment Box) */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">
                Discussion About Task Planning and Weekly Goals
              </label>
              <textarea
                value={toolboxData.taskPlanningDiscussion}
                onChange={(e) => setToolboxData({ ...toolboxData, taskPlanningDiscussion: e.target.value })}
                placeholder="Enter discussion notes and comments..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* SECTION: Operational Issues / other Business (Comment Box) */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-3 py-1.5 rounded-md">
                Operational Issues / other Business
              </label>
              <textarea
                value={toolboxData.operationalIssues}
                onChange={(e) => setToolboxData({ ...toolboxData, operationalIssues: e.target.value })}
                placeholder="Enter operational issues or other business notes..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* SECTION: Attendees */}
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
              {loading ? "Saving Meeting..." : "Submit Toolbox Meeting Worksheet"}
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
