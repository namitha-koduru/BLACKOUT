// components/Room.jsx
import React from 'react';

const Room = ({ name, x, y, w, h }) => {
  return (
    <div
      className="absolute border border-cyan-500/20 bg-[#0a0b12]/40 rounded-2xl shadow-[inset_0_0_30px_rgba(6,182,212,0.03)] flex items-center justify-center select-none pointer-events-none"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
      }}
    >
      {/* Center Label */}
      <span className="text-[10px] font-black tracking-widest text-cyan-400/25 uppercase select-none text-center px-2">
        {name}
      </span>
    </div>
  );
};

export default Room;
