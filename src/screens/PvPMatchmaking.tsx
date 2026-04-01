import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Swords, Search, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, set, get, onValue, update, remove, serverTimestamp, onDisconnect } from '../firebase/config';
import { getRandomCoin, getRandomCoins } from '../services/cryptoService';
import { useEnergy, MAX_ENERGY } from '../hooks/useEnergy';
import PopunderAd from '../components/PopunderAd';

export default function PvPMatchmaking() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode') || 'pvp';
  
  const { user } = useAppStore();
  const { currentEnergy, timeUntilNext, consumeEnergy } = useEnergy();
  const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle');
  const [queueRef, setQueueRef] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (queueRef && user) {
        remove(ref(db, `queue/${mode}/${user.uid}`));
      }
    };
  }, [queueRef, user, mode]);

  const handleFindMatch = async () => {
    if (!user) return;
    
    if (currentEnergy <= 0) {
      setError('Not enough energy! Wait for refill.');
      return;
    }

    setStatus('searching');
    setError('');

    const success = await consumeEnergy();
    if (!success) {
      setError('Failed to consume energy.');
      setStatus('idle');
      return;
    }

    const myQueueRef = ref(db, `queue/${mode}/${user.uid}`);
    setQueueRef(myQueueRef);

    // Add to queue
    await set(myQueueRef, {
      uid: user.uid,
      username: user.username,
      rankTier: user.rankTier,
      joinedAt: serverTimestamp(),
      status: 'waiting',
      mode: mode
    });

    // Setup disconnect cleanup
    onDisconnect(myQueueRef).remove();

    // Listen to my queue node to see if I get matched
    const unsubscribe = onValue(myQueueRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && data.status === 'matched' && data.roomId) {
        setStatus('found');
        setTimeout(() => {
          unsubscribe();
          navigate(`/live/${data.roomId}`);
        }, 1500);
      }
    });

    // Try to find an opponent
    const queueSnapshot = await get(ref(db, `queue/${mode}`));
    if (queueSnapshot.exists()) {
      const allPlayers = queueSnapshot.val();
      const opponents = Object.keys(allPlayers).filter(
        uid => uid !== user.uid && allPlayers[uid].status === 'waiting'
      );

      if (opponents.length > 0) {
        // Match found!
        const opponentUid = opponents[0];
        const opponent = allPlayers[opponentUid];

        // Create room
        const roomId = `room_${Date.now()}_${user.uid}`;
        const duration = 3 * 60; // 3 minutes
        
        await update(ref(db), {
          [`rooms/${roomId}`]: {
            mode: mode,
            duration: duration,
            status: 'live',
            startTime: serverTimestamp(),
            endTime: Date.now() + duration * 1000,
            player1: {
              uid: user.uid,
              username: user.username,
              currentScore: 0
            },
            player2: {
              uid: opponentUid,
              username: opponent.username,
              currentScore: 0
            }
          },
          [`queue/${mode}/${user.uid}/status`]: 'matched',
          [`queue/${mode}/${user.uid}/roomId`]: roomId,
          [`queue/${mode}/${opponentUid}/status`]: 'matched',
          [`queue/${mode}/${opponentUid}/roomId`]: roomId,
          [`users/${user.uid}/activeRoomId`]: roomId,
          [`users/${opponentUid}/activeRoomId`]: roomId,
        });

        // Setup disconnect cleanup for activeRoomId
        onDisconnect(ref(db, `users/${user.uid}/activeRoomId`)).set(null);
        onDisconnect(ref(db, `users/${opponentUid}/activeRoomId`)).set(null);
      }
    }
  };

  const handleCancel = async () => {
    if (user) {
      await remove(ref(db, `queue/${mode}/${user.uid}`));
      setStatus('idle');
      setQueueRef(null);
      // Note: We don't refund energy on cancel for this prototype
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
      <div className="flex items-center justify-between p-5 border-b border-border bg-bg-card">
        <div className="flex items-center">
          <button 
            onClick={() => {
              handleCancel();
              navigate(-1);
            }} 
            className="p-2 -ml-2 text-text-muted hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-black text-white ml-2 font-gaming uppercase tracking-widest">{mode} PvP</h1>
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
            className="flex items-center space-x-1 bg-bg-dark px-3 py-1.5 rounded-full border border-border/50 hover:bg-white/5 transition-colors"
          >
            <Zap size={14} className="text-yellow-400" fill="currentColor" />
            <span className="text-sm font-bold text-white">{currentEnergy}/{MAX_ENERGY}</span>
          </button>
          {timeUntilNext > 0 && (
            <span className="text-[10px] text-text-muted mt-1 mr-1 font-mono">
              {formatTime(timeUntilNext)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {error && status === 'idle' && (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-full text-sm font-medium">
              {error}
            </div>
          </div>
        )}
        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center w-full"
          >
            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <Swords size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 font-gaming uppercase">Head-to-Head</h2>
            <p className="text-text-muted mb-8 font-rajdhani uppercase tracking-widest font-bold">
              Match against a real player.<br/>
              3 minute duration. Highest score wins.<br/>
              Winner takes all.
            </p>
            
            <div className="w-full bg-bg-card border border-white/10 rounded-2xl p-4 mb-8 flex justify-between items-center shadow-inner">
              <span className="text-text-muted font-bold font-gaming text-xs">ENTRY FEE</span>
              <span className="text-lg font-black text-yellow-400 font-gaming">100 RP</span>
            </div>

            <button
              onClick={handleFindMatch}
              disabled={currentEnergy <= 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-lg hover:opacity-90 active:scale-95 transition-all shadow-neon-down disabled:opacity-50 font-gaming tracking-widest"
            >
              FIND OPPONENT
            </button>
          </motion.div>
        )}

        {status === 'searching' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center w-full"
          >
            <div className="relative w-32 h-32 flex items-center justify-center mb-8">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-red-500/30"
              />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="absolute inset-4 rounded-full bg-red-500/40"
              />
              <div className="w-16 h-16 rounded-full bg-bg-card border-2 border-red-500 flex items-center justify-center relative z-10">
                <Search size={24} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Searching...</h2>
            <p className="text-text-muted mb-12">Looking for a worthy opponent</p>

            <button
              onClick={handleCancel}
              className="w-full max-w-[200px] py-3 rounded-xl bg-bg-card border border-border text-white font-medium hover:bg-bg-card-hover active:scale-95 transition-all"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {status === 'found' && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center w-full"
          >
            <div className="flex items-center justify-center space-x-6 mb-8">
              <div className="flex flex-col items-center">
                <img src={user?.avatar || null} alt="You" className="w-20 h-20 rounded-full border-2 border-primary mb-2" />
                <span className="font-bold text-white">You</span>
              </div>
              <div className="text-3xl font-black text-red-500 italic">VS</div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-2 border-red-500 bg-bg-card flex items-center justify-center mb-2">
                  <span className="text-2xl">?</span>
                </div>
                <span className="font-bold text-white">Opponent</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-up mb-2 animate-pulse">Match Found!</h2>
            <p className="text-text-muted">Preparing arena...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
