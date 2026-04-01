import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Shield, Star, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useEnergy, MAX_ENERGY } from '../hooks/useEnergy';
import { db, ref, update } from '../firebase/config';

export default function RankedMatch() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { currentEnergy, timeUntilNext, consumeEnergy } = useEnergy();
  const [isQueueing, setIsQueueing] = useState(false);
  const [error, setError] = useState('');

  const handleQueue = async () => {
    if (currentEnergy <= 0) {
      setError('Not enough energy! Wait for refill.');
      return;
    }

    setIsQueueing(true);
    setError('');

    const success = await consumeEnergy();
    if (!success) {
      setError('Failed to consume energy.');
      setIsQueueing(false);
      return;
    }

    // In a real app, this would add to ranked queue in Firebase
    // For prototype, we'll simulate finding a match after a delay
    setTimeout(() => {
      navigate('/match/pvp?mode=ranked'); // Pass mode to matchmaking
    }, 1500);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mobile-container bg-bg-dark flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-primary to-blue-600" />
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Rank Match</h1>
        </div>
        <div className="flex flex-col items-end">
          <button 
            onClick={() => {
              if (currentEnergy < MAX_ENERGY && user) {
                window.open('https://www.profitablecpmratenetwork.com/mp1vkhzhk4?key=06a4b284e401f193b5b573230ad39254', '_blank');
                update(ref(db, `users/${user.uid}`), {
                  energy: MAX_ENERGY,
                  lastEnergyUpdate: Date.now()
                }).catch(console.error);
              }
            }}
            className="flex items-center space-x-1 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shadow-inner hover:bg-white/5 transition-colors"
          >
            <Zap size={14} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" fill="currentColor" />
            <span className="text-sm font-black text-white font-gaming">{currentEnergy}/{MAX_ENERGY}</span>
          </button>
          {timeUntilNext > 0 && (
            <span className="text-[10px] text-yellow-400/80 mt-1 mr-1 font-mono font-bold">
              {formatTime(timeUntilNext)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Current Rank Display */}
        <div className="flex flex-col items-center justify-center py-6 relative z-10">
          <div className="relative w-40 h-40 mb-6">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-purple-500/20 blur-2xl" 
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 via-primary to-blue-600 p-1 shadow-neon-primary">
              <div className="w-full h-full rounded-full bg-bg-card flex items-center justify-center border border-white/10">
                <Trophy size={64} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-1.5 rounded-full border-2 border-bg-dark shadow-neon-primary">
              <span className="text-xs font-black text-white tracking-[0.2em] uppercase font-gaming">{user?.rankTier}</span>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col items-center">
            <span className="text-4xl font-black text-white font-gaming tracking-tighter text-glow-primary">{(user?.rankPoints || 0).toLocaleString()} <span className="text-primary text-xl">PTS</span></span>
            <div className="mt-2 flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-text-muted font-bold tracking-widest font-gaming uppercase">Top 15% of players</span>
            </div>
          </div>
        </div>

        {/* Rules Card */}
        <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.3em] mb-2 font-gaming">\\\\ Ranked Rules</h3>
          
          <div className="flex items-start space-x-4 group-hover:translate-x-1 transition-transform">
            <div className="mt-1 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400 shadow-neon-primary">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-white font-black font-gaming text-sm tracking-wide uppercase">Strict Matchmaking</p>
              <p className="text-xs text-text-muted font-bold font-rajdhani uppercase tracking-widest mt-1">Face opponents within 1 tier of your rank.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4 group-hover:translate-x-1 transition-transform delay-75">
            <div className="mt-1 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-yellow-400 shadow-neon-up">
              <Star size={20} />
            </div>
            <div>
              <p className="text-white font-black font-gaming text-sm tracking-wide uppercase">High Stakes</p>
              <div className="flex gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-up" />
                  <span className="text-[10px] text-up font-black font-gaming">WIN: +25 PTS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-down" />
                  <span className="text-[10px] text-down font-black font-gaming">LOSS: -15 PTS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Button */}
      <div className="p-6 bg-bg-card/80 backdrop-blur-md border-t border-white/10 relative">
        {error && (
          <div className="absolute -top-14 left-0 right-0 flex justify-center px-6">
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-red-500/20 border border-red-500/50 text-red-400 w-full py-3 rounded-xl text-xs font-black font-gaming text-center tracking-widest uppercase shadow-neon-down"
            >
              {error}
            </motion.div>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleQueue}
          disabled={isQueueing || currentEnergy <= 0}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-primary to-blue-600 text-white font-black text-xl hover:opacity-90 active:scale-95 transition-all shadow-neon-primary disabled:opacity-50 flex justify-center items-center font-gaming tracking-[0.2em] uppercase"
        >
          {isQueueing ? (
            <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Enter Queue"
          )}
        </motion.button>
      </div>
    </div>
  );
}
