// components/InvestigationPanel.jsx
import React, { useState } from 'react';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import EvidenceCard from './EvidenceCard.jsx';
import EvidenceTimeline from './EvidenceTimeline.jsx';
import toast from 'react-hot-toast';

const FILTERS = [
  { id: 'all', label: 'All Logs' },
  { id: 'security', label: 'Security', types: ['SECURITY_LOG'] },
  { id: 'movement', label: 'Movement', types: ['MOVEMENT_TRACE'] },
  { id: 'systems', label: 'Systems', types: ['SYSTEM_EVENT', 'ACCESS_RECORD'] },
  { id: 'repairs', label: 'Repairs', types: ['REPAIR_LOG'] },
  { id: 'doors', label: 'Doors', types: ['DOOR_LOG'] },
  { id: 'comms', label: 'Comms', types: ['COMMUNICATION_LOG'] },
];

const InvestigationPanel = ({ onClose }) => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const myRoleInfo = useRoomStore((state) => state.myRoleInfo);
  const requestTrackerTrace = useRoomStore((state) => state.requestTrackerTrace);

  const [activeTab, setActiveTab] = useState('evidence'); // 'evidence' | 'timeline' | 'tracker'
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Tracker trace state
  const [selectedTrackerTarget, setSelectedTrackerTarget] = useState('');
  const [trackerTraces, setTrackerTraces] = useState([]);
  const [isTrackerQuerying, setIsTrackerQuerying] = useState(false);

  const discoveredEvidence = room?.game?.discoveredEvidence || [];
  const publicTimeline = room?.game?.publicTimeline || [];

  const myRole = myRoleInfo?.role || 'Crew';
  const isHacker = myRole === 'Hacker';
  const isTracker = myRole === 'Tracker';

  const handleTrackerQuery = async () => {
    if (!selectedTrackerTarget) return;
    setIsTrackerQuerying(true);
    setTrackerTraces([]);

    try {
      const res = await requestTrackerTrace(room.roomCode, playerId, selectedTrackerTarget);
      if (res.success) {
        setTrackerTraces(res.traces);
        if (res.traces.length === 0) {
          toast.error('No movement traces found for this player.');
        } else {
          toast.success('Movement trace report downloaded.');
        }
      } else {
        toast.error(res.message || 'Tracker diagnostics failed.');
      }
    } catch (err) {
      toast.error('Tracker error querying movement path.');
    } finally {
      setIsTrackerQuerying(false);
    }
  };

  // Filter Discovered list
  const filteredEvidence = discoveredEvidence.filter((ev) => {
    if (activeFilter === 'all') return true;
    const filterDef = FILTERS.find((f) => f.id === activeFilter);
    return filterDef?.types?.includes(ev.type);
  });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-[#07080d] border border-cyan-500/20 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base font-black text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
              <span>🔍</span>
              <span>INVESTIGATION INTERFACE</span>
            </h2>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              Access level: {myRole} (Cleared)
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-200 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all active:scale-[0.97]"
          >
            DISMISS
          </button>
        </div>

        {/* PRIMARY TABS */}
        <div className="flex border-b border-white/5 gap-2 pb-1.5">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
              activeTab === 'evidence'
                ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            DISCOVERED LOGS ({discoveredEvidence.length})
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
              activeTab === 'timeline'
                ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            FACILITY TIMELINE FEED
          </button>

          {isTracker && (
            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
                activeTab === 'tracker'
                  ? 'bg-teal-950/40 text-teal-400 border border-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              📍 TRACKER TRACE DIAGNOSTICS
            </button>
          )}
        </div>

        {/* ACTIVE TAB CONTENT */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'evidence' && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* FILTERS TOOLBAR */}
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-white/5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-3 py-1 rounded text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors ${
                      activeFilter === f.id
                        ? 'bg-cyan-500 text-black font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* CARDS CONTAINER */}
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredEvidence.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                    <span className="text-2xl opacity-40">📂</span>
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                      No matching undiscovered logs found at this filter depth.
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      Visit terminals inside the facility map to download logs.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                    {filteredEvidence.map((ev) => (
                      <EvidenceCard key={ev.id} evidence={ev} isHacker={isHacker} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="flex-1 overflow-y-auto pr-1 py-2">
              <EvidenceTimeline timeline={publicTimeline} />
            </div>
          )}

          {activeTab === 'tracker' && isTracker && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden text-left">
              <span className="text-xs font-mono text-slate-400">
                Authorized Tracker Interface: inspect the footprint trail and room movement history of any facility player.
              </span>

              {/* TARGET DROPDOWN CONTROLS */}
              <div className="flex gap-3 pb-4 border-b border-white/5">
                <select
                  value={selectedTrackerTarget}
                  onChange={(e) => setSelectedTrackerTarget(e.target.value)}
                  className="bg-black border border-cyan-500/20 text-xs text-slate-100 rounded-lg px-3 py-2 flex-grow focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="">Select Target player to trace...</option>
                  {room.players
                    .filter((p) => p.id !== playerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                </select>

                <button
                  onClick={handleTrackerQuery}
                  disabled={isTrackerQuerying || !selectedTrackerTarget}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-900 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all"
                >
                  {isTrackerQuerying ? 'QUERYING...' : 'RUN TRACKER REPORT'}
                </button>
              </div>

              {/* TRACE DISPLAY FEED */}
              <div className="flex-1 overflow-y-auto pr-1">
                {trackerTraces.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 font-mono text-xs uppercase tracking-wider gap-2">
                    <span>📍</span>
                    <span>No trace results loaded. Run target report.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pl-4 border-l border-teal-500/10">
                    {[...trackerTraces]
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((trace, idx) => {
                        const traceTime = new Date(trace.timestamp).toLocaleTimeString();
                        return (
                          <div key={idx} className="text-xs text-teal-300 font-mono leading-relaxed">
                            <span className="text-slate-500 mr-2">[{traceTime}]</span>
                            <span>{trace.description}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestigationPanel;
