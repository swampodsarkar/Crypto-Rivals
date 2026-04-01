import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useEnergy, MAX_ENERGY } from '../hooks/useEnergy';
import { 
  Trophy, 
  Coins, 
  Swords, 
  Target,
  Crosshair,
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
  Settings,
} from 'lucide-react';
import { logout } from '../firebase/authService';
import { db, ref, update } from '../firebase/config';
import AdBanner from '../components/AdBanner';

export default function Home() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const { currentEnergy, timeUntilNext } = useEnergy();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMysteryBoxModal, setShowMysteryBoxModal] = useState(false);
  const [showQuestsModal, setShowQuestsModal] = useState(false);
  const [mysteryBoxReward, setMysteryBoxReward] = useState<{type: string, amount: number} | null>(null);
  const [isOpeningBox, setIsOpeningBox] = useState(false);

  useEffect(() => {
    if (user) {
      const initializeOrResetQuests = async () => {
        try {
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          
          if (!user.quests || !user.lastQuestReset || (now - user.lastQuestReset > oneDay)) {
            const defaultQuests = [
              { id: 'q1', description: 'Win 3 Ranked Matches', target: 3, progress: 0, rewardType: 'rp', rewardAmount: 50, completed: false, claimed: false },
              { id: 'q2', description: 'Predict correctly 5 times in a row', target: 5, progress: 0, rewardType: 'mysteryBox', rewardAmount: 1, completed: false, claimed: false },
              { id: 'q3', description: 'Play 5 Classic Matches', target: 5, progress: 0, rewardType: 'coins', rewardAmount: 500, completed: false, claimed: false }
            ];
            await update(ref(db, `users/${user.uid}`), {
              quests: defaultQuests,
              lastQuestReset: now
            });
          }
        } catch (error) {
          console.error("Error initializing/resetting quests:", error);
        }
      };
      initializeOrResetQuests();
    }
  }, [user]);

  const handleClaimQuest = async (questId: string) => {
    if (!user || !user.quests) return;
    const quest = user.quests.find(q => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) return;

    try {
      const updates: any = {};
      
      if (quest.rewardType === 'coins') updates.coins = (user.coins || 0) + quest.rewardAmount;
      if (quest.rewardType === 'rp') updates.rp = (user.rp || 0) + quest.rewardAmount;
      if (quest.rewardType === 'gems') updates.gems = (user.gems || 0) + quest.rewardAmount;
      if (quest.rewardType === 'mysteryBox') updates.mysteryBoxes = (user.mysteryBoxes || 0) + quest.rewardAmount;

      const updatedQuests = user.quests.map(q => 
        q.id === questId ? { ...q, claimed: true } : q
      );
      updates.quests = updatedQuests;

      await update(ref(db, `users/${user.uid}`), updates);
    } catch (error) {
      console.error("Error claiming quest:", error);
    }
  };

  const handleOpenMysteryBox = async () => {
    if (!user || (user.mysteryBoxes || 0) <= 0 || isOpeningBox) return;
    setIsOpeningBox(true);
    
    try {
      // Determine reward
      const rand = Math.random();
      let rewardType = 'coins';
      let rewardAmount = 0;
      
      if (rand < 0.6) {
        rewardType = 'coins';
        rewardAmount = Math.floor(Math.random() * 500) + 100; // 100-600 coins
      } else if (rand < 0.9) {
        rewardType = 'rp';
        rewardAmount = Math.floor(Math.random() * 50) + 10; // 10-60 RP
      } else {
        rewardType = 'gems';
        rewardAmount = Math.floor(Math.random() * 10) + 1; // 1-10 gems
      }

      const updates: any = {
        mysteryBoxes: (user.mysteryBoxes || 0) - 1
      };
      
      if (rewardType === 'coins') updates.coins = (user.coins || 0) + rewardAmount;
      if (rewardType === 'rp') updates.rp = (user.rp || 0) + rewardAmount;
      if (rewardType === 'gems') updates.gems = (user.gems || 0) + rewardAmount;

      await update(ref(db, `users/${user.uid}`), updates);
      
      setMysteryBoxReward({ type: rewardType, amount: rewardAmount });
    } catch (error) {
      console.error("Error opening mystery box:", error);
    } finally {
      setIsOpeningBox(false);
    }
  };

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
    <div className="flex-1 overflow-y-auto no-scrollbar pb-10 relative">
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
              <button 
                onClick={() => {
                  if (currentEnergy < MAX_ENERGY) {
                    window.open('https://www.profitablecpmratenetwork.com/mp1vkhzhk4?key=06a4b284e401f193b5b573230ad39254', '_blank');
                    update(ref(db, `users/${user.uid}`), {
                      energy: MAX_ENERGY,
                      lastEnergyUpdate: Date.now()
                    }).catch(console.error);
                  }
                }}
                className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-xl border border-yellow-500/20 hover:bg-yellow-500/30 transition-colors text-left"
              >
                <Zap size={16} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" fill="currentColor" />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white leading-none">{currentEnergy}/{MAX_ENERGY}</span>
                  {timeUntilNext > 0 && (
                    <span className="text-[8px] text-yellow-400/80 font-mono leading-none mt-0.5">{formatTime(timeUntilNext)}</span>
                  )}
                </div>
              </button>
              
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

              <div 
                onClick={() => setShowMysteryBoxModal(true)}
                className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-orange-500/20 to-transparent rounded-xl border border-orange-500/20 cursor-pointer hover:bg-orange-500/30 transition-colors"
              >
                <Gift size={16} className="text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" fill="currentColor" />
                <span className="text-xs font-black text-white">{(user.mysteryBoxes || 0).toLocaleString()}</span>
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
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full border-2 border-bg-dark object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-bg-dark rounded-full p-1 shadow-xl">
                  <div className="bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 w-8 h-8 rounded-full flex items-center justify-center border border-yellow-200/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                    <span className="text-xs font-black text-white drop-shadow-md font-gaming">{(user.rankTier || 'B')[0]}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm font-gaming uppercase">{user.username}</h2>
                  <div className="bg-primary/20 border border-primary/50 px-2 py-0.5 rounded text-[10px] font-black text-primary font-gaming">
                    LVL {user.level || 1}
                  </div>
                </div>
                <p className="text-xs text-primary font-bold tracking-widest uppercase font-gaming mb-2">{user.rankTier} Rank</p>
                
                {/* XP Bar */}
                <div className="w-48 h-2 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((user.xp || 0) % 1000) / 10}%` }}
                    className="h-full bg-gradient-to-r from-primary to-blue-500 shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                  />
                </div>
                <div className="flex justify-between w-48 mt-1">
                  <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">XP Progress</span>
                  <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{(user.xp || 0) % 1000} / 1000</span>
                </div>
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
                    <Target size={28} className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white tracking-wide font-gaming uppercase">Classic Match</h3>
                    <p className="text-[10px] text-blue-200/60 font-bold mt-0.5 font-rajdhani tracking-widest uppercase">Reflex training. Earn RP.</p>
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
                    <Crosshair size={28} className="text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white tracking-wide font-gaming uppercase">Ranked PvP</h3>
                    <p className="text-[10px] text-purple-200/60 font-bold mt-0.5 font-rajdhani tracking-widest uppercase">1v1 Duel. Highest score wins.</p>
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
            <span className="text-[8px] font-bold text-white tracking-widest font-gaming uppercase">Leaderboard</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/guilds')}
            className="flex flex-col items-center justify-center bg-bg-card/80 backdrop-blur-sm border border-white/5 rounded-2xl p-3 shadow-lg hover:bg-white/5 transition-all aspect-square"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 border border-primary/20">
              <Shield size={20} className="text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest font-gaming uppercase">Guilds</span>
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

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQuestsModal(true)}
            className="flex flex-col items-center justify-center bg-bg-card/80 backdrop-blur-sm border border-white/5 rounded-2xl p-3 shadow-lg hover:bg-white/5 transition-all aspect-square relative"
          >
            {user.quests?.some(q => q.completed && !q.claimed) && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-2 border border-green-500/20">
              <Target size={20} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest font-gaming uppercase">Quests</span>
          </motion.button>
        </div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
        <AdBanner />
      </div>

      {/* Quests Modal */}
      {showQuestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white font-gaming">DAILY QUESTS</h2>
              <button onClick={() => setShowQuestsModal(false)} className="text-text-muted hover:text-white">
                ✕
              </button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
              {user.quests?.map(quest => (
                <div key={quest.id} className="bg-bg-dark border border-white/5 rounded-xl p-4 flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-white leading-tight">{quest.description}</span>
                    <div className="flex items-center space-x-1 bg-white/5 px-2 py-1 rounded-lg">
                      {quest.rewardType === 'coins' && <Coins size={12} className="text-blue-400" />}
                      {quest.rewardType === 'rp' && <Trophy size={12} className="text-yellow-400" />}
                      {quest.rewardType === 'gems' && <Gem size={12} className="text-purple-400" />}
                      {quest.rewardType === 'mysteryBox' && <Gift size={12} className="text-orange-400" />}
                      <span className="text-xs font-bold text-white">+{quest.rewardAmount}</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${quest.completed ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-muted font-mono">{quest.progress} / {quest.target}</span>
                    {quest.claimed ? (
                      <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Claimed</span>
                    ) : quest.completed ? (
                      <button 
                        onClick={() => handleClaimQuest(quest.id)}
                        className="px-4 py-1.5 bg-green-500 hover:bg-green-400 text-black font-black text-xs rounded-lg uppercase tracking-wider transition-colors"
                      >
                        Claim
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-text-muted uppercase tracking-wider">In Progress</span>
                    )}
                  </div>
                </div>
              ))}
              {(!user.quests || user.quests.length === 0) && (
                <div className="text-center text-text-muted py-8">No quests available.</div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Mystery Box Modal */}
      {showMysteryBoxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500" />
            
            <h2 className="text-2xl font-black text-white font-gaming text-center mb-4">MYSTERY BOX</h2>
            
            {!mysteryBoxReward ? (
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 mb-6 relative">
                  <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
                  <Gift size={128} className="text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)] relative z-10" />
                </div>
                
                <p className="text-center text-text-muted mb-6 font-rajdhani text-sm">
                  You have <span className="text-orange-400 font-bold">{user.mysteryBoxes || 0}</span> Mystery Boxes. Open one to reveal a random reward!
                </p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setShowMysteryBoxModal(false)}
                    className="flex-1 py-3 rounded-xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-gaming text-sm"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleOpenMysteryBox}
                    disabled={isOpeningBox || (user.mysteryBoxes || 0) <= 0}
                    className="flex-1 py-3 rounded-xl font-black text-black bg-gradient-to-r from-orange-500 to-yellow-500 hover:opacity-90 transition-opacity font-gaming text-sm disabled:opacity-50"
                  >
                    {isOpeningBox ? 'OPENING...' : 'OPEN BOX'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-32 h-32 mb-6 relative flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl" />
                  {mysteryBoxReward.type === 'coins' && <Coins size={80} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] relative z-10" />}
                  {mysteryBoxReward.type === 'rp' && <Trophy size={80} className="text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.6)] relative z-10" />}
                  {mysteryBoxReward.type === 'gems' && <Gem size={80} className="text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.6)] relative z-10" />}
                </motion.div>
                
                <h3 className="text-xl font-black text-white font-gaming mb-2">YOU GOT</h3>
                <div className="text-4xl font-black text-yellow-400 font-mono mb-6 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                  +{mysteryBoxReward.amount} {mysteryBoxReward.type.toUpperCase()}
                </div>
                
                <button 
                  onClick={() => {
                    setMysteryBoxReward(null);
                    setShowMysteryBoxModal(false);
                  }}
                  className="w-full py-3 rounded-xl font-black text-black bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 transition-opacity font-gaming text-sm"
                >
                  AWESOME!
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
