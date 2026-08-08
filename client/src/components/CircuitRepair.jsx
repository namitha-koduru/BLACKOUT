// components/CircuitRepair.jsx
import React, { useState, useEffect } from 'react';

const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e']; // Red, Blue, Yellow, Green
const COLOR_NAMES = ['red', 'blue', 'yellow', 'green'];

const CircuitRepair = ({ onSuccess }) => {
  const [leftPorts, setLeftPorts] = useState([]);
  const [rightPorts, setRightPorts] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [connections, setConnections] = useState([]); // Array of { color, leftIdx, rightIdx }

  // Shuffle ports on mount
  useEffect(() => {
    const left = COLOR_NAMES.map((color, idx) => ({ id: idx, color, hex: COLORS[idx] })).sort(
      () => Math.random() - 0.5
    );
    const right = COLOR_NAMES.map((color, idx) => ({ id: idx, color, hex: COLORS[idx] })).sort(
      () => Math.random() - 0.5
    );
    setLeftPorts(left);
    setRightPorts(right);
  }, []);

  const handleLeftClick = (port) => {
    // If color already connected, ignore
    if (connections.some((conn) => conn.color === port.color)) return;
    setSelectedLeft(port);
  };

  const handleRightClick = (port, rightIdx) => {
    if (!selectedLeft) return;

    // Check if colors match
    if (selectedLeft.color === port.color) {
      const leftIdx = leftPorts.findIndex((p) => p.color === selectedLeft.color);
      const newConnections = [
        ...connections,
        { color: selectedLeft.color, hex: selectedLeft.hex, leftIdx, rightIdx },
      ];
      setConnections(newConnections);
      setSelectedLeft(null);

      // Check win condition
      if (newConnections.length === 4) {
        setTimeout(() => onSuccess(), 600);
      }
    } else {
      setSelectedLeft(null); // Reset on mismatch
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0c0d16] border border-cyan-500/20 rounded-xl p-5 flex flex-col gap-4 relative select-none">
      <div className="text-center">
        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
          Circuit Repair
        </h5>
        <p className="text-[10px] text-slate-400 mt-1">Connect matching colored terminals</p>
      </div>

      <div className="relative h-64 flex justify-between items-center border border-white/5 bg-[#05060b] rounded-lg p-4 overflow-hidden">
        {/* SVG wires layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {connections.map((conn, i) => {
            const y1 = 32 + conn.leftIdx * 56;
            const y2 = 32 + conn.rightIdx * 56;
            return (
              <line
                key={i}
                x1="45"
                y1={y1}
                x2="280"
                y2={y2}
                stroke={conn.hex}
                strokeWidth="5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] animate-pulse"
              />
            );
          })}
          {selectedLeft && (
            <line
              x1="45"
              y1={32 + leftPorts.findIndex((p) => p.color === selectedLeft.color) * 56}
              x2="160"
              y2="128"
              stroke={selectedLeft.hex}
              strokeWidth="3"
              strokeDasharray="5,5"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Left Terminals */}
        <div className="flex flex-col justify-around h-full z-20">
          {leftPorts.map((port, idx) => {
            const isSelected = selectedLeft?.color === port.color;
            const isConnected = connections.some((c) => c.color === port.color);
            return (
              <button
                key={`left-${port.color}`}
                onClick={() => handleLeftClick(port)}
                disabled={isConnected}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isConnected
                    ? 'border-slate-800 bg-slate-900/40 cursor-default opacity-50'
                    : isSelected
                    ? 'scale-110 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : 'hover:scale-105 active:scale-95'
                }`}
                style={{
                  borderColor: isConnected ? '#1e293b' : port.hex,
                  backgroundColor: isSelected ? port.hex : `${port.hex}15`,
                }}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: port.hex }} />
              </button>
            );
          })}
        </div>

        {/* Right Terminals */}
        <div className="flex flex-col justify-around h-full z-20">
          {rightPorts.map((port, rightIdx) => {
            const isConnected = connections.some((c) => c.color === port.color);
            return (
              <button
                key={`right-${port.color}`}
                onClick={() => handleRightClick(port, rightIdx)}
                disabled={isConnected}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isConnected
                    ? 'border-slate-800 bg-slate-900/40 cursor-default opacity-50'
                    : selectedLeft
                    ? 'hover:scale-110 border-dashed animate-pulse'
                    : 'opacity-80'
                }`}
                style={{
                  borderColor: isConnected ? '#1e293b' : port.hex,
                  backgroundColor: isConnected ? `${port.hex}25` : 'transparent',
                }}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: port.hex }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CircuitRepair;
