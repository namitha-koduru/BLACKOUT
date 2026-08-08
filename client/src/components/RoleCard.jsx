// components/RoleCard.jsx
import { motion } from 'framer-motion';

const TEAM_THEMES = {
  crew: {
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    glowColor: 'shadow-[0_0_25px_rgba(6,182,212,0.25)]',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    titleColor: 'text-cyan-300',
  },
  saboteur: {
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-[0_0_25px_rgba(239,68,68,0.25)]',
    badgeBg: 'bg-red-500/10 text-red-400 border-red-500/20',
    titleColor: 'text-red-300',
  },
};

const ROLE_ICONS = {
  Engineer: '⚙️',
  Investigator: '🔍',
  Medic: '🩺',
  Operator: '📡',
  Tracker: '📍',
  Crew: '👥',
  Saboteur: '😈',
  Hacker: '💾',
  Mimic: '🎭',
};

const RoleCard = ({ role, team, ability, description }) => {
  const isSab = team?.toLowerCase() === 'saboteur';
  const theme = isSab ? TEAM_THEMES.saboteur : TEAM_THEMES.crew;
  const icon = ROLE_ICONS[role] || '👤';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`w-full max-w-sm border ${theme.borderColor} ${theme.glowColor} bg-[#0b0c15]/90 rounded-2xl p-6 text-white text-left`}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          DECRYPTED SYSTEM RATING
        </span>
        <span className="text-2xl" role="img" aria-label={role}>
          {icon}
        </span>
      </div>

      <div className="text-center py-4">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">
          Your Assigned Role
        </span>
        <h2 className={`text-3xl font-black uppercase tracking-wider ${theme.textColor}`}>
          {role}
        </h2>
        <div className={`mt-3.5 inline-block px-3 py-1 rounded border text-[10px] font-black uppercase tracking-widest ${theme.badgeBg}`}>
          {team}
        </div>
      </div>

      <div className="mt-4 bg-[#05060a]/90 border border-white/5 p-4 rounded-xl">
        <div className={`font-black text-xs uppercase tracking-wider ${theme.textColor} mb-1.5`}>
          Ability: {ability.replace('_', ' ')}
        </div>
        <div className="text-xs text-slate-400 leading-relaxed">{description}</div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[10px] text-slate-500 italic">
          {isSab 
            ? '⚠️ Work secretly to disable facility operations.' 
            : '🛡️ Help fellow crew members restore power and systems.'
          }
        </p>
      </div>
    </motion.div>
  );
};

export default RoleCard;
