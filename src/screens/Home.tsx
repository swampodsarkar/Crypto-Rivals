import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useEnergy, MAX_ENERGY } from '../hooks/useEnergy';
import { 
  Trophy, 
  Coins, 
  Swords, 
  BarChart2, 
  Gift, 
  History, 
  ShoppingCart, 
  LogOut,
  Zap,
  Gem,
  Play,
  Users,
  Shield,
  Settings
} from 'lucide-react';
import { logout } from '../firebase/authService';

export default function Home() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const { currentEnergy, timeUntilNext } = useEnergy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mobile-container bg-bg-dark overflow-y-auto no-scrollbar pb-10 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
        {/* Faint grid/chart lines */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10">
        {/* Header Profile Section */}
        <div className="bg-bg-card/80 backdrop-blur-md border-b border-white/10 p-6 rounded-b-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-600" />
          
          {/* Notification Ticker */}
          <div className="absolute top-1 left-0 w-full overflow-hidden h-6 flex items-center bg-black/20">
            <motion.div 
              animate={{ x: ['100%', '-100%'] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="whitespace-nowrap flex items-center gap-8"
            >
              <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest font-gaming">\\\\ NEW SEASON STARTING SOON! GET READY FOR RANKED BATTLES!</span>
              <span className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest font-gaming">\\\\ TOP 10 PLAYERS THIS WEEK WILL RECEIVE EXCLUSIVE AVATARS!</span>
              <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest font-gaming">\\\\ JOIN A GUILD TO UNLOCK TEAM MISSIONS AND REWARDS!</span>
            </motion.div>
          </div>
          
          {/* Top Bar: Resources & Logout */}
          <div className="flex justify-between items-center mb-6 mt-2">
            <div className="flex items-center justify-between bg-black/40 rounded-2xl p-1.5 border border-white/5 shadow-inner flex-1 mr-4">
              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-xl border border-yellow-500/20">
                <Zap size={16} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" fill="currentColor" />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white leading-none">{currentEnergy}/{MAX_ENERGY}</span>
                  {timeUntilNext > 0 && (
                    <span className="text-[8px] text-yellow-400/80 font-mono leading-none mt-0.5">{formatTime(timeUntilNext)}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-transparent rounded-xl border border-blue-500/20">
                <Coins size={16} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" fill="currentColor" />
                <span className="text-xs font-black text-white">{(user.coins || 0).toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-xl border border-yellow-500/20">
                <Trophy size={16} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" fill="currentColor" />
                <span className="text-xs font-black text-white">{(user.rp || 0).toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-transparent rounded-xl border border-purple-500/20">
                <Gem size={16} className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" fill="currentColor" />
                <span className="text-xs font-black text-white">{(user.gems || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => navigate('/settings')}
                className="p-2 bg-white/5 border border-white/10 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-all shadow-sm active:scale-95 shrink-0"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 bg-white/5 border border-white/10 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-all shadow-sm active:scale-95 shrink-0"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="relative cursor-pointer" onClick={() => navigate('/profile')}>
                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                  <img 
                    src={user.avatar || null} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full border-2 border-bg-dark object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-bg-dark rounded-full p-1 shadow-xl">
                  <div className="bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 w-8 h-8 rounded-full flex items-center justify-center border border-yellow-200/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                    <span className="text-xs font-black text-white drop-shadow-md font-gaming">{user.rankTier[0]}</span>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm font-gaming uppercase">{user.username}</h2>
                <p className="text-xs text-primary font-bold tracking-widest uppercase font-gaming">{user.rankTier} Rank</p>
              </div>
            </div>
          </div>

        </div>

        {/* Main Action Buttons */}
        <div className="px-5 mt-8 space-y-5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/match/classic')}
            className="w-full relative group"
          >
            <div className="absolute inset-0 bg-blue-600/20 rounded-3xl blur-xl group-hover:bg-blue-600/30 transition-all" />
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-bg-card to-bg-dark border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-5">
              <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                    <BarChart2 size={28} className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white tracking-wide font-gaming uppercase">Classic Match</h3>
                    <p className="text-[10px] text-blue-200/60 font-bold mt-0.5 font-rajdhani tracking-widest uppercase">Casual prediction. Earn RP.</p>
                  </div>

                </div>
                
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center space-x-1.5 group-hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-all">
                  <span className="text-sm font-black text-white font-gaming">PLAY</span>
                  <Play size={14} className="text-white fill-white" />
                </div>

              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/match/pvp')}
            className="w-full relative group"
          >
            <div className="absolute inset-0 bg-purple-600/20 rounded-3xl blur-xl group-hover:bg-purple-600/30 transition-all" />
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-bg-card to-bg-dark border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-5">
              <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/20 shadow-inner">
                    <Trophy size={28} className="text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white tracking-wide font-gaming uppercase">Ranked PvP</h3>
                    <p className="text-[10px] text-purple-200/60 font-bold mt-0.5 font-rajdhani tracking-widest uppercase">1v1 Duel. Climb ranks.</p>
                  </div>

                </div>
                
                <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.4)] flex items-center space-x-1.5 group-hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] transition-all">
                  <span className="text-sm font-black text-white font-gaming">PLAY</span>
                  <Play size={14} className="text-white fill-white" />
                </div>

              </div>
            </div>
          </motion.button>
        </div>

        {/* Secondary Menu Grid */}
        <div className="px-5 mt-6 mb-8 grid grid-cols-4 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/leaderboard')}
            className="flex flex-col items-center justify-center bg-bg-card/80 backdrop-blur-sm border border-white/5 rounded-2xl p-3 shadow-lg hover:bg-white/5 transition-all aspect-square"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2 border border-yellow-500/20">
              <Trophy size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest font-gaming uppercase">Rank</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/guilds')}
            className="flex flex-col items-center justify-center bg-bg-card/80 backdrop-blur-sm border border-white/5 rounded-2xl p-3 shadow-lg hover:bg-white/5 transition-all aspect-square"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 border border-primary/20">
              <Shield size={20} className="text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest font-gaming uppercase">Guild</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/shop')}
            className="flex flex-col items-center justify-center bg-bg-card/80 backdrop-blur-sm border border-white/5 rounded-2xl p-3 shadow-lg hover:bg-white/5 transition-all aspect-square"
          >
            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center mb-2 border border-pink-500/20">
              <ShoppingCart size={20} className="text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest font-gaming uppercase">Shop</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/friends')}
            className="flex flex-col items-center justify-center bg-bg-card/80 backdrop-blur-sm border border-white/5 rounded-2xl p-3 shadow-lg hover:bg-white/5 transition-all aspect-square"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 border border-blue-500/20">
              <Users size={20} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest font-gaming uppercase">Friends</span>
          </motion.button>

        </div>
      </div>
    </div>
  );
}
