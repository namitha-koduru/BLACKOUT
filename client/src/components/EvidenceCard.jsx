// components/EvidenceCard.jsx
import React, { useState } from 'react';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import toast from 'react-hot-toast';

const EvidenceCard = ({ evidence, isHacker }) => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const corruptEvidenceRecord = useRoomStore((state) => state.corruptEvidenceRecord);

  const [isCorrupting, setIsCorrupting] = useState(false);
  const [falseSubjectId, setFalseSubjectId] = useState('');
  const [falseDescription, setFalseDescription] = useState('');

  const handleCorruptSubmit = async (e) => {
    e.preventDefault();
    if (!falseSubjectId || !falseDescription) {
      toast.error('Please specify a false subject and description.');
      return;
    }

    try {
      const res = await corruptEvidenceRecord(
        room.roomCode,
        playerId,
        evidence.id,
        falseSubjectId,
        evidence.location, // Keep target location same or customizable
        falseDescription
      );
      if (res.success) {
        toast.success('Evidence corrupted successfully!', { icon: '💾' });
        setIsCorrupting(false);
      } else {
        toast.error(res.message || 'Corruption failed.');
      }
    } catch (err) {
      toast.error('System error corrupting evidence.');
    }
  };

  const timeStr = new Date(evidence.timestamp).toLocaleTimeString();
  const reliabilityColor =
    evidence.reliability === 'HIGH'
      ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
      : evidence.reliability === 'MEDIUM'
      ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
      : 'text-red-400 border-red-500/20 bg-red-500/5';

  return (
    <div className={`p-4 rounded-xl border bg-[#0a0b12]/90 flex flex-col gap-2.5 shadow-md relative overflow-hidden text-left ${
      evidence.corrupted ? 'border-red-500/30' : 'border-cyan-500/10'
    }`}>
      {evidence.corrupted && (
        <div className="absolute top-0 right-0 bg-red-600 text-white font-mono font-black text-[7px] uppercase tracking-widest px-2 py-0.5 rounded-bl">
          ⚠️ CORRUPTED
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest font-mono">
          🔍 {evidence.type.replace('_', ' ')}
        </span>
        <span className="text-[9px] font-mono text-slate-500">{timeStr}</span>
      </div>

      {/* BODY */}
      <p className="text-xs text-slate-200 leading-relaxed font-mono">
        {evidence.description}
      </p>

      {/* FOOTER */}
      <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${reliabilityColor}`}>
          Reliability: {evidence.reliability}
        </span>

        {isHacker && !evidence.corrupted && (
          <button
            onClick={() => setIsCorrupting(!isCorrupting)}
            className="px-2.5 py-0.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black text-[9px] uppercase tracking-wider rounded transition-all"
          >
            {isCorrupting ? 'CANCEL' : 'CORRUPT'}
          </button>
        )}
      </div>

      {/* HACKER CORRUPTION OVERLAY FORM */}
      {isCorrupting && (
        <form
          onSubmit={handleCorruptSubmit}
          className="border-t border-fuchsia-500/20 pt-3 mt-1 flex flex-col gap-2"
        >
          <span className="text-[8px] font-mono text-fuchsia-400 uppercase tracking-wider">
            Infiltrate database logs:
          </span>

          <select
            value={falseSubjectId}
            onChange={(e) => setFalseSubjectId(e.target.value)}
            className="w-full bg-black/60 border border-fuchsia-500/20 text-xs text-slate-200 px-2 py-1 rounded focus:outline-none"
          >
            <option value="">Choose False Subject...</option>
            {room.players
              .filter((p) => p.id !== playerId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>

          <input
            type="text"
            placeholder="Falsified description log..."
            value={falseDescription}
            onChange={(e) => setFalseDescription(e.target.value)}
            className="w-full bg-black/60 border border-fuchsia-500/20 text-xs text-slate-200 px-2 py-1 rounded focus:outline-none placeholder-slate-600"
          />

          <button
            type="submit"
            className="w-full py-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black text-[9px] uppercase tracking-wider rounded"
          >
            INJECT CORRUPT RECORD
          </button>
        </form>
      )}
    </div>
  );
};

export default EvidenceCard;
