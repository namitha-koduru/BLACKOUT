// components/SystemRestart.jsx
import React, { useState, useEffect } from 'react';

const SystemRestart = ({ onSuccess }) => {
  const [buttons, setButtons] = useState([]);
  const [currentStep, setCurrentStep] = useState(1); // Next expected click: 1 to 4

  // Shuffle grid numbers on mount
  useEffect(() => {
    const numbers = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    setButtons(numbers);
  }, []);

  const handleButtonClick = (num) => {
    if (num === currentStep) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      if (nextStep === 5) {
        setTimeout(() => onSuccess(), 400);
      }
    } else {
      // Wrong click resets sequence
      setCurrentStep(1);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0c0d16] border border-cyan-500/20 rounded-xl p-5 flex flex-col gap-4 relative select-none">
      <div className="text-center">
        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
          System Restart Sequence
        </h5>
        <p className="text-[10px] text-slate-400 mt-1">Press buttons in ascending order (1-4)</p>
      </div>

      <div className="border border-white/5 bg-[#05060b] rounded-lg p-6 min-h-[140px] flex flex-col gap-4 justify-center">
        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-4">
          {buttons.map((num) => {
            const isCompleted = num < currentStep;
            const isNext = num === currentStep;

            return (
              <button
                key={num}
                onClick={() => handleButtonClick(num)}
                className={`py-4 rounded-xl text-lg font-black font-mono transition-all active:scale-[0.97] ${
                  isCompleted
                    ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : isNext
                    ? 'bg-cyan-500 text-black animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Info panel */}
        <div className="text-center text-[9px] font-mono uppercase text-slate-500">
          Expected Input: <span className="text-cyan-400 font-bold">{currentStep <= 4 ? currentStep : 'DONE'}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemRestart;
