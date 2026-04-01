import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Zap, Eye, Gift, Target, Coins, Crosshair } from 'lucide-react';
import { COINS, Coin } from '../services/cryptoService';
import { useAppStore } from '../store/useAppStore';
import { db, ref, push, set, update, serverTimestamp, onDisconnect } from '../firebase/config';
import { useEnergy, MAX_ENERGY } from '../hooks/useEnergy';
import PopunderAd from '../components/PopunderAd';

export default function ClassicMatch() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { currentEnergy, timeUntilNext, consumeEnergy } = useEnergy();
  const MODE_OPTIONS = [
    { id: 'standard', name: 'Standard', icon: Target, desc: 'Classic reflex training', color: 'text-blue-400' },
    { id: 'gold-rush', name: 'Gold Rush', icon: Coins, desc: '2x Points & Coins', color: 'text-yellow-400' },
    { id: 'sniper', name: 'Sniper', icon: Crosshair, desc: 'Tiny targets, High RP', color: 'text-red-400' },
  ];
  const [selectedMode, setSelectedMode] = useState(MODE_OPTIONS[0]);

  const DIFFICULTY_OPTIONS = [
    { id: 'easy', name: 'Recruit', multiplier: 1, color: 'text-green-400', desc: 'Large Targets' },
    { id: 'medium', name: 'Veteran', multiplier: 1.5, color: 'text-blue-400', desc: 'Medium Targets' },
    { id: 'hard', name: 'Elite', multiplier: 2.5, color: 'text-red-400', desc: 'Small Targets' },
  ];
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_OPTIONS[0]);
  
  const DURATION_OPTIONS = [
    { time: 60, label: '1 Min', multiplier: 1 },
    { time: 120, label: '2 Min', multiplier: 1.5 },
    { time: 180, label: '3 Min', multiplier: 2 },
  ];
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[0]);
  
  const POWER_UPS = [
    { id: 'oracle', name: 'Oracle Eye', cost: 100, icon: Eye, desc: '3s Hint' },
    { id: 'double', name: 'Double Boost', cost: 150, icon: Zap, desc: '2x Reward' }
  ];
  const [activePowerUps, setActivePowerUps] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableCoins, setAvailableCoins] = useState<Coin[]>([]);

  useEffect(() => {
    // No longer need coins
  }, []);

  const handleStartMatch = async () => {
    if (!user || isSubmitting) return;
    
    if (currentEnergy <= 0) {
      setError('Not enough energy! Wait for refill.');
      return;
    }

    const totalPowerUpCost = activePowerUps.reduce((acc, pId) => acc + POWER_UPS.find(p => p.id === pId)!.cost, 0);
    if ((user.coins || 0) < totalPowerUpCost) {
      setError('Not enough coins for selected power-ups!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const success = await consumeEnergy();
      if (!success) {
        setError('Failed to consume energy.');
        setIsSubmitting(false);
        return;
      }

      // Deduct power-up cost
      if (totalPowerUpCost > 0) {
        await update(ref(db, `users/${user.uid}`), {
          coins: (user.coins || 0) - totalPowerUpCost
        });
      }

      // Create a match room for classic mode (single player)
      const roomRef = push(ref(db, 'rooms'));
      const roomId = roomRef.key;
      
      const now = Date.now();
      const endTime = now + selectedDuration.time * 1000;
      
      await set(roomRef, {
        mode: 'classic',
        duration: selectedDuration.time,
        multiplier: selectedDuration.multiplier * selectedDifficulty.multiplier,
        status: 'live',
        startTime: serverTimestamp(),
        endTime: endTime,
        difficulty: selectedDifficulty.id,
        gameMode: selectedMode.id,
        player1: {
          uid: user.uid,
          username: user.username,
          currentScore: 0,
          doubleBoost: activePowerUps.includes('double')
        }
      });

      // Set activeRoomId for spectating
      await update(ref(db, `users/${user.uid}`), { activeRoomId: roomId });
      onDisconnect(ref(db, `users/${user.uid}/activeRoomId`)).set(null);

      navigate(`/live/${roomId}`);
    } catch (error) {
      console.error("Error creating match:", error);
      setError('Failed to start match.');
      setIsSubmitting(false);
    }
  };

  const togglePowerUp = (id: string, cost: number) => {
    if (activePowerUps.includes(id)) {
      setActivePowerUps(prev => prev.filter(p => p !== id));
    } else {
      const currentCost = activePowerUps.reduce((acc, pId) => acc + POWER_UPS.find(p => p.id === pId)!.cost, 0);
      if ((user?.coins || 0) < currentCost + cost) {
        setError('Not enough coins!');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setActivePowerUps(prev => [...prev, id]);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mobile-container bg-bg-dark flex flex-col">
      <PopunderAd />
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-primary to-blue-600" />
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Classic Match</h1>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Game Mode Selection */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] font-gaming">\\\\ Game Mode</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {MODE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMode(opt)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                    selectedMode.id === opt.id
                      ? `border-primary bg-primary/20`
                      : 'border-white/5 bg-bg-card/50 hover:border-white/20'
                  }`}
                >
                  <Icon size={18} className={`mb-1 ${selectedMode.id === opt.id ? opt.color : 'text-text-muted'}`} />
                  <span className={`text-[10px] font-black font-gaming tracking-widest uppercase text-center ${selectedMode.id === opt.id ? opt.color : 'text-white'}`}>{opt.name}</span>
                  <span className="text-[7px] text-text-muted mt-1 uppercase tracking-wider text-center leading-tight">{opt.desc}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Difficulty Selection */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] font-gaming">\\\\ Training Level</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {DIFFICULTY_OPTIONS.map(opt => (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDifficulty(opt)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  selectedDifficulty.id === opt.id
                    ? `border-primary bg-primary/20`
                    : 'border-white/5 bg-bg-card/50 hover:border-white/20'
                }`}
              >
                <span className={`text-xs font-black font-gaming tracking-widest uppercase ${opt.color}`}>{opt.name}</span>
                <span className="text-[8px] text-text-muted mt-1 uppercase tracking-wider">{opt.desc}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Duration Selection */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] font-gaming">\\\\ Session Time</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {DURATION_OPTIONS.map(opt => (
              <motion.button
                key={opt.time}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDuration(opt)}
                className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all relative overflow-hidden ${
                  selectedDuration.time === opt.time
                    ? 'border-blue-500 bg-blue-500/10 shadow-neon-primary'
                    : 'border-white/5 bg-bg-card/50 hover:border-white/20'
                }`}
              >
                <Clock size={16} className={selectedDuration.time === opt.time ? 'text-blue-400 mb-1 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-text-muted mb-1'} />
                <span className={`font-black text-sm font-gaming tracking-widest ${selectedDuration.time === opt.time ? 'text-blue-400' : 'text-white'}`}>{opt.label}</span>
                {selectedDuration.time === opt.time && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500" />}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Power-ups */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] font-gaming">\\\\ Power-ups</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {POWER_UPS.map(powerUp => {
              const isActive = activePowerUps.includes(powerUp.id);
              const Icon = powerUp.icon;
              return (
                <motion.button
                  key={powerUp.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => togglePowerUp(powerUp.id, powerUp.cost)}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 transition-all relative overflow-hidden ${
                    isActive
                      ? 'border-yellow-500 bg-yellow-500/10 shadow-neon-primary'
                      : 'border-white/5 bg-bg-card/50 hover:border-white/20'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-yellow-400 mb-1 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-text-muted mb-1'} />
                  <span className={`font-black text-xs font-gaming tracking-wider ${isActive ? 'text-yellow-400' : 'text-white'}`}>{powerUp.name}</span>
                  <span className="text-[9px] text-text-muted mt-1">{powerUp.desc}</span>
                  <div className="flex items-center mt-1 space-x-1">
                    <span className="text-[10px] font-bold text-yellow-500">{powerUp.cost}</span>
                    <span className="text-[8px] text-text-muted uppercase">Coins</span>
                  </div>
                  {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500" />}
                </motion.button>
              );
            })}
          </div>
        </section>

      </div>

      {/* Prediction Buttons */}
      <div className="p-6 bg-bg-card/80 backdrop-blur-md border-t border-white/10 relative pb-10">
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
          onClick={handleStartMatch}
          disabled={isSubmitting || currentEnergy <= 0}
          className="w-full bg-gradient-to-r from-primary/20 to-primary/5 border-2 border-primary/50 hover:border-primary text-primary rounded-2xl py-5 flex flex-col items-center justify-center space-y-1 transition-all shadow-neon-primary disabled:opacity-50 group"
        >
          <Zap size={32} className="group-hover:-translate-y-1 transition-transform" />
          <span className="font-black text-xl font-gaming tracking-[0.2em] uppercase">Start Shooting</span>
        </motion.button>
      </div>
    </div>
  );
}
