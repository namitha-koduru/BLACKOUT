# 🚨 BLACKOUT — Real-Time Multiplayer Social Deduction Game

BLACKOUT is a real-time multiplayer social deduction and investigation game designed for **4 to 10 players**. Trapped in a facility during a major power failure, players are secretly assigned roles. The majority are Crew members trying to restore critical systems and discover clues, while a secret minority are Saboteurs seeking to disrupt operations, manipulate evidence database records, and cause facility failure.

No database, authentication, or account registration is required — everything runs in-memory while the server is running.

---

## 🎮 Game Concept & Flow

1. **Lobby Waiting Room**: Players choose a nick name and avatar. The host configures lobby limits (4–10 players) and starts the game once all players are ready.
2. **Role Assignment (8s)**: Roles are securely and randomly assigned by the server. Each player sees a dramatic decrypted card reveal of their identity. Crew and Saboteur identities are strictly private.
3. **Countdown (5s)**: A synchronized, authoritative match countdown prepares players for exploration.
4. **Exploration Phase**: Players explore the facility in 2D top-down view, performing mini-game repairs, triggering sabotages, gathering security and access database evidence log files, or calling emergency meetings.
5. **Emergency Meeting & Discussion (30s)**: Discussion phase starts, blocking player movement. Players analyze security logs, access history, and camera traces to identify suspicious behavior.
6. **Voting Phase (15s)**: Players submit votes or choose to skip.
7. **Resolution**: Vote outcomes are revealed, and the eliminated player's role is announced.
8. **Win Conditions**:
   - **Crew Wins**: All critical systems are restored (100% health) OR all Saboteurs are eliminated.
   - **Saboteurs Win**: Any critical system health drops to 0% OR Saboteurs outnumber or equal the Crew.
9. **Final Investigation Timeline**: After the game ends, a chronological breakdown of all round movements, sabotages, and voting results is revealed to all players.

---

## 🎭 Game Roles & Abilities

### Crew Roles
- **Engineer**: Repairs facility systems faster.
- **Investigator**: Inspects database evidence and receives extra clues.
- **Medic**: Protects one player from a sabotage effect per round.
- **Operator**: Restores communication channels faster.
- **Tracker**: Inspects recent movement and location history of a target player.
- **Crew**: Standard crew member.

### Saboteur Roles
- **Saboteur**: Standard saboteur, triggers system breakdowns.
- **Hacker**: Manipulates or corrupts evidence records to create doubt.
- **Mimic**: Temporarily disguises identity/location info from Trackers.

---

## 🚀 Tech Stack

### Client (Frontend)
- **Vite & React 19**
- **Three.js & @react-three/fiber & @react-three/drei**: High-performance 3D engine, orbital cameras, and procedural map rendering.
- **Zustand**: Fast state stores for lobbies and game configurations.
- **Framer Motion**: Premium glassmorphic animations and slide transitions.
- **Tailwind CSS**: Dark emergency theme, cyan terminal text, and warning borders.

### Server (Backend)
- **Node.js & Express**
- **Socket.IO**: Authoritative real-time events.
- **In-Memory Store**: Managed rooms and timers map storing states securely.

---

## 🏛️ System Security Model

To prevent cheats:
- **Personalized State Sanitization**: The server deep-clones room state and sanitizes other players' roles and teams to `"hidden"` before broadcasting.
- **Authoritative Decisions**: All role selections, system health logs, task results, and timer bounds are validated and tracked server-side.
- **Spectator Isolation**: Spectators cannot retrieve any private role information.

---

## 📂 Folder Structure

```
blackout/
├── README.md              # Project documentation
├── client/                # Client Vite project
│   ├── src/
│   │   ├── components/    # RoleReveal, RoleCard, GameStartCountdown
│   │   ├── game3d/        # 3D Presentation (Canvas, Facility, Camera, Lighting, Models)
│   │   ├── pages/         # Lobby router entry, BlackoutGame wrapper, Home
│   │   ├── store/         # roomStore.js (Zustand)
│   │   └── App.jsx        # React Router routes
└── server/                # Server Node.js project
    ├── services/          # blackout.service.js, room.service.js
    └── socket/            # index.js (Socket.IO event handlers)
```

---

## 🔌 Socket.IO API Events

### Lobby / Setup
* **`createRoom`** / **`joinRoom`** / **`leaveRoom`**: Manages room creation and joins.
* **`playerReady`** / **`playerUnready`**: Sets player readiness status.
* **`reconnectSession`**: Session restoration within a 25-second grace period.

### Game Actions & Movement Sync
* **`startGame`**: Validates conditions (host only, >= 4 players, all ready) and initiates phase loop.
* **`roleAssigned`** *(Private)*: Sent to individual sockets; details player's role `{ role, team, ability, description }`.
* **`phaseChanged`**: Alerts phase transitions (`ROLE_ASSIGNMENT`, `COUNTDOWN`, `EXPLORATION`).
* **`timerUpdated`**: Emits remaining authoritative seconds to sync client HUDs.
* **`playAgain`**: Returns players to lobby waiting state.
* **`playerMove`** *(Client -> Server)*: Transmits current coordinates `{ roomCode, playerId, x, y }` during exploration.
* **`playerStopped`** *(Client -> Server)*: Transmits final stopping coordinates when key inputs cease, instantly broadcasting to all clients.
* **`playerPositions`** *(Server -> Client)*: 10Hz sync broadcast containing coordinates and rooms of all active players in the session.
* **`playerEnteredRoom`** *(Server -> Client)*: Broadcasts when a player crosses a doorway boundary into a new room.
* **`movementError`** *(Server -> Client)*: Triggered if a player's coordinates fail server checks, rolling them back.

### Facility Systems & Repair
* **`startRepair`** *(Client -> Server)*: Request a repair session on a system console. Returns a validation token and a random mini-game type (1 to 5).
* **`completeRepair`** *(Client -> Server)*: Submit successful completion of a mini-game, increasing system health (+20 normally, +30 for Engineer/Operator).
* **`failRepair`** *(Client -> Server)*: Cleans up active repair sessions when players cancel or fail tasks.

### Evidence & Investigation
* **`investigationRequest`** *(Client -> Server)*: Request evidence discovery from an interactive console terminal. Enforces 5s cooldowns and Comms checks.
* **`evidenceCorruptRequest`** *(Client -> Server)*: hacker ability to overwrite evidence subject details and descriptions with false logs.
* **`trackerInspectRequest`** *(Client -> Server)*: tracker ability to query a target player's recent movement history.

### Emergency Meetings & Voting
* **`callMeeting`** *(Client -> Server)*: Initiates emergency meeting. Pauses systems, resets coordinates, and opens discussion channels.
* **`submitVote`** *(Client -> Server)*: Casts secret vote (or Skip). Validates living status and blocks self-voting.
* **`meetingChatMessage`** *(Client -> Server)*: Transmits discussion messages during active meeting. Restricted to surviving players.

### Game End & Lobby Resets
* **`gameOver`** *(Server -> Client)*: Emitted when a win condition is declared, detailing the winning team.
* **`finalResults`** *(Server -> Client)*: Transmits compiled match scores, timelines, Hacker manipulation details, and voting rounds lists.
* **`playAgain`** *(Client -> Server)*: Host request to reset game states back to waiting room and ready up for a new match.
* **`returnToLobby`** *(Client -> Server)*: Host request to clear statistics and return all clients to the lobby.

### Crew Tasks & Imposter Kills
* **`startTask`** *(Client -> Server)*: Starts an assigned task mini-game. Returns task validation payload.
* **`completeTask`** *(Client -> Server)*: Completes a task, updating the global task progress bar.
* **`updateTaskProgress`** *(Client -> Server)*: Emits intermediate progress updates.
* **`killAttempt`** *(Client -> Server)*: Request by Imposter/Saboteur to eliminate a target crew member within range.
* **`reportBody`** *(Client -> Server)*: Reports a discovered dead body in a sector to initiate emergency body meeting.

---

## 🛠️ Local Installation & Development

### 1. Prerequisites
* **Node.js**: v18 or later
* **npm**: v9 or later

### 2. Environment Variables
Configure local variables to wire client/server hooks:

**Client (`client/.env`)**:
```env
VITE_SOCKET_URL=http://localhost:5000
```

**Server (`server/.env`)**:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Setup Commands
Run client and server concurrently:

**Run Backend Server**:
```bash
cd server
npm install
npm run dev
```

**Run Frontend Client**:
```bash
cd client
npm install
npm run dev
```

---

## 🏆 Production Deployment
* **Frontend**: Can be built for static hosting (e.g., Vercel, Netlify) using `npm run build` in the `client/` folder.
* **Backend**: Can be deployed to hosting providers supporting persistent WebSockets (e.g., Render, Railway) via `npm start` in the `server/` folder. Ensure CORS `CLIENT_URL` points to the deployed client.