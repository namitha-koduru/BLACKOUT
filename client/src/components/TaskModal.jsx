// components/TaskModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const TaskModal = ({ task, onComplete, onCancel }) => {
  const { taskId, name, roomId, gameType } = task;
  const [success, setSuccess] = useState(false);

  // Wires Game State
  const [wires, setWires] = useState([]);
  const [activeWire, setActiveWire] = useState(null);

  // Slider Game State
  const [sliderVal, setSliderVal] = useState(0);
  const [targetMin] = useState(42);
  const [targetMax] = useState(58);
  const sliderDir = useRef(1);

  // Valve Game State
  const [pressure, setPressure] = useState(20);
  const [targetPressure] = useState(90);

  // Code Game State
  const [pinCode] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [inputCode, setInputCode] = useState('');

  // Camera Alignment State
  const [camX, setCamX] = useState(20);
  const [camY, setCamY] = useState(80);

  // Sample Analysis State
  const [sampleProgress, setSampleProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  // General initialization
  useEffect(() => {
    if (gameType === 'wires') {
      const colors = ['red', 'blue', 'yellow', 'green'];
      const lefts = colors.map((c, i) => ({ id: i, color: c, connected: false }));
      const rights = [...colors]
        .sort(() => Math.random() - 0.5)
        .map((c, i) => ({ id: i, color: c, connected: false }));
      setWires({ lefts, rights, connections: {} });
    }
  }, [gameType]);

  // Loop for slider calibration animation
  useEffect(() => {
    if (gameType !== 'slider' && gameType !== 'sample') return;
    
    let frameId;
    if (gameType === 'slider') {
      const updateSlider = () => {
        setSliderVal((prev) => {
          let next = prev + sliderDir.current * 2;
          if (next >= 100) {
            next = 100;
            sliderDir.current = -1;
          } else if (next <= 0) {
            next = 0;
            sliderDir.current = 1;
          }
          return next;
        });
        frameId = requestAnimationFrame(updateSlider);
      };
      frameId = requestAnimationFrame(updateSlider);
    }
    
    return () => cancelAnimationFrame(frameId);
  }, [gameType]);

  // Wires connections handler
  const handleConnectWire = (leftIdx, rightIdx) => {
    const leftColor = wires.lefts[leftIdx].color;
    const rightColor = wires.rights[rightIdx].color;

    if (leftColor === rightColor) {
      const newLefts = [...wires.lefts];
      const newRights = [...wires.rights];
      newLefts[leftIdx].connected = true;
      newRights[rightIdx].connected = true;

      const newConns = { ...wires.connections, [leftIdx]: rightIdx };
      setWires({ lefts: newLefts, rights: newRights, connections: newConns });

      if (Object.keys(newConns).length === 4) {
        triggerSuccess();
      }
    } else {
      toast.error('Mismatched terminal polarities.');
      setActiveWire(null);
    }
  };

  const triggerSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      onComplete();
    }, 800);
  };

  // Slider validation
  const handleSliderCalibrate = () => {
    if (sliderVal >= targetMin && sliderVal <= targetMax) {
      triggerSuccess();
    } else {
      toast.error('Calibration out of bounds. Stabilize frequency.');
    }
  };

  // Valve pressure adjustments
  const adjustValve = () => {
    setPressure((prev) => {
      const next = prev + 10;
      if (next >= targetPressure) {
        triggerSuccess();
        return targetPressure;
      }
      return next;
    });
  };

  // Code input pad handler
  const pressKey = (num) => {
    if (inputCode.length >= 4) return;
    setInputCode((prev) => prev + num);
  };

  const clearCode = () => setInputCode('');

  const submitCode = () => {
    if (inputCode === pinCode) {
      triggerSuccess();
    } else {
      toast.error('INVALID DECRYPTION CHECKSUM');
      setInputCode('');
    }
  };

  // Camera coordinates adjusters
  const moveCam = (dx, dy) => {
    setCamX((prev) => {
      const next = Math.max(0, Math.min(100, prev + dx));
      if (next === 50 && camY === 50) triggerSuccess();
      return next;
    });
    setCamY((prev) => {
      const next = Math.max(0, Math.min(100, prev + dy));
      if (camX === 50 && next === 50) triggerSuccess();
      return next;
    });
  };

  // Start analysis trigger
  const runAnalysis = () => {
    if (analyzing) return;
    setAnalyzing(true);
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setSampleProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        triggerSuccess();
      }
    }, 200);
  };

  const renderGame = () => {
    if (success) {
      return (
        <div className="flex flex-col items-center justify-center h-48 animate-bounce">
          <span className="text-3xl text-emerald-400">✓</span>
          <span className="text-xs font-black text-emerald-400 tracking-widest mt-2 uppercase">INTEGRITY ALIGNED</span>
        </div>
      );
    }

    switch (gameType) {
      case 'wires':
        return (
          <div className="flex justify-between items-center h-48 w-full px-6 font-mono">
            {/* Left ports */}
            <div className="flex flex-col justify-between h-full py-2">
              {wires.lefts?.map((port, idx) => (
                <button
                  key={idx}
                  disabled={port.connected}
                  onClick={() => setActiveWire(idx)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    port.connected
                      ? 'bg-emerald-950 border-emerald-500 cursor-default'
                      : activeWire === idx
                      ? 'bg-cyan-500 border-white scale-110 shadow'
                      : `bg-${port.color}-600 border-slate-700 hover:scale-105`
                  }`}
                  style={{
                    backgroundColor: port.connected ? '#065f46' : port.color,
                    borderColor: activeWire === idx ? '#fff' : '#1e293b'
                  }}
                />
              ))}
            </div>

            <div className="text-[9px] text-slate-500 text-center max-w-[120px]">
              {activeWire !== null ? 'TAP TARGET PORT TO PLUG WIRE' : 'SELECT SOURCE WIRE TO COMMENCE'}
            </div>

            {/* Right ports */}
            <div className="flex flex-col justify-between h-full py-2">
              {wires.rights?.map((port, idx) => (
                <button
                  key={idx}
                  disabled={port.connected}
                  onClick={() => {
                    if (activeWire !== null) {
                      handleConnectWire(activeWire, idx);
                      setActiveWire(null);
                    }
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    port.connected
                      ? 'bg-emerald-950 border-emerald-500 cursor-default'
                      : 'bg-slate-800 border-slate-700 hover:scale-105 hover:bg-slate-700'
                  }`}
                  style={{
                    backgroundColor: port.connected ? '#065f46' : '#1e293b',
                    borderColor: port.connected ? '#10b981' : '#334155'
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full mx-auto"
                    style={{ backgroundColor: port.connected ? '#10b981' : port.color }}
                  />
                </button>
              ))}
            </div>
          </div>
        );

      case 'slider':
        return (
          <div className="flex flex-col items-center justify-center h-48 w-full gap-5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Target Frequency: <span className="text-cyan-400 font-bold">{targetMin}% - {targetMax}%</span>
            </span>

            {/* Visual slider path */}
            <div className="w-full bg-slate-950 border border-slate-800 h-10 rounded-lg relative overflow-hidden">
              {/* Highlight Target Zone */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/25 border-x border-emerald-500/50"
                style={{ left: `${targetMin}%`, right: `${100 - targetMax}%` }}
              />
              {/* Slider indicator */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all"
                style={{ left: `${sliderVal}%` }}
              />
            </div>

            <button
              onClick={handleSliderCalibrate}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              Calibrate Frame
            </button>
          </div>
        );

      case 'valve':
        return (
          <div className="flex flex-col items-center justify-center h-48 w-full gap-5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Valve Pressure: <span className={pressure >= targetPressure ? 'text-emerald-400' : 'text-amber-500'}>{pressure} / {targetPressure} PSI</span>
            </span>

            {/* Circular Gauge */}
            <div className="w-20 h-20 rounded-full border-4 border-slate-800 flex items-center justify-center relative bg-slate-950 shadow-inner">
              <div
                className="w-1.5 h-10 bg-red-500 rounded-full absolute bottom-1/2 transform origin-bottom transition-all duration-300"
                style={{ transform: `rotate(${(pressure / 100) * 270 - 135}deg)` }}
              />
              <div className="w-3.5 h-3.5 bg-slate-700 rounded-full z-10" />
            </div>

            <button
              onClick={adjustValve}
              className="px-6 py-2 bg-[#22304a] hover:bg-[#2d3e5e] border border-white/10 text-[#cbd5e1] rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              Rotate Valve Valve
            </button>
          </div>
        );

      case 'code':
        return (
          <div className="flex items-center justify-between h-48 w-full px-4 gap-4 font-mono">
            {/* Screen */}
            <div className="flex-1 flex flex-col justify-center gap-3 bg-black/50 border border-slate-800 rounded-xl p-3 h-full">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest text-left">Mainframe Key</div>
              <div className="text-xl font-bold text-yellow-400 text-center tracking-widest bg-yellow-950/20 py-1.5 border border-yellow-500/20 rounded-lg">
                {pinCode}
              </div>
              <div className="h-0.5 w-full bg-white/5" />
              <div className="text-[9px] text-slate-500 uppercase tracking-widest text-left">Input buffer</div>
              <div className="text-lg font-black text-cyan-400 text-center tracking-widest h-8">
                {inputCode || '----'}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-1.5 w-44">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => pressKey(num)}
                  className="py-1.5 bg-[#172235] border border-white/5 text-[#cbd5e1] hover:bg-[#22304a] rounded font-bold text-xs transition-all active:scale-90"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={clearCode}
                className="py-1.5 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-950/45 rounded font-bold text-[9px] uppercase transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => pressKey(0)}
                className="py-1.5 bg-[#172235] border border-white/5 text-[#cbd5e1] hover:bg-[#22304a] rounded font-bold text-xs transition-all"
              >
                0
              </button>
              <button
                onClick={submitCode}
                className="py-1.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/45 rounded font-bold text-[9px] uppercase transition-all"
              >
                Enter
              </button>
            </div>
          </div>
        );

      case 'camera':
        return (
          <div className="flex items-center justify-between h-48 w-full px-4 gap-4 font-mono">
            {/* Camera display */}
            <div className="flex-1 bg-black border-2 border-slate-800 rounded-xl relative h-full overflow-hidden flex items-center justify-center">
              {/* Static overlay */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(transparent_50%,rgba(0,0,0,0.4))] z-10" />
              
              {/* Center target ring */}
              <div className="w-10 h-10 border border-dashed border-emerald-500 rounded-full absolute" />
              
              {/* Camera feed crosshair */}
              <div
                className="absolute text-cyan-400 text-lg transition-all duration-200"
                style={{ left: `calc(${camX}% - 10px)`, top: `calc(${camY}% - 10px)` }}
              >
                ✛
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex flex-col justify-center items-center gap-1.5 w-32 h-full">
              <button
                onClick={() => moveCam(0, -10)}
                className="w-10 h-10 bg-[#172235] hover:bg-[#22304a] rounded border border-white/5 font-bold text-xs flex items-center justify-center active:scale-90"
              >
                ▲
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={() => moveCam(-10, 0)}
                  className="w-10 h-10 bg-[#172235] hover:bg-[#22304a] rounded border border-white/5 font-bold text-xs flex items-center justify-center active:scale-90"
                >
                  ◀
                </button>
                <button
                  onClick={() => moveCam(10, 0)}
                  className="w-10 h-10 bg-[#172235] hover:bg-[#22304a] rounded border border-white/5 font-bold text-xs flex items-center justify-center active:scale-90"
                >
                  ▶
                </button>
              </div>
              <button
                onClick={() => moveCam(0, 10)}
                className="w-10 h-10 bg-[#172235] hover:bg-[#22304a] rounded border border-white/5 font-bold text-xs flex items-center justify-center active:scale-90"
              >
                ▼
              </button>
            </div>
          </div>
        );

      case 'sample':
        return (
          <div className="flex flex-col items-center justify-center h-48 w-full gap-5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Sample Centrifuge Analyzer
            </span>

            {/* Test tube rack */}
            <div className="flex gap-4">
              {[1, 2, 3].map((tube) => (
                <div
                  key={tube}
                  className={`w-4 h-16 rounded-b-full border-2 relative overflow-hidden bg-slate-900 ${
                    analyzing ? 'border-yellow-500/60' : 'border-slate-700'
                  }`}
                >
                  <div
                    className={`absolute bottom-0 inset-x-0 transition-all duration-1000 ${
                      tube === 1 ? 'bg-red-500' : tube === 2 ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ height: analyzing ? `${sampleProgress}%` : '40%' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                analyzing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-500/20 text-white active:scale-95 cursor-pointer'
              }`}
            >
              {analyzing ? 'Analyzing...' : 'Begin Process'}
            </button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-48">
            <span className="text-xs text-red-500 uppercase tracking-widest font-bold">Unknown Mini-game Driver</span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col w-full h-full gap-3 select-none">
      <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2 font-mono">
        <div className="text-left">
          <h4 className="text-sm font-extrabold text-[#22d3ee] uppercase tracking-wider">{name}</h4>
          <span className="text-[9px] text-slate-400">Sector: <span className="text-cyan-400 font-bold">{roomId}</span></span>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-red-400 font-mono tracking-widest font-black uppercase"
        >
          Cancel
        </button>
      </div>

      <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex-1 flex items-center justify-center">
        {renderGame()}
      </div>
    </div>
  );
};

export default TaskModal;
