// components/SabotageButton.jsx
import React from 'react';

const SabotageButton = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-6 w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 shadow-2xl transition-all active:scale-95 z-40 select-none ${
        isOpen
          ? 'border-red-500 bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
          : 'border-red-600/40 bg-red-950/80 text-red-500 hover:border-red-500 hover:bg-red-900/60 shadow-[0_0_10px_rgba(220,38,38,0.15)]'
      }`}
    >
      <span className="text-xl">😈</span>
      <span className="text-[7px] font-black tracking-widest font-mono uppercase leading-none mt-0.5">
        {isOpen ? 'CLOSE' : 'SABOTAGE'}
      </span>
    </button>
  );
};

export default SabotageButton;
