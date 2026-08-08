// components/PowerRouting.jsx
import React, { useState, useEffect } from 'react';

const PowerRouting = ({ onSuccess }) => {
  const [correctPath, setCorrectPath] = useState(1); // Index 0, 1, or 2
  const [selectedPath, setSelectedPath] = useState(null);

  useEffect(() => {
    // Randomize correct path index on mount
    setCorrectPath(Math.floor(Math.random() * 3));
  }, []);

  const handlePathClick = (idx) => {
    setSelectedPath(idx);
    if (idx === correctPath) {
      setTimeout(() => onSuccess(), 600);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0c0d16] border border-cyan-500/20 rounded-xl p-5 flex flex-col gap-4 relative select-none">
      <div className="text-center">
        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
          Power Routing
        </h5>
        <p className="text-[10px] text-slate-400 mt-1">Select the active grid line to route power</p>
      </div>

      <div className="flex flex-col gap-3 border border-white/5 bg-[#05060b] rounded-lg p-5 min-h-[140px] justify-center">
        {/* Paths Grid */}
        {[0, 1, 2].map((idx) => {
          const isActive = idx === correctPath;
          const isSelected = selectedPath === idx;
          const isCorrectChoice = isSelected && isActive;
          const isWrongChoice = isSelected && !isActive;

          return (
            <button
              key={idx}
              onClick={() => handlePathClick(idx)}
              disabled={selectedPath !== null}
              className={`w-full py-2.5 rounded-xl border flex items-center justify-between px-4 transition-all ${
                isCorrectChoice
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : isWrongChoice
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : selectedPath !== null
                  ? 'border-slate-800 bg-slate-900/10 text-slate-600 opacity-40'
                  : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-500">LINE {idx + 1}</span>
                {/* Visual line pathway representation */}
                <span className="font-mono text-slate-600">
                  {isActive ? '━━━━━━ ✓ ━━━━━━' : '━━━ ✕ ━━━   ━━━'}
                </span>
              </div>
              <span className="text-xs font-black">
                {isCorrectChoice ? 'ACTIVE' : isWrongChoice ? 'SEVERED' : 'ROUTE'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PowerRouting;
