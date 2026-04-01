import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Gift, CalendarCheck, Coins } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, update } from '../firebase/config';

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    if (!user || isClaiming || claimed) return;
    setIsClaiming(true);

    try {
      await update(ref(db, `users/${user.uid}`), {
        rp: user.rp + 100
      });
      setClaimed(true);
    } catch (error) {
      console.error("Error claiming reward:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="mobile-container bg-bg-dark flex flex-col">
      {/* Header */}
      <div className="flex items-center p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-primary to-blue-600" />
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Daily Rewards</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center text-center py-6 relative z-10">
          <div className="relative w-28 h-28 mb-8">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl" 
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 p-1 shadow-neon-up">
              <div className="w-full h-full rounded-full bg-bg-card flex items-center justify-center border border-white/10">
                <Gift size={48} className="text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-3 font-gaming tracking-tight uppercase">Daily Login Bonus</h2>
          <p className="text-text-muted font-bold font-rajdhani uppercase tracking-widest text-sm max-w-[280px]">Come back every day to claim free RP and build your streak!</p>
        </div>

        <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <div className="flex items-center space-x-3 text-yellow-400 mb-8 group-hover:scale-110 transition-transform">
            <Coins size={32} className="drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
            <span className="text-4xl font-black font-gaming tracking-tighter text-glow-up">100 <span className="text-xl">RP</span></span>
          </div>
          
          <motion.button
            whileTap={!claimed ? { scale: 0.95 } : {}}
            onClick={handleClaim}
            disabled={isClaiming || claimed}
            className={`w-full py-5 rounded-2xl font-black text-xl font-gaming tracking-[0.2em] uppercase transition-all ${
              claimed 
                ? 'bg-black/40 border border-white/10 text-text-muted cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-neon-up hover:opacity-90 active:scale-95'
            }`}
          >
            {isClaiming ? (
              <div className="flex justify-center">
                <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : claimed ? (
              "Claimed Today"
            ) : (
              "Claim Reward"
            )}
          </motion.button>
        </div>

        <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
          <div className="flex items-center space-x-3 mb-6">
            <CalendarCheck size={20} className="text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
            <h3 className="font-black text-white font-gaming tracking-widest uppercase text-xs">\\\\ 7-Day Streak</h3>
          </div>
          
          <div className="flex justify-between items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <div key={day} className="flex flex-col items-center space-y-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                  day === 1 
                    ? 'bg-primary/20 border-primary text-primary shadow-neon-primary' 
                    : 'bg-black/40 border-white/5 text-text-muted'
                }`}>
                  {day === 7 ? <Gift size={18} className="text-inherit" /> : <span className="font-black font-gaming">{day}</span>}
                </div>
                <span className="text-[9px] text-text-muted font-black font-gaming tracking-widest uppercase opacity-60">Day {day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
