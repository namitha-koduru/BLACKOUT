// App.jsx
// Route table for multiplayer lobby system.

import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import CreateRoom from './pages/CreateRoom.jsx';
import JoinRoom from './pages/JoinRoom.jsx';
import Lobby from './pages/Lobby.jsx';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('blackout_setting_theme') || 'classic';
    document.body.classList.remove('theme-party', 'theme-neon', 'theme-classic');
    document.body.classList.add(`theme-${savedTheme}`);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join" element={<JoinRoom />} />
      <Route path="/room/:roomCode" element={<Lobby />} />
    </Routes>
  );
}

export default App;
