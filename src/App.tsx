import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { initAuth } from './firebase/authService';

// Screens
import Splash from './screens/Splash';
import Login from './screens/Login';
import Home from './screens/Home';
import ClassicMatch from './screens/ClassicMatch';
import RankedMatch from './screens/RankedMatch';
import PvPMatchmaking from './screens/PvPMatchmaking';
import LiveMatch from './screens/LiveMatch';
import History from './screens/History';
import Leaderboard from './screens/Leaderboard';
import Rewards from './screens/Rewards';
import Shop from './screens/Shop';
import Profile from './screens/Profile';
import Friends from './screens/Friends';
import Guilds from './screens/Guilds';
import Settings from './screens/Settings';
import CustomMatch from './screens/CustomMatch';
import InviteListener from './components/InviteListener';

export default function App() {
  const { isAuthReady, user } = useAppStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return <Splash />;
  }

  return (
    <div className="mobile-container">
      <BrowserRouter>
        {user && <InviteListener />}
        <Routes>
          {user ? (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/match/classic" element={<ClassicMatch />} />
              <Route path="/match/ranked" element={<RankedMatch />} />
              <Route path="/match/pvp" element={<PvPMatchmaking />} />
              <Route path="/match/custom/:roomId" element={<CustomMatch />} />
              <Route path="/live/:roomId" element={<LiveMatch />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:uid" element={<Profile />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/guilds" element={<Guilds />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </div>
  );
}
