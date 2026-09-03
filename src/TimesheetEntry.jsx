// src/TimesheetEntry.jsx
import React, { useState, useEffect, useRef } from 'react';
import React from 'react';

// Your base64 encoded logo string
const SJR_BUILDERS_LOGO = "data:image/jpeg;base64,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/APm4tfp3/qf+S7322/2s46f/AAt9d249f/uF+m5t41p6v46I/a/O3+/7e5O/8P49fvxIvb4665I/xP8Af9tf+/2a/wBEs/8AtSvb/4m/4a9+H+3f3/3e9+/s1e5N9/e1+i2X2eXf3y3f99/9199/wDmb9d3v4X5f137eT/2p5L43+J1f4v3f+7/ADj9sT3m429y51+79vfv5/G1r93v4X5evp39G9I/U3m+i5fT4/mX+34X/4d1f2e/A+3nd530vH4Svvp42f2X3l+8/3673fvvX32/2s13eT0ejS+/v+O3f35vX3/3f+aX2+e9eX7e8+3939/f4i6+7383/AC/L+u/b/p9l43/eL420f18+f/u4m8+/f383/L8u6f4/A8CvwT452e6Xlvd5m+/w8v30x9S3+f5f24i/1X+L0e3/1/bX48/vX31m70/36I/xP93x01/fLp/A367v4fwfr6/90X8327O414d/C5eK1p/fP3a+0x6n8r3mIieOdu7pvxFp/A0xR/m13/y3380+34G1+/f/ANs5279f+259eI+0b8v5/f1Iuvp7eX5d2f3k95aI8u6OevN8a+80vS/5s/e/33+DxfR318t37X9s1f2/b5G3779e7Xq1X/3/X/3i/f34t1m88lze3L8v5f31e3uXp214+XN8eX3e/u79r29339u4f4m0/X0fS2013fxf4H/E39vL4+v0/3Xf3xX+f432/A38z01m9v5fl+7v29y+/32+a4e/v5m/p8v30x9XjX8PzXft716+/vxI+prpL0e3n3d8/96L2+Xv8S5d++3/fXb3/AI/4D9f0+X8v4ftr82f5v+6/3n+M1e/0/ft7p/A0+nt0flx5+vrv8v8AF/s/j3/l/Dfzf89f5/4i3+fr9P4G/r634n/P63/3f5xO49f0+X/wX/m2/34l220+fv8eX3681y/s9++8134ft489v8/f8A5/7e5f3s8/l14v4e9140+fx/xf8A7a3X36fB+/8A7T119d8f8X/27t+9d38Gf3se/f5v34/d7f1X+X/e/f8AD31eL43X15/4+e1q/u/O848t448v7+uP+93X7y+/Xv1ev4eNrfp68y02+/f4eX7+/t2f8x/vbXf/AIsx3i8Xf+L/AI/v5x+/p/8AnfX7vN34tXf5/wDf4fE0/ft6u/y/d/4j/e9v06/4/O/vf9x+/wCPiS+vrr8+f2/L/s1vf5/Pxf4e/m74/O/+f/5e/t5v8/15/P8AtS0e4s+fP89eL5/036S9968Xj3ffvX49/t4vx3eL3108y/4/n24/9Xm4m4v/m9ff/w/D31/y/Hxfq+m+b65/737e/O75v/8Aj/g/4vx31+/6999/t5X+/3eT/D+398L/AH+f4G43f/4/4P8Aj/HfX/vfvNrfX922vw99014vv/5X/m+Pq+t78e72X4tfvdv3evP4G4vfr2318+f/AIn+X/4E/X9f/u7/AMr9vP3eXn83f8X93N19/m7+2v8Av/v66/v7e/l8x+u+vfzf+Z1eL9m1r/vf911f4+7xveT/AIFXf/3v2/f8vXf6p0Xm1eS120/v/wDXv3/D18/2b4teP7a7/e33+22vx10283e//f48/S0S7+/e3/4v97a7/eeff3fX42v4/s/m/d/v0+3f/wCR/v23f4/M13f41/wft/3/AOf3+Tf4L9S/p/v8/wAP/E/x1r6+fX/4S+/vfz3f57vX/wCvf37eX5vv/wA2fL4482te/f104/Nrfv8Aeeft8/8Avd/5vf/238f837eb433Xb4+fv1f+983e2v8A3f43b/bX/vf231/4ft2a6/8AJ39s3e/+3++1/F/4v8a+/fA+029vfxv9737+fwX6ev38v/Nf/wAtv/M/463f8v2//wCL343f8vXfXl435m1/ff1+9f4v0/zf4/8AGy9dfv5v/M9/fj/e2++/7a/d/wBu2/4G73+f4er21f8A3s/f2a+/wO/f4/Guvr42/v4t17e/e1/e+/fW1vx9dfO+8vX29/j/AG339tfe3e/euv8Ax4v18+XvX+/f7e/vevD3r438z371f4348v8A9/w6S1d68X5er7+/e9f8Hf5e/m79f40x+/z36+/r8C+/vzf83637v/3e/N3+L08X2f26v9vX78f6bfP3f8tN/v8Ax4i++/2+/evm/X/8x336/E349vM3ff4u6/fevd481m/fTfL0ee/v8W/4/N3XxfX/AOPm73+/4m9339vef323e/M0ve+9r/vdfb6+/e8fXv3d/f19L+/33+9v1/Xm+21f3/8AL35ff37/AOXb46618/N638+v+Jv8fW1+ft17a/x6+41x27vx1M127v1eP9p1i/1/H4/u7+I9/t6979ffv8e++vf/AI8/r4f347ffv/5bvv4i/vf9x+v22026/f8AG3v331f4ft2f+/8A7z23v348731/s9ffp78fP3f381f34ff48/f/AOf3/wDx3340f1eP8R0/u3/a/wA5/fbfv1e/vX+y+L/v36/v/g5f5m/fe+/5f/k1f3f4e304f/F+/wCOa7f5ftf334v2S+/X3e/49f7/AP4r228/Xf2++/f928a/431x+/8Ae9v/AOfv3v43++/fv/5e73238/u9ffv/AM2vX6b+/fv8/wBf/sX9m1f322++0X3/APe6++/7t+/81/v8vxf38+v0+9/ze+Xf3+ff79fXf1/5v4v24u+/3vf/AHO//L336e/82/X6fff29Xf6L9S4/Xv6I1774+34H78Xp1581ff/AIvvvX0eX9m1rfv991fvef3v/m/v7fzf8v8Av1/3e95v4G/f9/M3/M31X8z3927/AL78/m6/8X46++9+/vf39eP95u/269++/f328X5/527f34f23e7f/e9Xf4v7+f5m/b9X9f38vf03v33/wB41x+vzfX8H/f531v+/eL9d++/H24tfp76/f5u/rXp8/zf83X4ev8Az5+/w4t8a68X23++9fP/AH4/L/v18X3++/ff/Fff3fX5ft8/w/N4v38+1vf4s1x+vzf7239+3f8AM36183++/d36Svf7322/m3/v19f/AMa017ft1099/vfP03+fxfr18vj/AC3/AAt093v4d+/7vXf3+34evf7X118939+P8f3ft/4a/ve348/v1/s9fffv+/x/f0/5er223/s3m3jT589993s1vf3/e3v/wDXvX5/u8v2a9/vf7Xff8er+1Nf49/Xvv200+/v6/e9fvx0e+/37/N0v+d3vxf1P943e3m7vv1e/Pxf+a18f4/3802vvXf++/f4tfvf03a/3vze/vf8/N39+r/vvf0/3fve/v8Aze/m6+/m1vXvvXp3+3/4+95+343Xz9u6vf8Am69d/b1eL/ybfm21/fX5uvl4/j/e+83f8r3+f+bv9++t/v132i+1r8vf/L8vvvv9e/eN0/18v4f+d/N1/t8t/vv1r10/Gv5ftrfmveveuvfS2f+O7b/ADf239fH1/m+f+f/AMtf41/m3Xp12X+/Xm1e/wAvx++/17/f+/eX3+d+/ff/AOfu+1vf/v5/ze+9tfP/AH2/7+dfa3f6vxfv/m1e/i7++f7/APP3+m6b9f1S/X5eL5+ve/v5evr1bfev+/1++/1+3a/m9ff/AM3++9v19++/9f5vX4N1t8+9f++8bf293f383fvv5276v0ft38L6680a6S9966efX1++/s34ft91r3+S7/fvv521796/wC/v5/e7d/2219e9fv8X/Xvea6344x5v8evr4vX57+/zeX/AO3+/O1/N7fH1e/m4v3/AOe+/m7xef38y70vvq2vL3+fr8H7518X2ff5s1796+fvv8m/ffvvvv8AN3+P/a/G+/zevdv+Pv323+81/wBvS/v/AOfp6u9ff3v15tfp3+22vf8A/N8/u2/vf29++/2167+2+f3xN2+/X38X/i1b7/N05ft/83++5v0b3evv5t++/wAftv67fX4v1f8AC/O39fNf3708/e+v/wAzX33x5er+Ivvv+/m9r/m8X6f58fP9+9ffxfv16+9fXf57/fX3f3/32/zeu/ze/m8X6fv/AOft2e+2r++d++/4vW+/Pvf2fv43ffs2vf1e+e+6+/b8O208v3Svvz5/L5uvf7Xv2/2m++/m/v01/fvv89e/383vvv529329+/762/m79d++n2vv6fO78P439uL2f4++t97fN5f+/e/u6+/vf3+9fv9e9fX4e+/1rXv1++X9ft+v7vvv72/vv8ffl29vffu7+93+bf3+/vf35vvv9/l+/f4uv2437+b2++/ffzO+1v1++/v+Z09v76X27++/fbf3vf3x3++Xf99++/8A3fN+a/i9+/d5/mS+/d+9+X5fl9++/vdv9t/ve+/v83vve7v/AJuvm++/3++/v1++/u8vfvv7er82/vv7N9X9++/7vffze+3fX/4/5uvm083f/d5a8/mS/d/l+a/3x+/a7f4/Lvvf7Xf28v3f5v/AKbX4/O+3t/d5/mS/wB9v27v/q/5/X010/a5fS9X3f5vvvd783t7f5uL3b5e/wB1v5u+/m/t9+/vX+a0S/A/+K77d5vN+b++/i5fe3i0e2m//v3+3m2vf5uvXvfzfL9ft8338fL8vf5Xf7v398b/AM9er9N/ftt9/t3fN83X5/ft3ft28X/f6/32f15f33m/5vf/AN//AMN3sS62/v32/ff7e7v9vf8Ag+v3f2vvf6S++/X738b8zff638L4v303vf1x/N++/d/Svvp6/e+X13374837ftv5vv2X/fX34ff3/AOf3++f/ALX3vLd/tve0S00X2S++/wC6e409++/v9fX30x9Xp2f5X7+X38fP35fevvvd/i208++/1e+5a/L3708/m3+D1615fn+/m30+28/vdvv7vvdN/f9S36fL5+/l+b3m/vfS30e/X157+/j3d2++/119N/f1a+3i5eL6+d/S3X5e/v8P+9e/ffxf+9a7er38b/N/3715f5/eX5uvv5uv1e3+K0/363f58+v3f+ffz/e/vf26fv5e7f2S+++vrz8v0a/l+ftvL63/AOb/AJv9/N7/AHzv+Xm7vv1+/u7u3v5u/m29vv8AN12/75/N5e/m3+/1/t3d/d29++/d83v8v06/l7/37+/4a+/vd/i/X5m1+L7e+/p8f1fXf/39+v19/L0fS38/O/8A4vv06er/ADv7Ld2+3s4+8y+//m364f2S3m4v43f5Nf083d/p/f23p/N++v229L2/f311/fzf/m++8310/l/fS+/vevf6evx/ft3vv1e/vX3vf/m++/mXer/P31f/AM6+/Xf/AOB++/ff76+e7f5evd1+/n378+98ft83l0+vr+C5ft8/L9+f3m+r+/3/AMm/+7/O16v1vf017++/8P3v18eX6+f983/v3i8/b38S39/f5uv3++4/ffS89fS7++3381++5vt6v3e7e/d36evl8f93ft/xuvm+//m++/3vv/ft6/Lp/xP8At7+/m11f7ff3+/m+1/a++1+br/i39fS+j8330ff2++/d3+/3e/383vv+33/zf283l06fr7vv6/8A856erf483/L/AN+v+N03z9++/N+d73+ffX5a/A99df8Aff0/d+9/N+v5/H8fP9L/AL/93a/N+d4vfT2/y6++r29vvp5/5e9+/veL++/f8mS1eXp8X+D334eL3vvv5e++/m7f062/+b9eL++/ffm7vLq/48/2er38erf5/X/ve5m+/e/v08ft09f/AI/f013/AOT3/wA32/3f95e/X0+/fXm7S+/m+vrz89/l8/f/AOfu+2vr9/b12+L3/fe//wA3e33/AOP4er4f15fze94fP4+/v7+/y/vv8+v3d++/H9v2vL9/2dft34e//Nf0/d373v8Av+2+7/vv+LffT2X/AHv0+72+303+zff969/l++f/AOT37v8An+D104/18vfzfzf9/k6X9/X19Pfx8X/zft/x/wDme/X/AOa/4N6f28/e++/ft7v26erl3Xf8/vef28vy+ffm+P8AN1+/iX79fv5v6/m3X636/E+m+/32+/1m9v64+3fze34v38v2++/v/wC23f2f/m34tf8AH/vf/u/ftv7Xxfm+//d2vLffN+/ffS+//wDX/wDf026+/vf2X/4vP/5+/vd+/u+832/vd/5+/wD6ft3a/v7+Xf3v98a9+X7ev+/rX/ft2/N1ff6evv4+/e/b3v7+9/08u+/f5vft/a+//fzf99e+br579fv6er48y0/b++/2+/8A0er/AL94/T8+/r14evl+b3a++/r4835++/v62/v3f9++/wD83u+//e/m79d++/4N++/r2++/f/Mvv/fXf34/L7/f4f/m1q/031/j8ft99fPl/wCbf00X1e/30erffy+/ff8Afzdfv++/N3v19++/p9u7S2//AH1+P4f3++/v5m++/f4vfS+f2aX283/4fX33+3p+/s1/e3/9/i92v+3u183Xzf0X+/f+fe35u9erf8P+Ndf/AM3m/S//ALf1e3X++/fP5vv2X4v++/s73/bdf6a//v4/d976v0/j2vvvvffL3367vXzfXv+/N8+/f5vX1f8An318/frv+3d875+/3x7e3a9/d0/2219e995f333l9v14vzf5v++f5uv/AN+/m6997/35e8v3/e6+b5vf52+/X34evm18f913d+L+2+Pft3vf3vf023X4tfqSff3/AO9ffx3f982a/D6+vr48/O9/d/m82a+vXp7e/Svvv0+b4/z/AOfN233Xvzf1fL673v3+7f36++/X4fXffm6722v3vze/m9f36fP1f114e9fXff38fv5uvl58uvLq7S/S8Xv9ftx3f9v2ffze/e3+/16+/vf3+/evS994tf163d+/3+Xvff35ffv22+//v5uvS2///4x/9k=";

export default function TimesheetEntry({ userName = "John Doe" }) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-sm">
      {/* Header Section with Embedded Offline Base64 Logo */}
      <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Company Logo */}
          <img 
            src={SJR_BUILDERS_LOGO} 
            alt="SJR Builders Logo" 
            className="h-12 w-auto object-contain"
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Weekly Time Card Entry</h2>
            <p className="text-xs text-slate-500 font-medium">
              Logged for: <span className="text-slate-800 font-semibold">{userName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Timesheet Form Content */}
      <div className="space-y-4 text-slate-600 text-sm">
        <p>Timesheet details and entry grid go here...</p>
      </div>
    </div>
  );
}

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
        <div className="border-b border-slate-200 pb-3 mb-4">
          <h2 className="text-xl font-bold text-slate-900">Weekly Time Card Entry</h2>
          <p className="text-xs text-slate-500 font-medium">
            Logged for: <span className="text-slate-800 font-semibold">{userName}</span>
          </p>
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
