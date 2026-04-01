import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, User, LogIn, UserCircle } from 'lucide-react';
import { loginWithUsername } from '../firebase/authService';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      console.log("Attempting login with username:", username);
      await loginWithUsername(username);
      console.log("Login successful");
      // No need to set loading false as the app will redirect
    } catch (err) {
      console.error("Login failed:", err);
      setError('Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-container bg-bg-dark flex flex-col items-center justify-between py-16 px-6">
      <div className="flex flex-col items-center mt-12 w-full">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] mb-6"
        >
          <TrendingUp size={40} className="text-white" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl font-black text-white tracking-widest font-gaming uppercase"
        >
          BullBear Arena
        </motion.h1>
        
        <motion.p 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-text-muted mt-3 text-center font-rajdhani font-bold tracking-widest uppercase text-xs"
        >
          Predict crypto markets.<br/>Dominate the leaderboard.
        </motion.p>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full max-w-sm space-y-4"
      >
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <UserCircle size={20} className="text-text-muted" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your username"
              className="w-full bg-bg-card border border-border text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              maxLength={15}
            />
          </div>
          {error && <p className="text-red-500 text-xs pl-2">{error}</p>}
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading || !username.trim()}
          className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 active:scale-[0.98] transition-all py-4 rounded-xl font-semibold text-white shadow-[0_4px_14px_0_rgba(0,229,255,0.39)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={20} />
              <span>Enter Arena</span>
            </>
          )}
        </button>

        <button
          disabled
          className="w-full flex items-center justify-center space-x-3 bg-bg-card hover:bg-bg-card-hover border border-border transition-all py-4 rounded-xl font-medium text-text-muted opacity-50 cursor-not-allowed"
        >
          <LogIn size={20} />
          <span>Google Login (Coming Soon)</span>
        </button>
      </motion.div>
    </div>
  );
}
