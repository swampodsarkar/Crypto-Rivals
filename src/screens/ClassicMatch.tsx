import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import { COINS, Coin } from '../services/cryptoService';
import { useAppStore } from '../store/useAppStore';
import { db, ref, push, set, serverTimestamp } from '../firebase/config';
import { useEnergy, MAX_ENERGY } from '../hooks/useEnergy';

export default function ClassicMatch() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { currentEnergy, timeUntilNext, consumeEnergy } = useEnergy();
  const [selectedCoin, setSelectedCoin] = useState<Coin>(COINS[0]);
  const [duration, setDuration] = useState<number>(2); // minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableCoins, setAvailableCoins] = useState<Coin[]>([]);

  useEffect(() => {
    // Pick 5 random coins
    const shuffled = [...COINS].sort(() => 0.5 - Math.random());
    setAvailableCoins(shuffled.slice(0, 5));
    setSelectedCoin(shuffled[0]);
  }, []);

  const handlePredict = async (choice: 'UP' | 'DOWN') => {
    if (!user || isSubmitting) return;
    
    if (currentEnergy <= 0) {
      setError('Not enough energy! Wait for refill.');
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

      // Create a match room for classic mode (single player)
      const roomRef = push(ref(db, 'rooms'));
      const roomId = roomRef.key;
      
      const now = Date.now();
      const endTime = now + duration * 60 * 1000;
      
      // Difficulty based on rank points
      const difficulty = user.rankPoints > 5000 ? 'hard' : user.rankPoints > 2000 ? 'medium' : 'easy';

      await set(roomRef, {
        mode: 'classic',
        coin: selectedCoin.symbol,
        duration: duration * 60,
        status: 'live',
        startPrice: selectedCoin.price,
        startTime: serverTimestamp(),
        endTime: endTime,
        difficulty: difficulty,
        player1: {
          uid: user.uid,
          choice: choice
        }
      });

      navigate(`/live/${roomId}`);
    } catch (error) {
      console.error("Error creating match:", error);
      setError('Failed to start match.');
      setIsSubmitting(false);
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
          <div className="flex items-center space-x-1 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
            <Zap size={14} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" fill="currentColor" />
            <span className="text-sm font-black text-white font-gaming">{currentEnergy}/{MAX_ENERGY}</span>
          </div>
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

        {/* Coin Selection */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] font-gaming">\\\\ Select Asset</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {availableCoins.map(coin => (
              <motion.button
                key={coin.symbol}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCoin(coin)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                  selectedCoin.symbol === coin.symbol
                    ? 'border-primary bg-primary/20'
                    : 'border-white/5 bg-bg-card/50 hover:border-white/20'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-1 text-[10px] font-black" style={{ color: coin.color }}>
                  {coin.symbol[0]}
                </div>
                <span className="text-[10px] font-black text-white">{coin.symbol}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Duration Selection */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] font-gaming">\\\\ Duration</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[2, 15, 30].map(mins => (
              <motion.button
                key={mins}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDuration(mins)}
                className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all relative overflow-hidden ${
                  duration === mins
                    ? 'border-blue-500 bg-blue-500/10 shadow-neon-primary'
                    : 'border-white/5 bg-bg-card/50 hover:border-white/20'
                }`}
              >
                <Clock size={16} className={duration === mins ? 'text-blue-400 mb-1 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-text-muted mb-1'} />
                <span className={`font-black text-sm font-gaming tracking-widest ${duration === mins ? 'text-blue-400' : 'text-white'}`}>{mins}M</span>
                {duration === mins && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500" />}
              </motion.button>
            ))}
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
          onClick={() => handlePredict('UP')}
          disabled={isSubmitting || currentEnergy <= 0}
          className="w-full bg-gradient-to-r from-up/20 to-up/5 border-2 border-up/50 hover:border-up text-up rounded-2xl py-5 flex flex-col items-center justify-center space-y-1 transition-all shadow-neon-up disabled:opacity-50 group"
        >
          <TrendingUp size={32} className="group-hover:-translate-y-1 transition-transform" />
          <span className="font-black text-xl font-gaming tracking-[0.2em] uppercase">Enter Match</span>
        </motion.button>
      </div>
    </div>
  );
}
