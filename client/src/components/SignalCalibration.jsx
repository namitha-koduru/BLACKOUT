// components/SignalCalibration.jsx
import React, { useState, useEffect, useRef } from 'react';

const SignalCalibration = ({ onSuccess }) => {
  const [posX, setPosX] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 3 successes
  const directionRef = useRef(1);
  const positionRef = useRef(0);

  // Oscillating signal animation loop
  useEffect(() => {
    let animId;
    const speed = 1.6 + progress * 0.8; // Speed up slightly on successive hits

    const updateSlider = () => {
      let nextPos = positionRef.current + directionRef.current * speed;

      if (nextPos >= 100) {
        nextPos = 100;
        directionRef.current = -1;
      } else if (nextPos <= 0) {
        nextPos = 0;
        directionRef.current = 1;
      }

      positionRef.current = nextPos;
      setPosX(nextPos);
      animId = requestAnimationFrame(updateSlider);
    };

    animId = requestAnimationFrame(updateSlider);
    return () => cancelAnimationFrame(animId);
  }, [progress]);

  const handleCalibrate = () => {
    const currentPos = positionRef.current;
    
    // Target zone is centered between 40% and 60%
    if (currentPos >= 40 && currentPos <= 60) {
      const nextProgress = progress + 1;
      setProgress(nextProgress);
      
      if (nextProgress >= 3) {
        setTimeout(() => onSuccess(), 400);
      }
    } else {
      // Miss resets progress to build tension!
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0c0d16] border border-cyan-500/20 rounded-xl p-5 flex flex-col gap-4 relative select-none">
      <div className="text-center">
        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
          Signal Calibration
        </h5>
        <p className="text-[10px] text-slate-400 mt-1">Calibrate signal in the target zone (3 hits)</p>
      </div>

      <div className="border border-white/5 bg-[#05060b] rounded-lg p-5 flex flex-col gap-5 justify-center min-h-[140px]">
        {/* Track Slider Bar */}
        <div className="relative w-full h-8 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center">
          {/* Target Zone Highlight */}
          <div
            className="absolute h-full bg-emerald-500/20 border-x border-emerald-500/30 flex items-center justify-center text-[8px] font-mono text-emerald-400 select-none"
            style={{ left: '40%', width: '20%' }}
          >
            TARGET
          </div>

          {/* Indicator slider */}
          <div
            className="absolute w-2 h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-75"
            style={{ left: `${posX}%` }}
          />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-3">
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={`h-2.5 w-2.5 rounded-full border transition-all ${
                progress >= step
                  ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                  : 'bg-slate-900 border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleCalibrate}
          className="w-full py-2 bg-cyan-500 text-black hover:bg-cyan-400 transition-all font-black text-xs uppercase tracking-wider rounded-lg shadow-md active:scale-[0.98]"
        >
          Calibrate Signal
        </button>
      </div>
    </div>
  );
};

export default SignalCalibration;
