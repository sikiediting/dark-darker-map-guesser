import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import GamePage from './components/GamePage';
import AdminPage from './components/AdminPage';
import LeaderboardPage from './components/LeaderboardPage';
import CampaignSelect from './components/CampaignSelect';
import LevelGallery from './components/LevelGallery';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/campaign" element={<CampaignSelect />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/gallery" element={<LevelGallery />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;