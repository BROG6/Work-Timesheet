// src/BuildersTools.jsx
import React, { useState, useId } from 'react';

export default function BuildersTools() {
  const [activeTab, setActiveTab] = useState('pythagoras');

  // Unique IDs for accessibility
  const baseId = useId();
  const sideAId = `${baseId}-sideA`;
  const sideBId = `${baseId}-sideB`;
  const sideCId = `${baseId}-sideC`;

  // --- Pythagoras State ---
  const [pyth, setPyth] = useState({
    sideA: '3000',
    sideB: '4000',
    sideC: '5000',
    lastEdited: ['sideA', 'sideB'],
  });

  // --- Volume State ---
  const [volType, setVolType] = useState('cube');
  const [cube, setCube] = useState({ length: 1000, width: 1000, depth: 100 });
  const [cyl, setCyl] = useState({ diameter: 1000, depth: 500 });

  // --- Balustrade State ---
  const [bal, setBal] = useState({
    totalSpan: 3000,
    picketWidth: 90,
    maxGap: 99,
    postWidth: 90,
    endPosts: 'both', // 'none' | 'one' | 'both'
  });

  // ==========================================
  // PYTHAGORAS HANDLERS & CALCULATIONS
  // ==========================================
  const handlePythChange = (field, val) => {
    const nextLastEdited = [field, ...pyth.lastEdited.filter((f) => f !== field)].slice(0, 2);
    const newPyth = { ...pyth, [field]: val, lastEdited: nextLastEdited };

    const [f1, f2] = nextLastEdited;
    const v1 = parseFloat(newPyth[f1]);
    const v2 = parseFloat(newPyth[f2]);

    if (!isNaN(v1) && !isNaN(v2) && v1 > 0 && v2 > 0) {
      const targetField = ['sideA', 'sideB', 'sideC'].find((f) => f !== f1 && f !== f2);

      if (targetField === 'sideC') {
        const a = f1 === 'sideA' ? v1 : v2;
        const b = f1 === 'sideB' ? v1 : v2;
        newPyth.sideC = Math.sqrt(a * a + b * b).toFixed(2);
      } else if (targetField === 'sideA') {
        const c = f1 === 'sideC' ? v1 : v2;
        const b = f1 === 'sideB' ? v1 : v2;
        newPyth.sideA = c > b ? Math.sqrt(c * c - b * b).toFixed(2) : '';
      } else if (targetField === 'sideB') {
        const c = f1 === 'sideC' ? v1 : v2;
        const a = f1 === 'sideA' ? v1 : v2;
        newPyth.sideB = c > a ? Math.sqrt(c * c - a * a).toFixed(2) : '';
      }
    }

    setPyth(newPyth);
  };

  const numA = parseFloat(pyth.sideA) || 0;
  const numB = parseFloat(pyth.sideB) || 0;
  const numC = parseFloat(pyth.sideC) || 0;

  const angleA = numA > 0 && numC > 0 && numC >= numA ? (Math.asin(numA / numC) * (180 / Math.PI)).toFixed(1) : '0';
  const angleB = numB > 0 && numC > 0 && numC >= numB ? (Math.asin(numB / numC) * (180 / Math.PI)).toFixed(1) : '0';
  const pitchRatio = numB > 0 ? (numA / numB).toFixed(3) : '0';

  // ==========================================
  // VOLUME CALCULATIONS
  // ==========================================
  let volM3 = 0;
  let premixBaths = 0;
  let premixBags = 0;

  if (volType === 'cube') {
    const l = (cube.length || 0) / 1000;
    const w = (cube.width || 0) / 1000;
    const d = (cube.depth || 0) / 1000;
    volM3 = l * w * d;
  } else {
    const r = (cyl.diameter || 0) / 2000;
    const d = (cyl.depth || 0) / 1000;
    volM3 = Math.PI * r * r * d;
  }

  premixBaths = volM3 * 2.4;
  premixBags = Math.ceil(volM3 * 108);

  // ==========================================
  // BALUSTRADE CALCULATIONS
  // ==========================================
  const span = parseFloat(bal.totalSpan) || 0;
  const pWidth = parseFloat(bal.picketWidth) || 0;
  const maxG = parseFloat(bal.maxGap) || 99;
  const postW = parseFloat(bal.postWidth) || 0;

  let effectiveOpening = span;
  if (bal.endPosts === 'one') {
    effectiveOpening = Math.max(0, span - postW);
  } else if (bal.endPosts === 'both') {
    effectiveOpening = Math.max(0, span - postW * 2);
  }

  const pitchUnit = pWidth + maxG;
  let numPickets = pitchUnit > 0 ? Math.ceil((effectiveOpening - maxG) / pitchUnit) : 0;
  if (numPickets < 0) numPickets = 0;

  const numGaps = numPickets + 1;
  const totalPicketWidth = numPickets * pWidth;
  const totalGapWidth = Math.max(0, effectiveOpening - totalPicketWidth);
  const exactGap = numGaps > 0 ? totalGapWidth / numGaps : 0;
  const centerToCenter = exactGap + pWidth;

  return (
    <div className="max-w-xl mx-auto space-y-4 my-4 pb-12 font-sans text-slate-800">
      {/* Tool Selector Navigation */}
      <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('pythagoras')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'pythagoras' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          📐 Pythagoras & Angles
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('volume')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'volume' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          📦 Volume (Concrete)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('balustrade')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'balustrade' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          🪵 Balustrade Spacing
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: PYTHAGORAS & ANGLES */}
      {/* =================================================================== */}
      {activeTab === 'pythagoras' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Pythagoras & Pitch Calculator</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Enter any 2 sides — the 3rd side auto-calculates in real-time.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor={sideAId} className="block text-xs font-bold text-slate-700 uppercase mb-1">Rise (A) mm</label>
                <input
                  id={sideAId}
                  type="number"
                  value={pyth.sideA}
                  onChange={(e) => handlePythChange('sideA', e.target.value)}
                  placeholder="Rise"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={sideBId} className="block text-xs font-bold text-slate-700 uppercase mb-1">Run (B) mm</label>
                <input
                  id={sideBId}
                  type="number"
                  value={pyth.sideB}
                  onChange={(e) => handlePythChange('sideB', e.target.value)}
                  placeholder="Run"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={sideCId} className="block text-xs font-bold text-slate-700 uppercase mb-1">Diagonal (C) mm</label>
                <input
                  id={sideCId}
                  type="number"
                  value={pyth.sideC}
                  onChange={(e) => handlePythChange('sideC', e.target.value)}
                  placeholder="Diagonal"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* SVG Visual Diagram */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
              <svg viewBox="0 0 300 170" className="w-full max-w-xs h-auto">
                <polygon points="40,130 250,130 40,30" fill="rgba(16, 185, 129, 0.1)" stroke="#0f172a" strokeWidth="2.5" />
                <path d="M 40 118 L 52 118 L 52 130" fill="none" stroke="#64748b" strokeWidth="1.5" />

                {/* Side Labels */}
                <text x="25" y="85" textAnchor="middle" fill="#047857" className="text-[11px] font-bold">
                  A: {numA || 0}
                </text>
                <text x="145" y="148" textAnchor="middle" fill="#047857" className="text-[11px] font-bold">
                  B: {numB || 0}
                </text>
                <text x="155" y="70" textAnchor="middle" fill="#047857" className="text-[11px] font-bold" transform="rotate(-23, 145, 75)">
                  C: {numC || 0}
                </text>

                {/* Pitch Angle Indicator */}
                <path d="M 210 130 A 40 40 0 0 0 220 113" fill="none" stroke="#0284c7" strokeWidth="2" />
                <text x="195" y="122" className="text-[10px] font-extrabold" fill="#0369a1">
                  {angleB}°
                </text>
              </svg>

              <div className="grid grid-cols-3 gap-2 w-full mt-3 text-center border-t border-slate-200 pt-3">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Pitch Angle</span>
                  <span className="text-sm font-extrabold text-slate-800">{angleB}°</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Top Angle</span>
                  <span className="text-sm font-extrabold text-slate-800">{angleA}°</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Rise/Run Ratio</span>
                  <span className="text-sm font-extrabold text-slate-800">{pitchRatio}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: VOLUME CALCULATOR */}
      {/* =================================================================== */}
      {activeTab === 'volume' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Concrete & Volume Calculator</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Calculate cubic metres and premix requirements.</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setVolType('cube')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                volType === 'cube' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟩 Cube / Slab / Footing
            </button>
            <button
              type="button"
              onClick={() => setVolType('cyl')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                volType === 'cyl' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟡 Cylinder / Post Hole
            </button>
          </div>

          {volType === 'cube' ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Length (mm)</label>
                <input
                  type="number"
                  value={cube.length}
                  onChange={(e) => setCube({ ...cube, length: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Width (mm)</label>
                <input
                  type="number"
                  value={cube.width}
                  onChange={(e) => setCube({ ...cube, width: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Depth (mm)</label>
                <input
                  type="number"
                  value={cube.depth}
                  onChange={(e) => setCube({ ...cube, depth: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Diameter (mm)</label>
                <input
                  type="number"
                  value={cyl.diameter}
                  onChange={(e) => setCyl({ ...cyl, diameter: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Depth / Height (mm)</label>
                <input
                  type="number"
                  value={cyl.depth}
                  onChange={(e) => setCyl({ ...cyl, depth: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Results Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-baseline border-b border-emerald-200 pb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase">Total Volume</span>
              <span className="text-2xl font-black text-emerald-700">{volM3.toFixed(3)} m³</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">25kg Premix Bags</span>
                <span className="text-lg font-extrabold text-slate-800">~{premixBags} bags</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Wheelbarrow Loads</span>
                <span className="text-lg font-extrabold text-slate-800">~{premixBaths.toFixed(1)} barrows</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: BALUSTRADE SPACING CALCULATOR */}
      {/* =================================================================== */}
      {activeTab === 'balustrade' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Balustrade Spacing Calculator</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              NZBC F4/AS1 compliant spacing (Max 100mm sphere / 99mm gap).
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total Opening / Span (mm)</label>
                <input
                  type="number"
                  value={bal.totalSpan}
                  onChange={(e) => setBal({ ...bal, totalSpan: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Picket Width (mm)</label>
                <input
                  type="number"
                  value={bal.picketWidth}
                  onChange={(e) => setBal({ ...bal, picketWidth: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Max Allowed Gap (mm)</label>
                <input
                  type="number"
                  value={bal.maxGap}
                  onChange={(e) => setBal({ ...bal, maxGap: parseFloat(e.target.value) || 99 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* End Posts Controls */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
              <label className="block font-bold text-slate-800 uppercase">End Posts Configuration</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'No End Posts' },
                  { id: 'one', label: '1 End Post' },
                  { id: 'both', label: 'Both Ends' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBal({ ...bal, endPosts: opt.id })}
                    className={`py-1.5 px-2 font-bold rounded border text-[11px] transition-colors cursor-pointer ${
                      bal.endPosts === opt.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {bal.endPosts !== 'none' && (
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Post Width / Thickness (mm)</label>
                  <input
                    type="number"
                    value={bal.postWidth}
                    onChange={(e) => setBal({ ...bal, postWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Required Pickets</span>
                <span className="text-xl font-black text-slate-900">{numPickets}</span>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <span className="block text-[10px] text-emerald-800 font-bold uppercase">Actual Gap</span>
                <span className="text-xl font-black text-emerald-700">{exactGap.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Center to Center</span>
                <span className="text-lg font-extrabold text-slate-800">{centerToCenter.toFixed(1)} mm</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Clear Opening</span>
                <span className="text-lg font-extrabold text-slate-800">{effectiveOpening} mm</span>
              </div>
            </div>

            {/* Visual Balustrade Representation */}
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 overflow-x-auto flex items-center justify-center min-h-[70px]">
              <div className="flex items-center h-12 bg-white px-2 border border-slate-300 rounded w-full justify-between gap-1">
                {(bal.endPosts === 'both' || bal.endPosts === 'one') && (
                  <div className="bg-slate-900 h-full rounded-xs flex items-center justify-center text-[8px] text-white font-bold px-1 min-w-[14px]">
                    P
                  </div>
                )}
                {Array.from({ length: Math.min(numPickets, 16) }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="h-full border-r border-dashed border-emerald-400 flex-1 min-w-[2px]" />
                    <div className="bg-emerald-600 h-full rounded-xs min-w-[6px]" />
                  </React.Fragment>
                ))}
                <div className="h-full border-r border-dashed border-emerald-400 flex-1 min-w-[2px]" />
                {bal.endPosts === 'both' && (
                  <div className="bg-slate-900 h-full rounded-xs flex items-center justify-center text-[8px] text-white font-bold px-1 min-w-[14px]">
                    P
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
