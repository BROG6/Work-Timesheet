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

// Base64 Encoded SJR Builders Logo
const SJR_BUILDERS_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw8PEA8QEBAPEBAQEBAQEA8QDg8QEBAPFREWFhURFRMYHSggGBolGxMTITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGS0dHR8tLSsrKy0rLS0tKy0tLSstLSstKy0tLS0tLS0tLSstLS0tLS0tKystLSstLS0rLS0tN//AABEIAioCKgMBIgACEQEDEQH/xAAcAAEAAwADAQEAAAAAAAAAAAAAAQYHBAUIAgP/xABQEAACAgADBAQJBwgHBwMFAAAAAQIDBAURBgcSITFBUWETIjJxdIGRobEUNUJSc7LBIyQlYnKCs9EzNFOiwtLhF1Rkg5KToxU2QyZERVPx/8QAGQEBAAMBAQAAAAAAAAAAAAAAAAECAwQF/8QAKREBAAICAQMEAQQDAQAAAAAAAAECAxExBBIhEzJBUQUUIiOBJEJhcf/aAAwDAQACEQMRAD8A3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABDY1OLmdzrrlKPSuh6a9aK+s6v7Yv904uo63Hgt2223xdPfJG6rUCsRz25dPA/3dPxP3htBLrgn5mzKv5Xp5+V56PLHwsAOoqz+t9MZR95y6Mzpn0TWvY+R006vDf22hlbDkrzDmghST6Gn5idToid8MgAEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4trUlpJJrsa1Rxv/Taf7OPsOYClsdbg3i1p3xscCV1v2X98U/3S/2v3/2/v/q/mX/AC9e/391N1P2X98V3p5fM3x4p95m1f9/63M/p430Xb4X/S9+3S351/365v3f+3M8mI5S13f993/AK20/i1M/p/9fD289t93/f8An/L1/f8AOfuP911+v1/3x6v/AGv99p/G/f1fU9uv2/3f3/3/ACX/AOf/AOfX1X+63/4e/P8Af21/4f8A+f2v3+998e3532/fbf1S+p/z/f71f49O1/Ie93vXp8/n8f09/39f0ev1/X1fD8fv/8AF/q9vvvf8vXv5/Xl+fXp/P8Am+16+/r3238/P9fL6vfy7f4/2a8/1932/3fxf6/4131/4/x38vR2/X5/5++fzevt7f4f9fVf3e/X9evT8Pze33X9uv6evx0/9d+/8v/a12v3/X53vv6fv6e16f73177f1fX5ft/v/e9evx9/ff8v/vf4f0v311/f737719/N1+ft7+/32/X4a+/t34/r23X9f3X63vS4/v019vv03r8P4317evze/v5a+m+/7a++vp5e135f30vv693N16evq+f7dff+3ze+/39uXzeuv+3Pq7X09Ld29+v/AH++3+/e++3/AAnS6++33f42/D8X+7s2S2v+1bE8o6f61v5+/vf+2/P3f3Xl1/j71e95r/8AD7/ftt7+v1++3s9/p5/m3fX29f1/7+36a/P329f1vX1/l+v/S5/e0f06f8AWt/P39/L7f33N++vp8eXXyv5+/169/vf383v8vX++/L5+f4vf38vfzf4f83b1++vp/f2339v2++vn5vf32vze9f310v/AMfvS+/+17/L6fT3d+/fX3f4v/d3++/vvp9PPzeX9/fr+/3vv3+3t9fO7+/m6ft/3/u3x/b3a19+f10vf17u19Nde99vb+Xzevt5ev33367vX/f326+/0/X15v3+fr2+/t+3r++e/f/vvf1e9/f8A/p/8/e//AIvf+/u29f1+X35/j/3/AHvN9dP5fvv8Gvvx1e309fb33S8X/fO+vx/4383v49Nfb233fzevn5ev3v3++u313/f53r09fzeX/wC1+/8A329+/d2/f8H223x1/wCvv3v933f2/m/mX/d/X3X59f8A3+/p31/b++vL++vff/H++/L03v599Xfy93tX0/3/AC/P+fv3v46fX09fb2/zP0/3/m+9+/H9vP5u/m19f39/Xf8A977935v+G+/Pze/q+en+f033+evl7fH077e3/a5/e/L/AG++v/H+/S/75vvp7e/t5v8At69fXz+23+S/f32/b1++vr++/m9/N1/6335f4v8A3f8ADfze3/2/v/l9fL6a+u95vfze126e++/383S8/H9+/f5+71/7+/m++/ft7f193fS3Xz+f/a+evq11f19f123f+e9fv2/v83/8f/q3vv0++vr++/N3+Xv+3u+m7/D+/f34Xv8A3f43N2/5uL+v73b9/m9++/j169fXp9+fr0+/vf8Ab2/731f2244t/fze3x7+9e/+vfX5dNv2+vx+Xz929X+H5/f/AM3Xl9e++v3721e/21+/r0+/7793b8L5/wB9d6vv4/f36d+/v3v/ADf9m++/a+vx29vv3597/wB/ff4Xv++vv833a6vvp19v/fzf/f12++Pfv2f4/N0vfrp03S++/r9evm3fX2935u/m1++/u9X2/ffu91++/h5f377/AC3/AOPx9a367v7230++/m9+/wA3ft+/030e318f7bf19e/e++/u82vf++/zvvvvv3fzf35e+vvq2+2/8+a7v83r5+u//P03v++3r/29L/m99X21ef2fH16/H8/L10/4fxfN7/N6e3m/p5/m3vvv6v19+r+D3+fpvH3+b17++/p2v79+36e3532f/AH4vf59fb/f/AH9dve303L++/d++/vvffze19dfvf3/G97fzeff4Pvvvf227e2/d3vS++/v29f1/l/b++/v0e336eP38uvzf23e3ff3vzeX31d99fbXze++/03L++/m/mX+34evf/a9fze35eXp+Xf1797/APv38X/770+/fze27df1/s9fPq++vh169ePz+33vN5++/Lp49++v9fb++/H0109fn19v32+vrvv5+v1+3m++/n83315vf3792vtr3f8Abf16+/r39vP4f5urv8fxfzeX/vXl09fS2vv9/m++2vv+H/u/5ff34u++/X397/ze+/ffv2ff03m+34Nf38/f+/3f43a/B/mX+/Xf3+/H++/b59fzevn8XvSvv8/vS+//ABvv07+/fze/v8X/AL9PPx++/q35ffy9X+ffV/8Ag/d37+/ffu9+/m7ff3++35e++/4/n83ze/v5a9/N+/39P1ffm6fr0++vt++/vv5vP15++ve/f35eevp5+f5f2++erfv/APXl6+fv8vf+/vO9r69f1/H4++L/AN+/5+/S9d/ze+/u10f21+mvr3S+f7/1vS9L7/b3fX0e3x++vvXzf4f1+3vv8L5/4a7f/a30dfa+fj++/193L++/y3v6Ndfj8PP19vf+br26efr6++703L38+l3v21+u3m6ev301/f9X1+P8v4/ve+vzevt9fb6vfr6+flx8Xp++71fTf/vXze35f2a/j5+v1+b3++/Svvp5+f5/f3/f1f13f+16++/vf2+X8n/6/f1v/AN++/N1f2S++/Pvvp3ev78+m/vX9f38f1+3m09e++/y/ffS6++v9uX5/D/N5/d8++/e1p0+Xm7a++vX5+X5/S01e/S41++/ze/ze++/3vv18X1df0f39v1++/u/m/ve2++3f9Lff7eX5d9/n1df115+L3f9+fT4++//E2+evq38+/zdd/v1df348/l8+vf5d+/zefff5eXp++/m8/b2++/t+/v5e3y8fv6fX339f29Nvfve++/1ef5vL3eX319+ft+/v19967/9X8b/P17+L+/23r8er1118fb++/zevr6/ze35ffX+ff1e/fvv6/Xf0+v2/vS7/AH15/n8Pf4+3fS//AH1dffm5/a/Tbf29fv1++/zfve/vvfX7+br8/m3v0/v++/D/AD631383m/33+D23fze/1++/m+/D39Lp+9++m7/A0/m9+3p7efr92++/5vffX5uXvfbf39P23r3++/D+f19+3v4fX59Xv+G3318vvef2+vx/y++/P9++ft2X5+/Dfe/T/dfx++/m0133y+n3/A0/m6f3ff03d99f18X9fXzevfV++/s+5vfzeX+17/L6f3dfxefr1e/d38vN16enXze38fze30++/h+/zevfX5+/N1d9vS++/3r8vX339ft0+/w9e/O++/fzf2++/p19dvrfze++/4X06/Nze/v7/m7+2n4++/3Lze/d3/S16/L5erq06+X++/v4fzfS6+/L+O3r8uvj5++/d03f5vb8fze9/Tzevt9fTzenze3v5ffVp+/m8/ze39O/D9vP++/Xff300Xf/AH2/N/4/x++/v6/D19/L9ffX9vT9+Xyfzevn19Xv8G36evq++r8X/N28XX5/a/b3++vN7vfr6vXze+/P/P19fff6+3n9/Xq/l9er4+/fv8353ve96fXq29e++/j5+/P3++/n5v116+L0+/ze+/P/N39+9fl+L7+/32+a63r5v030vfS8/D7++/5uvve++/n1/ze++/4vPq9/X4/N5ed5e+/P++/e3p08fxe++3e93N1++m7+3fX9++/r8f5vf35/fr+/5+/83l5++r8fXze/3r9Ld/S71e/308++vfP025evze+/25v1d999fL38+v5v8/m+/N/v3x/A+/u7/4vL9+vrv23315ff/P1/Dvv6bf38NfP5e/5vfze++vTf1ffs75+nr++/N7/L1/f/evXyf/ADf5/T99vX5v+fr09f39PTr7+a0XfX0++/v83m230++/v3/v2ff6ft30/wA3e1++1fvvze82/T6fP5fP6eL26+vxefx/d3++/b1/X269/wCPf0+X5fv1fze9++/Pq6erf9fL9fvvq+ffzfvevr1/v07f3vvx/b0vv8/r6f1+/vf30++vx/L5vrze/vv4vX/N5N/TvvXfS/m959er42++/5ebX115+ff/3vf3vv/f073d3+evP6/P7fP02+/m8+vv0++/5urvev06en069er7/N/m3++/4/t+3t1v/AIvX+9X+/wC30f1+ff2++/v7vze8++/m3++v2/e++3ze3vvv/e36fv/N7/fS+bzevt8f763/AKftfze35/Lzefm+/m6dff8An792f+/fze/q+en+f033+evl7fH077e3/a5/e/L/AG++v/H+/S/75vvp7e/t5v8At69fXz+23+S/f32/b1++vr++/m9/N1/6335f4v8A3f8ADfze3/2/v/l9fL6a+u95vfze126e++/383S8/H9+/f5+71/7+/m++/ft7f193fS3Xz+f/a+evq11f19f123f+e9fv2/v83/8f/q3vv0++vr++/N3+Xv+3u+m7/D+/f34Xv83f3/AA3/ANf/AL0/S9X3f5vvvd783t7f5uL3b5e/B++3m/vL3v7ff/v8A83e/v4NfP13/AL4vfze/m75276v0ft38L6680a6S9966efX1++/s34ft91r3+S7/fvv521796/wC/v5/e7d/2219e9fv8X/Xvea6344x5v8evr4vX57+/zeX/AO3+/O1/N7fH1e/m4v3/AOe+/m7xef38y70vvq2vL3+fr8H7518X2ff5s1796+fvv8m/ffvvvv8AN3+P/a/G+/zevdv+Pv323+81/B1v8/x9/f33+0/b2/8Av36/l39/N7/f9/l03f4/b42m9f8A3+/v6fB3ffS+/d1ffvXy9fP8/d34v5f+/wDW39/f++/v/ADP62/vX9++/x382v29++/Dvf3vf26/9733r93+a0S/A/e5m+/e/v08ft09f/AI/f013/AOT3/A38z01m9v5fl+7v29y+/32+a4e/v5m/p8v30x9XjX8PzXft716+/vxI+prpL0e3n3d8/96L2+Xv8S5d++3/fXb3/AI/4D9f0+X8v4ftr82f5v+6/3n+M1e/0/ft7p/A0+nt0flx5+vrv8v8AF/s/j3/l/Dfzf89f5/4i3+fr9P4G/r634n/P63/3f5xO49f0+X/Xv6I1774+34H78Xp1581ff/AIvvvX0eX9m1rfv991fvef3v/m/v7fzf8v8Av1/3e95v4G/f9/M3/M31X8z3927/AL78/m6/8X46++9+/vf39eP95u/269++/f328X5/527f34f23e7f/e9Xf4v7+f5m/b9X9f38vf03v33/Bf+b43v7v83f3/AA3/ANf/AL0/S9X3f5vvvd783t7f5uL3b5e/B++3m/vL3v7ff/v8A83e/v4NfP13/AL4vfze/m75276v0ft38L6680a6S9966efX1++/s34ft91r3+S7/fvv521796/wC/v5/e7d/2219e9fv8X/Xvea6344x5v8evr4vX57+/zeX/AO3+/O1/N7fH1e/m4v3/AOe+/m7xef38y70vvq2vL3+fr8H7518X2ff5s1796+fvv8m/ffvvvv8AN3+P/a/G+/zevdv+Pv323+81/B1v8/x9/f33+0/b2/8Av36/l39/N7/f9/l03f4/b42m9f8A3+/v6fB3ffS+/d1ffvXy9fP8/d34v5f+/DW39/f++/v/ADP62/vX9++/x382v29++/Dvf3vf26/9733r93+a0S/A/e5m+/e/v08ft09f/AI/f013/AOT3/A38z01m9v5fl+7v29y+/32+a4e/v5m/p8v30x9XjX8PzXft716+/vxI+prpL0e3n3d8/96L2+Xv8S5d++3/fXb3/AI/4D9f0+X8v4ftr82f5v+6/3n+M1e/0/ft7p/A0+nt0flx5+vrv8v8AF/s/j3/l/Dfzf89f5/4i3+fr9P4G/r634n/P63/3f5xO49f0+X/3m3/2I=";

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

function getWednesday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day < 3 ? -4 : 3);
  return new Date(date.setDate(diff));
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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

// Autocomplete Input Component for Site / Project Selection
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

export default function TimesheetEntry({ user, userProfile }) {
  const activeUser = user || userProfile;
  const userId = activeUser?.uid;
  const userName = userProfile?.name || activeUser?.name || activeUser?.email || 'Staff Member';

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
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));

  const [weeklyHours, setWeeklyHours] = useState(0);
  const [weekRangeStr, setWeekRangeStr] = useState('');
  const [loadingHours, setLoadingHours] = useState(true);

  const [startTime, setStartTime] = useState('07:00');
  const [timeFinished, setTimeFinished] = useState(() => isFriday(formatDate(new Date())) ? '15:30' : '16:30');
  const [timeLeftSite, setTimeLeftSite] = useState('');
  const [timeReturned, setTimeReturned] = useState('');

  const [tasks, setTasks] = useState(() => [DEFAULT_BLANK_TASK(formatDate(new Date()))]);

  const [loading, setLoading] = useState(false);
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
    const day = new Date(currentMonday);
    day.setDate(currentMonday.getDate() + i);
    return {
      dateStr: formatDate(day),
      dayName: day.toLocaleDateString('en-NZ', { weekday: 'short' }),
      dayNumber: day.getDate(),
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
      companyCode: userProfile?.companyCode || 'SJR Builders',
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
        
        {/* Header Bar with Logo */}
        <div className="border-b border-slate-200 pb-3 mb-4 flex items-center gap-3">
          <img 
            src={SJR_BUILDERS_LOGO} 
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

        {/* 7-Day Navigation */}
        <div className="bg-slate-900 text-white p-3 rounded-xl mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-xs">
            <button
              type="button"
              onClick={() => {
                const p = new Date(currentMonday);
                p.setDate(p.getDate() - 7);
                setCurrentMonday(p);
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
                  setCurrentMonday(getMonday(new Date()));
                  setSelectedDate(todayStr);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-md font-bold transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = new Date(currentMonday);
                  n.setDate(n.getDate() + 7);
                  setCurrentMonday(n);
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
                    setCurrentMonday(getMonday(e.target.value));
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
