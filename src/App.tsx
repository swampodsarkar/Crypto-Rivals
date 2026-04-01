import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { initAuth } from './firebase/authService';
import ErrorBoundary from './components/ErrorBoundary';

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
import ShootingGame from './screens/ShootingGame';

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
    <ErrorBoundary>
      <div className="mobile-container">
        <BrowserRouter>
          <Routes>
            {user ? (
              <>
                <Route path="/" element={<Home />} />
                <Route path="/play" element={<ShootingGame />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
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
    </ErrorBoundary>
  );
}
