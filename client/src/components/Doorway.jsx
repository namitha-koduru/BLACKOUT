// components/Doorway.jsx
import React from 'react';

const Doorway = ({ x, y, w, h }) => {
  return (
    <div
      className="absolute border border-dashed border-cyan-500/10 bg-cyan-950/5 select-none pointer-events-none z-10"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
      }}
    />
  );
};

export default Doorway;
