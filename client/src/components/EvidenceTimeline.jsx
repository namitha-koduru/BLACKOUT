// components/EvidenceTimeline.jsx
import React from 'react';

const EvidenceTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-slate-500 font-mono uppercase tracking-wider">
        No chronological logs logged yet.
      </div>
    );
  }

  // Sort timeline chronologically
  const sorted = [...timeline].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="flex flex-col gap-3 font-mono relative pl-4 border-l border-cyan-500/10">
      {sorted.map((item, i) => {
        const timeStr = new Date(item.timestamp).toLocaleTimeString();
        return (
          <div key={i} className="text-left text-[11px] leading-relaxed flex gap-2 relative">
            {/* Timeline Dot */}
            <div className="absolute -left-[20.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-500/30 border border-cyan-400/40" />

            <span className="text-cyan-400 font-bold min-w-[70px] select-none">
              [{timeStr}]
            </span>
            <span className="text-slate-300">
              {item.description}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default EvidenceTimeline;
