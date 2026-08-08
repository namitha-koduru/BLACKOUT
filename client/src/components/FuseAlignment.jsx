// components/FuseAlignment.jsx
import React, { useState, useEffect } from 'react';

const FUSE_GLYPHS = {
  0: '│',
  45: '╱',
  90: '─',
  135: '╲',
};

const FuseAlignment = ({ onSuccess }) => {
  const [rotations, setRotations] = useState([90, 45, 135, 90]);

  // Randomize initial orientations on mount (guaranteeing none starts correct)
  useEffect(() => {
    const randomized = Array.from({ length: 4 }, () => {
      const degrees = [45, 90, 135];
      return degrees[Math.floor(Math.random() * degrees.length)];
    });
    setRotations(randomized);
  }, []);

  const handleFuseClick = (idx) => {
    const nextRotations = [...rotations];
    // Rotate by 45 degrees
    nextRotations[idx] = (nextRotations[idx] + 45) % 180;
    setRotations(nextRotations);

    // Win condition: all vertical (0 degrees)
    if (nextRotations.every((r) => r === 0)) {
      setTimeout(() => onSuccess(), 600);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0c0d16] border border-cyan-500/20 rounded-xl p-5 flex flex-col gap-4 relative select-none">
      <div className="text-center">
        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
          Fuse Alignment
        </h5>
        <p className="text-[10px] text-slate-400 mt-1">Rotate all fuses to vertical orientation</p>
      </div>

      <div className="flex justify-around items-center border border-white/5 bg-[#05060b] rounded-lg p-6 min-h-36">
        {rotations.map((rot, idx) => {
          const isAligned = rot === 0;
          return (
            <button
              key={idx}
              onClick={() => handleFuseClick(idx)}
              className={`w-12 h-20 border-2 rounded-xl flex flex-col items-center justify-between py-3 transition-all active:scale-95 ${
                isAligned
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'border-slate-700 bg-slate-800/20 text-slate-400 hover:border-slate-500'
              }`}
            >
              {/* Status Indicator */}
              <span className={`h-1.5 w-1.5 rounded-full ${isAligned ? 'bg-emerald-400' : 'bg-red-500'}`} />

              {/* Fuse body */}
              <span className="text-2xl font-bold font-mono leading-none select-none transition-transform duration-100">
                {FUSE_GLYPHS[rot]}
              </span>

              {/* Index */}
              <span className="text-[8px] font-mono text-slate-500">F-{idx + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FuseAlignment;
