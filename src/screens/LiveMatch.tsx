import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Ban, Zap, Eye, Gift, Coins } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, onValue, update, serverTimestamp, get, push, set, remove, onDisconnect } from '../firebase/config';
import { getMockPriceUpdate, formatPrice } from '../services/cryptoService';

const EMOTES = ['🚀', '📉', '😭', '🤑', '🤡', '🔥'];

export default function LiveMatch() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [roomData, setRoomData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [emotes, setEmotes] = useState<any[]>([]);
  const [matchRewards, setMatchRewards] = useState<any>(null);
  
  // Shooting Game State
  const [score, setScore] = useState<number>(0);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [combo, setCombo] = useState<number>(0);
  const [lastHitTime, setLastHitTime] = useState<number>(0);
  const [hitFeedback, setHitFeedback] = useState<{ text: string, color: string, id: number, x: number, y: number } | null>(null);
  const [muzzleFlash, setMuzzleFlash] = useState<{ x: number, y: number, id: number } | null>(null);
  const [particles, setParticles] = useState<{ x: number, y: number, id: number, color: string }[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [showMissFlash, setShowMissFlash] = useState(false);
  
  const [spectatorCount, setSpectatorCount] = useState<number>(0);
  
  const targetRef = useRef<HTMLButtonElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const timerInitialized = useRef(false);
  const isEndingRef = useRef(false);

  const isPlayer1 = roomData?.player1?.uid === user?.uid;
  const isPlayer2 = roomData?.player2?.uid === user?.uid;
  const isSpectator = !isPlayer1 && !isPlayer2;
  
  const playerKey = isPlayer1 ? 'player1' : 'player2';
  const opponentKey = isPlayer1 ? 'player2' : 'player1';

  // Spectator Presence
  useEffect(() => {
    if (!roomId || !user) return;
    
    const spectatorRef = ref(db, `rooms/${roomId}/spectators/${user.uid}`);
    set(spectatorRef, true);
    onDisconnect(spectatorRef).remove();

    const spectatorsRef = ref(db, `rooms/${roomId}/spectators`);
    const unsub = onValue(spectatorsRef, (snap) => {
      if (snap.exists()) {
        setSpectatorCount(Object.keys(snap.val()).length);
      } else {
        setSpectatorCount(0);
      }
    });

    return () => {
      remove(spectatorRef);
      unsub();
    };
  }, [roomId, user]);

  const moveTarget = () => {
    if (isSpectator) return; // Spectators don't move targets
    setTargetPos({
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70
    });
  };

  const handleShoot = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSpectator) return; // Spectators can't shoot
    e.stopPropagation();
    if (!targetRef.current) return;
    
    const now = Date.now();
    const arenaRect = arenaRef.current?.getBoundingClientRect();
    const clickX = arenaRect ? e.clientX - arenaRect.left : e.clientX;
    const clickY = arenaRect ? e.clientY - arenaRect.top : e.clientY;

    // Trigger muzzle flash on hit too
    setMuzzleFlash({ x: clickX, y: clickY, id: now });

    const rect = targetRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distance = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
    );

    let accuracyPoints = 0;
    let feedback = { text: 'MISS', color: 'text-red-500' };

    if (distance < 8) {
      accuracyPoints = 500;
      feedback = { text: 'PERFECT!', color: 'text-yellow-400' };
    } else if (distance < 20) {
      accuracyPoints = 200;
      feedback = { text: 'GOOD', color: 'text-primary' };
    } else {
      accuracyPoints = 100;
      feedback = { text: 'OKAY', color: 'text-blue-400' };
    }

    const timeDiff = now - lastHitTime;
    
    let comboBonus = 0;
    if (timeDiff < 800) {
      setCombo(prev => prev + 1);
      comboBonus = combo * 50;
    } else {
      setCombo(0);
    }
    
    const totalPoints = accuracyPoints + comboBonus;
    const finalPoints = roomData?.gameMode === 'gold-rush' ? totalPoints * 2 : totalPoints;
    
    setScore(prev => prev + finalPoints);
    setLastHitTime(now);
    setHitFeedback({ ...feedback, id: now, x: clickX, y: clickY });
    setScreenShake(true);
    
    // Add particles
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      x: clickX,
      y: clickY,
      id: now + i,
      color: roomData?.gameMode === 'gold-rush' ? '#FACC15' : '#00E5FF'
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);

    setTimeout(() => setScreenShake(false), 100);
    moveTarget();
    
    // Sync score & combo to Firebase
    if (roomId) {
      update(ref(db, `rooms/${roomId}/${playerKey}`), {
        currentScore: score + finalPoints,
        currentCombo: combo + 1
      });
    }
  };

  const handleArenaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpectator) return; // Spectators can't shoot
    const arenaRect = arenaRef.current?.getBoundingClientRect();
    const clickX = arenaRect ? e.clientX - arenaRect.left : e.clientX;
    const clickY = arenaRect ? e.clientY - arenaRect.top : e.clientY;
    const now = Date.now();

    setMuzzleFlash({ x: clickX, y: clickY, id: now });
    
    // Miss Feedback
    setShowMissFlash(true);
    setCombo(0);
    setHitFeedback({ text: 'MISS', color: 'text-red-500', id: now, x: clickX, y: clickY });
    setTimeout(() => setShowMissFlash(false), 150);

    // Sync combo reset to Firebase
    if (roomId) {
      update(ref(db, `rooms/${roomId}/${playerKey}`), {
        currentCombo: 0
      });
    }
  };

  useEffect(() => {
    if (!roomId || !user) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoomData(data);
        
        if ((data.status === 'live' || data.status === 'sudden_death_live') && data.endTime) {
          if (!timerInitialized.current) {
            const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
            timerInitialized.current = true;
          }
        } else if (data.status === 'completed') {
          setTimeLeft(0);
          determineResult(data);
        }
      }
    });

    return () => {
      unsubscribe();
      // Clear activeRoomId on unmount if user is a player
      if (user?.uid) {
        update(ref(db, `users/${user.uid}`), { activeRoomId: null });
      }
    };
  }, [roomId, user]);

  useEffect(() => {
    if (roomData?.status === 'live' || roomData?.status === 'sudden_death_live') {
      timerInitialized.current = false;
      isEndingRef.current = false;
    }
  }, [roomData?.status]);

  useEffect(() => {
    if (!roomId) return;
    const emotesRef = ref(db, `rooms/${roomId}/emotes`);
    const unsubscribe = onValue(emotesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emotesList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        // Only show emotes from the last 3 seconds
        const recentEmotes = emotesList.filter(e => Date.now() - e.timestamp < 3000);
        setEmotes(recentEmotes);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // Host Logic for State Transitions
  useEffect(() => {
    if (!roomData || !user || !roomId) return;
    const isHost = roomData.player1.uid === user.uid;
    
    if (isHost && roomData.status === 'drafting') {
      // Auto-start since no coin selection needed
      update(ref(db, `rooms/${roomId}`), {
        status: 'live',
        startTime: serverTimestamp(),
        endTime: Date.now() + roomData.duration * 1000
      });
    }
    
    if (isHost && roomData.status === 'live') {
      // No longer need predicting logic
    }
  }, [roomData, user, roomId]);

  useEffect(() => {
    if (roomData?.status === 'live' || roomData?.status === 'sudden_death_live') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [roomData?.status]);

  useEffect(() => {
    if (roomData?.status === 'live' || roomData?.status === 'sudden_death_live') {
      const isSniper = roomData?.gameMode === 'sniper';
      if (isSniper) {
        const moveInterval = setInterval(() => {
          moveTarget();
        }, 1200); // Move every 1.2s in sniper mode
        return () => clearInterval(moveInterval);
      }
    }
  }, [roomData?.status, roomData?.gameMode]);

  useEffect(() => {
    if (timeLeft === 0 && (roomData?.status === 'live' || roomData?.status === 'sudden_death_live') && !isEndingRef.current) {
      isEndingRef.current = true;
      const endMatch = async () => {
        try {
          await update(ref(db, `rooms/${roomId}`), {
            status: 'completed',
            endTime: Date.now(),
            [`${playerKey}/finalScore`]: score
          });
        } catch (error) {
          console.error("Error ending match:", error);
          isEndingRef.current = false;
        }
      };
      endMatch();
    }
  }, [timeLeft, roomData?.status, roomId, score, playerKey]);

  const determineResult = (data: any) => {
    if (!user) return;
    
    const isPlayer1 = data.player1?.uid === user.uid;
    const isPlayer2 = data.player2?.uid === user.uid;
    const myFinalScore = isPlayer1 ? data.player1?.finalScore : (isPlayer2 ? data.player2?.finalScore : 0);
    const opponentFinalScore = isPlayer1 ? data.player2?.finalScore : data.player1?.finalScore;

    let result: 'win' | 'lose' | 'draw' = 'draw';
    
    if (data.mode === 'pvp' || data.mode === 'custom' || data.mode === 'ranked') {
      if (myFinalScore > opponentFinalScore) {
        result = 'win';
      } else if (myFinalScore < opponentFinalScore) {
        result = 'lose';
      } else {
        result = 'draw';
      }
    } else {
      // Classic mode: win if score > 5000
      if (myFinalScore >= 5000) {
        result = 'win';
      } else {
        result = 'lose';
      }
    }
    
    setMatchResult(result);
    if (!isSpectator) {
      updateUserStats(result, data);
    }
  };

  const updateUserStats = async (result: 'win' | 'lose' | 'draw', data: any) => {
    if (!user || !roomId) return;
    
    const historyRef = ref(db, `matchHistory/${user.uid}/${roomId}`);
    const historySnap = await get(historyRef);
    if (historySnap.exists()) return;

    const isRanked = data.mode === 'ranked' || data.mode === 'pvp';
    const rpChange = isRanked ? (result === 'win' ? 100 : result === 'lose' ? -50 : 0) : 0;
    
    // XP Logic: Ranked gives more, Classic gives less
    let xpChange = 0;
    if (isRanked) {
      xpChange = result === 'win' ? 500 : result === 'lose' ? 100 : 50;
    } else {
      xpChange = result === 'win' ? 100 : result === 'lose' ? 20 : 10;
    }
    
    let coinReward = 0;
    let mysteryBoxAwarded = false;
    
    if (data.mode === 'classic' && result === 'win') {
      let baseReward = 500 + Math.floor(Math.random() * 100);
      
      // Apply Risk Multiplier
      if (data.multiplier) {
        baseReward = Math.floor(baseReward * data.multiplier);
      }
      
      // Apply Double Boost
      const isPlayer1 = data.player1?.uid === user.uid;
      const doubleBoostActive = isPlayer1 ? data.player1?.doubleBoost : data.player2?.doubleBoost;
      if (doubleBoostActive) {
        baseReward *= 2;
      }
      
      // Apply Streak Bonus
      const currentStreak = user.currentStreak || 0;
      const newStreak = currentStreak + 1;
      
      if (newStreak === 3) {
        baseReward = Math.floor(baseReward * 1.5);
      } else if (newStreak >= 5) {
        baseReward = Math.floor(baseReward * 2);
        if (newStreak === 5) {
          mysteryBoxAwarded = true;
        }
      }
      
      coinReward = baseReward;
    }

    const rankChange = data.mode === 'ranked' || data.mode === 'pvp' ? (result === 'win' ? 25 : result === 'lose' ? -15 : 0) : 0;
    
    setMatchRewards({
      coinReward,
      rpChange,
      rankChange,
      xpChange,
      mysteryBoxAwarded,
      newStreak: result === 'win' ? (user.currentStreak || 0) + 1 : 0
    });

    const newXp = (user.xp || 0) + xpChange;
    const newLevel = Math.floor(newXp / 1000) + 1;

    const updates: any = {
      [`users/${user.uid}/rp`]: Math.max(0, (user.rp || 0) + rpChange),
      [`users/${user.uid}/xp`]: newXp,
      [`users/${user.uid}/level`]: newLevel,
      [`users/${user.uid}/coins`]: (user.coins || 0) + coinReward,
      [`users/${user.uid}/matches`]: (user.matches || 0) + 1,
    };

    if (mysteryBoxAwarded) {
      updates[`users/${user.uid}/mysteryBoxes`] = (user.mysteryBoxes || 0) + 1;
    }

    if (result === 'win') {
      updates[`users/${user.uid}/wins`] = user.wins + 1;
      updates[`users/${user.uid}/currentStreak`] = user.currentStreak + 1;
      updates[`users/${user.uid}/bestStreak`] = Math.max(user.bestStreak, user.currentStreak + 1);
    } else if (result === 'lose') {
      updates[`users/${user.uid}/losses`] = user.losses + 1;
      updates[`users/${user.uid}/currentStreak`] = 0;
    } else {
      updates[`users/${user.uid}/draws`] = user.draws + 1;
    }

    if (data.mode === 'ranked' || data.mode === 'pvp') {
      updates[`users/${user.uid}/rankPoints`] = Math.max(0, user.rankPoints + rankChange);
    }

    // Update Quests
    if (user.quests) {
      const updatedQuests = user.quests.map(q => {
        let newProgress = q.progress;
        if (!q.completed) {
          if (q.id === 'q1' && data.mode === 'ranked' && result === 'win') {
            newProgress += 1;
          } else if (q.id === 'q2') {
            if (result === 'win') newProgress += 1;
            else if (result === 'lose') newProgress = 0;
          } else if (q.id === 'q3' && data.mode === 'classic') {
            newProgress += 1;
          }
        }
        return {
          ...q,
          progress: newProgress,
          completed: newProgress >= q.target || q.completed
        };
      });
      updates[`users/${user.uid}/quests`] = updatedQuests;
    }

    updates[`matchHistory/${user.uid}/${roomId}`] = {
      mode: data.mode,
      gameMode: data.gameMode || 'standard',
      score: score,
      result,
      rpChange,
      rankChange,
      playedAt: serverTimestamp()
    };

    await update(ref(db), updates);
  };

  const handleBanCoin = async (symbol: string) => {
    // No longer needed
  };

  const sendEmote = async (emote: string) => {
    if (!user || !roomId) return;
    await push(ref(db, `rooms/${roomId}/emotes`), {
      uid: user.uid,
      emote,
      timestamp: Date.now()
    });
  };

  if (!roomData) {
    return (
      <div className="mobile-container bg-bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getTargetSize = () => {
    const isSniper = roomData?.gameMode === 'sniper';
    const baseSize = isSniper ? 0.5 : 1;
    
    switch (roomData?.difficulty) {
      case 'hard': return isSniper ? 'w-6 h-6' : 'w-10 h-10';
      case 'medium': return isSniper ? 'w-8 h-8' : 'w-14 h-14';
      default: return isSniper ? 'w-10 h-10' : 'w-20 h-20';
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const myScore = isSpectator ? (roomData?.player1?.currentScore || 0) : score;
  const opponentScore = isSpectator ? (roomData?.player2?.currentScore || 0) : (isPlayer1 ? roomData.player2?.currentScore : roomData.player1?.currentScore);

  return (
    <div className={`mobile-container bg-bg-dark flex flex-col relative overflow-hidden ${screenShake ? 'animate-shake' : ''}`}>
      {/* Spectator Overlay */}
      {isSpectator && (
        <div className="absolute top-20 left-0 w-full z-50 pointer-events-none flex justify-center">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-purple-600/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-purple-400/50 flex items-center gap-2 shadow-neon-primary"
          >
            <Eye size={14} className="text-white animate-pulse" />
            <span className="text-[10px] font-black text-white font-gaming tracking-widest uppercase">Spectating Live Match</span>
          </motion.div>
        </div>
      )}

      {/* Background Glows */}
      {(roomData.status === 'live' || roomData.status === 'sudden_death_live') && (
        <div className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-500">
          <div className={`absolute top-0 left-0 w-full h-full ${roomData.gameMode === 'gold-rush' ? 'bg-yellow-500/10' : 'bg-primary/5'} blur-[100px]`} />
        </div>
      )}

      {/* Sniper Scope Overlay */}
      {roomData.gameMode === 'sniper' && (roomData.status === 'live' || roomData.status === 'sudden_death_live') && (
        <motion.div 
          animate={{ 
            x: [0, 5, -5, 0],
            y: [0, -5, 5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_300px_rgba(0,0,0,0.95)] border-[60px] border-black/60"
        >
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/30" />
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/10 rounded-full" />
        </motion.div>
      )}

      {/* Floating Emotes */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {emotes.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 50, x: e.uid === user?.uid ? 50 : -50, scale: 0.5 }}
              animate={{ opacity: 1, y: -200, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className={`absolute bottom-32 text-4xl ${e.uid === user?.uid ? 'right-10' : 'left-10'}`}
            >
              {e.emote}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border bg-bg-card z-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
        
        <button 
          onClick={() => navigate('/')} 
          disabled={roomData.status === 'live' || roomData.status === 'sudden_death_live'}
          className={`p-2 -ml-2 ${(roomData.status === 'live' || roomData.status === 'sudden_death_live') ? 'text-border cursor-not-allowed' : 'text-text-muted hover:text-white'}`}
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-gaming">LIVE BROADCAST</span>
          </div>
          <span className="text-lg font-black text-white uppercase tracking-tighter font-gaming">
            {roomData.mode === 'classic' ? 'SOLO ARENA' : 'PRO SHOWDOWN'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Eye size={12} />
              <span className="text-[10px] font-bold font-mono">{spectatorCount}</span>
            </div>
            {roomData.gameMode && (
              <div className={`mt-1 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${
                roomData.gameMode === 'gold-rush' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                roomData.gameMode === 'sniper' ? 'bg-red-500/20 border-red-500 text-red-400' :
                'bg-blue-500/20 border-blue-500 text-blue-400'
              }`}>
                {roomData.gameMode.replace('-', ' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 z-10">
        
        {roomData.status === 'drafting' && (
          <div className="w-full flex flex-col items-center space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Preparing Arena</h2>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-center text-sm">Syncing with opponent...</p>
          </div>
        )}

        {(roomData.status === 'live' || roomData.status === 'sudden_death_live') && (
          <>
            {/* Scoreboard */}
            <div className={`w-full grid ${roomData.mode === 'classic' ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-4`}>
              <div className="bg-bg-card border border-border rounded-2xl p-3 flex flex-col items-center relative overflow-hidden">
                <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">{isSpectator ? roomData.player1.username : 'Your Score'}</span>
                <span className="text-2xl font-mono font-black text-primary drop-shadow-neon-primary">{myScore}</span>
                {isSpectator && roomData.player1.currentCombo > 1 && (
                  <div className="absolute top-1 right-2 bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/50">
                    <span className="text-[8px] font-black text-yellow-400 italic">{roomData.player1.currentCombo}X</span>
                  </div>
                )}
              </div>
              {roomData.mode !== 'classic' && (
                <div className="bg-bg-card border border-border rounded-2xl p-3 flex flex-col items-center relative overflow-hidden">
                  <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">{isSpectator ? roomData.player2.username : 'Opponent'}</span>
                  <span className="text-2xl font-mono font-black text-red-500 drop-shadow-neon-down">{opponentScore || 0}</span>
                  {isSpectator && roomData.player2.currentCombo > 1 && (
                    <div className="absolute top-1 right-2 bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/50">
                      <span className="text-[8px] font-black text-yellow-400 italic">{roomData.player2.currentCombo}X</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="flex flex-col items-center mb-4">
              <div className={`text-4xl font-mono font-bold ${timeLeft <= 10 ? 'text-down animate-pulse' : 'text-white'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Shooting Arena */}
            <div 
              ref={arenaRef}
              onClick={handleArenaClick}
              className="flex-1 w-full bg-bg-card/30 border border-border/50 rounded-3xl relative overflow-hidden shadow-inner cursor-crosshair"
            >
              {/* Miss Flash Overlay */}
              <AnimatePresence>
                {showMissFlash && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-red-500/20 z-50 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Gold Rush Banner */}
              {roomData.gameMode === 'gold-rush' && (
                <motion.div 
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute top-0 left-0 w-full bg-gradient-to-r from-yellow-600/80 via-yellow-400/80 to-yellow-600/80 py-1 z-20 flex items-center justify-center space-x-2"
                >
                  <Coins size={12} className="text-yellow-900 animate-bounce" />
                  <span className="text-[10px] font-black text-yellow-900 uppercase tracking-[0.3em] font-gaming">GOLD RUSH ACTIVE - 2X REWARDS</span>
                  <Coins size={12} className="text-yellow-900 animate-bounce" />
                </motion.div>
              )}

              {/* Muzzle Flash */}
              <AnimatePresence>
                {muzzleFlash && (
                  <motion.div
                    key={muzzleFlash.id}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute w-10 h-10 bg-yellow-400/40 rounded-full blur-md pointer-events-none z-50"
                    style={{ left: muzzleFlash.x - 20, top: muzzleFlash.y - 20 }}
                  />
                )}
              </AnimatePresence>

              {/* Particles */}
              <AnimatePresence>
                {particles.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                    animate={{ 
                      x: p.x + (Math.random() - 0.5) * 100, 
                      y: p.y + (Math.random() - 0.5) * 100,
                      scale: 0,
                      opacity: 0 
                    }}
                    className="absolute w-2 h-2 rounded-full z-40 pointer-events-none"
                    style={{ backgroundColor: p.color }}
                  />
                ))}
              </AnimatePresence>

              {/* Combo Indicator */}
              {combo > 1 && (
                <motion.div 
                  key={combo}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
                >
                  <span className="text-2xl font-black text-yellow-400 italic tracking-tighter drop-shadow-neon-up">
                    {combo}X COMBO!
                  </span>
                </motion.div>
              )}

              {/* Hit Feedback */}
              <AnimatePresence>
                {hitFeedback && (
                  <motion.div
                    key={hitFeedback.id}
                    initial={{ opacity: 0, scale: 0.5, y: 0 }}
                    animate={{ opacity: 1, scale: 1.2, y: -40 }}
                    exit={{ opacity: 0 }}
                    className={`absolute z-30 font-black text-xl pointer-events-none ${hitFeedback.color}`}
                    style={{ left: hitFeedback.x, top: hitFeedback.y, transform: 'translateX(-50%)' }}
                  >
                    {hitFeedback.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* The Target */}
              {!isSpectator && (
                <motion.button
                  ref={targetRef}
                  key={`${targetPos.x}-${targetPos.y}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={handleShoot}
                  className={`absolute ${getTargetSize()} z-10 flex items-center justify-center`}
                  style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  {/* Target Visual - CSS based on the provided image */}
                  <div className={`w-full h-full rounded-full border-2 border-black relative flex items-center justify-center shadow-lg transition-colors duration-300 ${roomData.gameMode === 'gold-rush' ? 'bg-yellow-400' : 'bg-white'}`}>
                    <div className={`w-[80%] h-[80%] rounded-full border-2 ${roomData.gameMode === 'gold-rush' ? 'border-yellow-600' : 'border-black'}`} />
                    <div className={`absolute w-[60%] h-[60%] rounded-full border-2 ${roomData.gameMode === 'gold-rush' ? 'border-yellow-800' : 'border-red-500'} flex items-center justify-center`}>
                      <div className={`w-3 h-3 rounded-full ${roomData.gameMode === 'gold-rush' ? 'bg-yellow-900' : 'bg-red-500'}`} />
                    </div>
                    {/* Crosshairs */}
                    <div className={`absolute w-full h-[1px] ${roomData.gameMode === 'gold-rush' ? 'bg-yellow-800' : 'bg-black'}`} />
                    <div className={`absolute h-full w-[1px] ${roomData.gameMode === 'gold-rush' ? 'bg-yellow-800' : 'bg-black'}`} />
                  </div>
                </motion.button>
              )}

              {/* Grid Lines for Aesthetic */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-8 opacity-10 pointer-events-none">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>
            </div>

            {/* Emotes Bar */}
            {(roomData.mode === 'pvp' || roomData.mode === 'ranked') && (
              <div className="w-full bg-bg-card border border-border rounded-2xl p-3 flex justify-between items-center mt-auto">
                {EMOTES.map(emote => (
                  <button
                    key={emote}
                    onClick={() => sendEmote(emote)}
                    className="text-2xl hover:scale-125 active:scale-95 transition-transform"
                  >
                    {emote}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Result Overlay */}
      {roomData.status === 'completed' && matchResult && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-bg-card border border-border rounded-3xl p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl"
          >
            {isSpectator ? (
              <>
                <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                  <Eye size={40} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 font-gaming tracking-widest uppercase">MATCH CONCLUDED</h2>
                <p className="text-text-muted font-medium mb-6 uppercase text-[10px] tracking-widest">Spectator Mode Finished</p>
                
                <div className="bg-bg-dark w-full rounded-xl p-4 flex flex-col gap-3 border border-white/5 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">{roomData.player1.username}</span>
                    <span className="text-xl font-black text-primary font-mono">{roomData.player1.finalScore || roomData.player1.currentScore}</span>
                  </div>
                  {roomData.mode !== 'classic' && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">{roomData.player2.username}</span>
                      <span className="text-xl font-black text-red-500 font-mono">{roomData.player2.finalScore || roomData.player2.currentScore}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {matchResult === 'win' && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-up/20 flex items-center justify-center mb-4">
                      <CheckCircle2 size={40} className="text-up" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">VICTORY</h2>
                    <p className="text-up font-medium mb-6">Incredible Reflexes!</p>
                    <div className="bg-bg-dark w-full rounded-xl p-4 flex flex-col gap-3 border border-border/50 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted font-medium">XP Earned</span>
                        <span className="text-xl font-bold text-blue-400">+{matchRewards?.xpChange || 0} XP</span>
                      </div>
                      {matchRewards?.rpChange !== 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted font-medium">RP Reward</span>
                          <span className="text-xl font-bold text-yellow-400">+{matchRewards?.rpChange || 0} RP</span>
                        </div>
                      )}
                      {roomData.mode === 'classic' && matchRewards?.coinReward > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted font-medium">Coins Earned</span>
                          <span className="text-xl font-bold text-yellow-400">+{matchRewards.coinReward}</span>
                        </div>
                      )}
                      {roomData.mode === 'classic' && matchRewards?.newStreak >= 3 && (
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted font-medium">Winning Streak</span>
                          <span className="text-sm font-bold text-orange-400 animate-pulse">{matchRewards.newStreak} WINS! 🔥</span>
                        </div>
                      )}
                      {roomData.mode === 'classic' && matchRewards?.mysteryBoxAwarded && (
                        <div className="flex justify-between items-center bg-purple-500/20 p-2 rounded-lg border border-purple-500/50 mt-2">
                          <span className="text-purple-300 font-bold text-sm flex items-center"><Gift size={16} className="mr-1" /> Mystery Box</span>
                          <span className="text-xs font-bold text-purple-400 uppercase">Awarded!</span>
                        </div>
                      )}
                      {(roomData.mode === 'ranked' || roomData.mode === 'pvp') && (
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted font-medium">Rank Points</span>
                          <span className="text-xl font-bold text-up">+{matchRewards?.rankChange || 25} PTS</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {matchResult === 'lose' && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-down/20 flex items-center justify-center mb-4">
                      <XCircle size={40} className="text-down" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">DEFEAT</h2>
                    <p className="text-down font-medium mb-6">Need More Practice</p>
                    <div className="bg-bg-dark w-full rounded-xl p-4 flex flex-col gap-3 border border-border/50 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted font-medium">XP Earned</span>
                        <span className="text-xl font-bold text-blue-400">+{matchRewards?.xpChange || 0} XP</span>
                      </div>
                      {matchRewards?.rpChange !== 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted font-medium">RP Penalty</span>
                          <span className="text-xl font-bold text-red-500">{matchRewards?.rpChange || 0} RP</span>
                        </div>
                      )}
                      {roomData.mode === 'classic' && (
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted font-medium">Winning Streak</span>
                          <span className="text-sm font-bold text-red-500">Lost</span>
                        </div>
                      )}
                      {(roomData.mode === 'ranked' || roomData.mode === 'pvp') && (
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted font-medium">Rank Points</span>
                          <span className="text-xl font-bold text-down">{matchRewards?.rankChange || -15} PTS</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {matchResult === 'draw' && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-gray-500/20 flex items-center justify-center mb-4">
                      <Clock size={40} className="text-gray-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">DRAW</h2>
                    <p className="text-gray-400 font-medium mb-6">Price unchanged</p>
                    <div className="bg-bg-dark w-full rounded-xl p-4 flex justify-between items-center border border-border/50 mb-6">
                      <span className="text-text-muted font-medium">Refund</span>
                      <span className="text-xl font-bold text-white">0 RP</span>
                    </div>
                  </>
                )}
              </>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-lg hover:opacity-90 active:scale-95 transition-all"
            >
              Return Home
            </button>
          </motion.div>
        </motion.div>
      )}
      {/* Broadcast Footer */}
      <div className="p-3 bg-bg-card/90 backdrop-blur-md border-t border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] text-text-muted uppercase font-black tracking-widest leading-none">Match ID</span>
            <span className="text-[10px] text-white font-mono font-bold leading-tight">{roomId?.slice(-8).toUpperCase()}</span>
          </div>
          <div className="h-6 w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[8px] text-text-muted uppercase font-black tracking-widest leading-none">Region</span>
            <span className="text-[10px] text-white font-mono font-bold leading-tight">GLOBAL-1</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-primary uppercase font-black tracking-widest leading-none">Signal</span>
            <span className="text-[10px] text-white font-mono font-bold leading-tight">ENCRYPTED</span>
          </div>
          <Zap size={14} className="text-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
}
