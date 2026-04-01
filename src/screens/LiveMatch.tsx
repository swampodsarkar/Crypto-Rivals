import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Ban, Zap, Eye, Gift } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, onValue, update, serverTimestamp, get, push } from '../firebase/config';
import { getMockPriceUpdate } from '../services/cryptoService';

const EMOTES = ['🚀', '📉', '😭', '🤑', '🤡', '🔥'];

export default function LiveMatch() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [roomData, setRoomData] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [emotes, setEmotes] = useState<any[]>([]);
  const [matchRewards, setMatchRewards] = useState<any>(null);
  
  const timerInitialized = useRef(false);
  const isEndingRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoomData(data);
        
        if (data.startPrice && currentPrice === 0) {
          setCurrentPrice(data.startPrice);
        }
        
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

    return () => unsubscribe();
  }, [roomId, currentPrice]);

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
      if (roomData.player1.bannedCoin && roomData.player2.bannedCoin) {
        const bannedSymbols = [roomData.player1.bannedCoin, roomData.player2.bannedCoin];
        let remainingCoins = roomData.draftCoins.filter((c: any) => !bannedSymbols.includes(c.symbol));
        if (remainingCoins.length === 0) remainingCoins = roomData.draftCoins;
        const selectedCoin = remainingCoins[Math.floor(Math.random() * remainingCoins.length)];
        
        update(ref(db, `rooms/${roomId}`), {
          status: 'predicting',
          coin: selectedCoin.symbol,
          startPrice: selectedCoin.price,
          predictEndTime: Date.now() + 10000
        });
      }
    }
    
    if (isHost && roomData.status === 'predicting') {
      if (roomData.player1.choice && roomData.player2.choice) {
        update(ref(db, `rooms/${roomId}`), {
          status: 'live',
          startTime: serverTimestamp(),
          endTime: Date.now() + roomData.duration * 1000
        });
      } else if (Date.now() > (roomData.predictEndTime || 0)) {
        const p1Choice = roomData.player1.choice || (roomData.player2.choice === 'UP' ? 'DOWN' : 'UP');
        const p2Choice = roomData.player2.choice || (p1Choice === 'UP' ? 'DOWN' : 'UP');
        update(ref(db, `rooms/${roomId}`), {
          status: 'live',
          startTime: serverTimestamp(),
          endTime: Date.now() + roomData.duration * 1000,
          'player1/choice': p1Choice,
          'player2/choice': p2Choice
        });
      }
    }

    if (isHost && roomData.status === 'sudden_death_predicting') {
      if (roomData.player1.choice && roomData.player2.choice) {
        update(ref(db, `rooms/${roomId}`), {
          status: 'sudden_death_live',
          startTime: serverTimestamp(),
          endTime: Date.now() + 5000,
          startPrice: currentPrice // Reset start price for sudden death
        });
      }
    }
  }, [roomData, user, roomId, currentPrice]);

  useEffect(() => {
    if (roomData?.status === 'live' || roomData?.status === 'sudden_death_live') {
      const interval = setInterval(() => {
        setCurrentPrice(prev => getMockPriceUpdate(prev));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [roomData?.status]);

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
    if (timeLeft === 0 && (roomData?.status === 'live' || roomData?.status === 'sudden_death_live') && !isEndingRef.current) {
      isEndingRef.current = true;
      const endMatch = async () => {
        try {
          const priceWentUp = currentPrice > roomData.startPrice;
          const priceWentDown = currentPrice < roomData.startPrice;
          const isDraw = currentPrice === roomData.startPrice;

          if (roomData.status === 'live' && isDraw && (roomData.mode === 'pvp' || roomData.mode === 'ranked')) {
            // Enter Sudden Death
            await update(ref(db, `rooms/${roomId}`), {
              status: 'sudden_death_predicting',
              'player1/choice': null,
              'player2/choice': null
            });
            isEndingRef.current = false;
          } else {
            await update(ref(db, `rooms/${roomId}`), {
              status: 'completed',
              endPrice: currentPrice,
              endTime: Date.now()
            });
          }
        } catch (error) {
          console.error("Error ending match:", error);
          isEndingRef.current = false;
        }
      };
      endMatch();
    }
  }, [timeLeft, roomData?.status, roomId, currentPrice]);

  const determineResult = (data: any) => {
    if (!user) return;
    
    const isPlayer1 = data.player1?.uid === user.uid;
    const playerChoice = isPlayer1 ? data.player1?.choice : data.player2?.choice;

    const priceWentUp = data.endPrice > data.startPrice;
    const priceWentDown = data.endPrice < data.startPrice;
    
    let result: 'win' | 'lose' | 'draw' = 'draw';
    
    if (data.endPrice === data.startPrice) {
      result = 'draw';
    } else if (data.mode === 'pvp' || data.mode === 'custom' || data.mode === 'ranked') {
      if ((playerChoice === 'UP' && priceWentUp) || (playerChoice === 'DOWN' && priceWentDown)) {
        result = 'win';
      } else {
        result = 'lose';
      }
    } else if (priceWentUp) {
      result = 'win';
    } else {
      result = 'lose';
    }
    
    setMatchResult(result);
    updateUserStats(result, data);
  };

  const updateUserStats = async (result: 'win' | 'lose' | 'draw', data: any) => {
    if (!user || !roomId) return;
    
    const historyRef = ref(db, `matchHistory/${user.uid}/${roomId}`);
    const historySnap = await get(historyRef);
    if (historySnap.exists()) return;

    const rpChange = result === 'win' ? 100 : result === 'lose' ? -50 : 0;
    
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
      mysteryBoxAwarded,
      newStreak: result === 'win' ? (user.currentStreak || 0) + 1 : 0
    });

    const updates: any = {
      [`users/${user.uid}/rp`]: Math.max(0, (user.rp || 0) + rpChange),
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
      coin: data.coin,
      choice: (data.mode === 'pvp' || data.mode === 'custom' || data.mode === 'ranked') ? (data.player1?.uid === user.uid ? data.player1?.choice : data.player2?.choice) : 'UP',
      result,
      rpChange,
      rankChange,
      playedAt: serverTimestamp()
    };

    await update(ref(db), updates);
  };

  const handleBanCoin = async (symbol: string) => {
    if (!user || !roomId || !roomData) return;
    const isPlayer1 = roomData.player1.uid === user.uid;
    const playerKey = isPlayer1 ? 'player1' : 'player2';
    
    if (roomData[playerKey].bannedCoin) return;

    await update(ref(db, `rooms/${roomId}`), {
      [`${playerKey}/bannedCoin`]: symbol
    });
  };

  const handlePredict = async (choice: 'UP' | 'DOWN') => {
    if (!user || !roomId || !roomData) return;
    const isPlayer1 = roomData.player1.uid === user.uid;
    const playerKey = isPlayer1 ? 'player1' : 'player2';
    const opponentKey = isPlayer1 ? 'player2' : 'player1';
    
    if (roomData[playerKey].choice) return;
    if (roomData[opponentKey].choice === choice) return; // Cannot pick same

    await update(ref(db, `rooms/${roomId}`), {
      [`${playerKey}/choice`]: choice
    });
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

  const isPlayer1 = roomData.player1?.uid === user?.uid;
  const playerKey = isPlayer1 ? 'player1' : 'player2';
  const opponentKey = isPlayer1 ? 'player2' : 'player1';
  const playerChoice = roomData[playerKey]?.choice;
  const opponentChoice = roomData[opponentKey]?.choice;
  const isUp = playerChoice === 'UP';
  
  const priceWentUp = currentPrice > roomData.startPrice;
  const priceWentDown = currentPrice < roomData.startPrice;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`mobile-container bg-bg-dark flex flex-col relative overflow-hidden ${
      (roomData.status === 'live' || roomData.status === 'sudden_death_live') && priceWentDown ? 'animate-shake' : ''
    }`}>
      {/* Background Glows for Price Movement */}
      {(roomData.status === 'live' || roomData.status === 'sudden_death_live') && (
        <div className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-500">
          {priceWentUp && <div className="absolute top-0 left-0 w-full h-full bg-up/10 blur-[100px]" />}
          {priceWentDown && <div className="absolute top-0 left-0 w-full h-full bg-down/10 blur-[100px]" />}
        </div>
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
      <div className="flex items-center justify-between p-5 border-b border-border bg-bg-card z-10">
        <button 
          onClick={() => navigate('/')} 
          disabled={roomData.status === 'live' || roomData.status === 'sudden_death_live'}
          className={`p-2 -ml-2 ${(roomData.status === 'live' || roomData.status === 'sudden_death_live') ? 'text-border cursor-not-allowed' : 'text-text-muted hover:text-white'}`}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
            {roomData.status.includes('sudden_death') ? 'SUDDEN DEATH' : `${roomData.mode} MATCH`}
          </span>
          <span className="text-lg font-bold text-white">{roomData.coin || 'DRAFTING'}/USD</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 z-10">
        
        {roomData.status === 'drafting' && (
          <div className="w-full flex flex-col items-center space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Ban a Coin</h2>
            <p className="text-text-muted text-center text-sm">Select one coin to ban. The remaining coin will be used for the match.</p>
            
            <div className="w-full space-y-3">
              {roomData.draftCoins?.map((c: any) => {
                const isBannedByMe = roomData[playerKey].bannedCoin === c.symbol;
                const isBannedByOpponent = roomData[opponentKey].bannedCoin === c.symbol;
                const isBanned = isBannedByMe || isBannedByOpponent;
                
                return (
                  <button
                    key={c.symbol}
                    onClick={() => handleBanCoin(c.symbol)}
                    disabled={!!roomData[playerKey].bannedCoin || isBanned}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      isBannedByMe ? 'bg-red-500/20 border-red-500 text-red-500' :
                      isBannedByOpponent ? 'bg-gray-800 border-gray-700 text-gray-500 opacity-50' :
                      roomData[playerKey].bannedCoin ? 'bg-bg-card border-border text-text-muted opacity-50' :
                      'bg-bg-card border-border text-white hover:border-primary'
                    }`}
                  >
                    <span className="text-xl font-bold">{c.symbol}</span>
                    {isBannedByMe ? <Ban size={24} /> : <span className="text-sm font-mono">${c.price.toLocaleString()}</span>}
                  </button>
                );
              })}
            </div>
            
            {roomData[playerKey].bannedCoin && !roomData[opponentKey].bannedCoin && (
              <p className="text-primary animate-pulse text-sm font-bold">Waiting for opponent...</p>
            )}
          </div>
        )}

        {(roomData.status === 'predicting' || roomData.status === 'sudden_death_predicting') && (
          <div className="w-full flex flex-col items-center space-y-6">
            {roomData.status === 'sudden_death_predicting' && (
              <div className="flex items-center space-x-2 text-red-500 mb-4 animate-pulse">
                <Zap size={32} />
                <h2 className="text-3xl font-bold">SUDDEN DEATH</h2>
              </div>
            )}
            <h2 className="text-2xl font-bold text-white text-center">Predict Direction</h2>
            <p className="text-text-muted text-center text-sm">Will {roomData.coin} go UP or DOWN?</p>
            
            <div className="w-full flex space-x-4">
              <button
                onClick={() => handlePredict('UP')}
                disabled={!!playerChoice || opponentChoice === 'UP'}
                className={`flex-1 py-8 rounded-3xl border-2 flex flex-col items-center justify-center space-y-2 transition-all ${
                  playerChoice === 'UP' ? 'bg-up/20 border-up text-up' :
                  opponentChoice === 'UP' ? 'bg-gray-800 border-gray-700 text-gray-600 opacity-50' :
                  playerChoice ? 'bg-bg-card border-border text-text-muted opacity-50' :
                  'bg-bg-card border-border text-white hover:border-up hover:text-up'
                }`}
              >
                <TrendingUp size={40} />
                <span className="text-xl font-bold">UP</span>
              </button>
              
              <button
                onClick={() => handlePredict('DOWN')}
                disabled={!!playerChoice || opponentChoice === 'DOWN'}
                className={`flex-1 py-8 rounded-3xl border-2 flex flex-col items-center justify-center space-y-2 transition-all ${
                  playerChoice === 'DOWN' ? 'bg-down/20 border-down text-down' :
                  opponentChoice === 'DOWN' ? 'bg-gray-800 border-gray-700 text-gray-600 opacity-50' :
                  playerChoice ? 'bg-bg-card border-border text-text-muted opacity-50' :
                  'bg-bg-card border-border text-white hover:border-down hover:text-down'
                }`}
              >
                <TrendingDown size={40} />
                <span className="text-xl font-bold">DOWN</span>
              </button>
            </div>
            
            {playerChoice && !opponentChoice && (
              <p className="text-primary animate-pulse text-sm font-bold">Waiting for opponent...</p>
            )}
          </div>
        )}

        {(roomData.status === 'live' || roomData.status === 'sudden_death_live') && (
          <>
            {/* Timer */}
            <div className="flex flex-col items-center">
              <div className="flex items-center space-x-2 text-text-muted mb-2">
                <Clock size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Time Remaining</span>
              </div>
              <div className={`text-5xl font-mono font-bold ${timeLeft <= 10 ? 'text-down animate-pulse' : 'text-white'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Price Display */}
            <div className="w-full bg-bg-card border border-border rounded-3xl p-6 flex flex-col items-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-border via-primary to-border opacity-50" />
              
              {/* Rocket Animation for Pump */}
              {priceWentUp && (
                <div className="absolute bottom-4 right-4 animate-float-up opacity-50 text-4xl">
                  🚀
                </div>
              )}

              <span className="text-sm font-medium text-text-muted mb-1">Live Price</span>
              <motion.div 
                key={currentPrice}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`text-4xl font-mono font-bold tracking-tight ${currentPrice >= roomData.startPrice ? 'text-up' : 'text-down'}`}
              >
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </motion.div>
              
              <div className="flex items-center space-x-4 mt-6 w-full">
                <div className="flex-1 flex flex-col items-center bg-bg-dark rounded-xl p-3 border border-border/50">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Entry Price</span>
                  <span className="text-sm font-mono font-bold text-white">${roomData.startPrice.toLocaleString()}</span>
                </div>
                <div className="flex-1 flex flex-col items-center bg-bg-dark rounded-xl p-3 border border-border/50">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Difference</span>
                  <span className={`text-sm font-mono font-bold ${currentPrice >= roomData.startPrice ? 'text-up' : 'text-down'}`}>
                    {currentPrice >= roomData.startPrice ? '+' : ''}
                    {((currentPrice - roomData.startPrice) / roomData.startPrice * 100).toFixed(3)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Oracle Hint */}
            {roomData.mode === 'classic' && roomData.player1?.oracleHint && timeLeft > roomData.duration - 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-full bg-yellow-500/10 border border-yellow-500/50 rounded-2xl p-4 flex flex-col items-center shadow-neon-primary my-4"
              >
                <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                  <Eye size={20} className="animate-pulse" />
                  <span className="font-black text-sm uppercase tracking-widest font-gaming">Oracle Vision</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-white text-xs">Predicted Trend:</span>
                  <span className={`font-black text-lg ${roomData.player1.oracleHint === 'UP' ? 'text-up' : 'text-down'}`}>
                    {roomData.player1.oracleHint}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Trade Status / Player Choice Indicator */}
            {(roomData.mode === 'pvp' || roomData.mode === 'ranked') ? (
              <div className="flex flex-col items-center w-full">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Your Prediction</span>
                <div className={`w-full py-4 rounded-2xl flex items-center justify-center space-x-2 border-2 ${isUp ? 'bg-up/10 border-up/50 text-up' : 'bg-down/10 border-down/50 text-down'}`}>
                  {isUp ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  <span className="text-xl font-bold tracking-widest">{playerChoice}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Trade Status</span>
                <div className={`w-full py-4 rounded-2xl flex items-center justify-center space-x-2 border-2 ${
                  currentPrice > roomData.startPrice 
                    ? 'bg-up/10 border-up/50 text-up' 
                    : currentPrice < roomData.startPrice 
                      ? 'bg-down/10 border-down/50 text-down'
                      : 'bg-gray-500/10 border-gray-500/50 text-gray-400'
                }`}>
                  {currentPrice > roomData.startPrice ? <TrendingUp size={24} /> : currentPrice < roomData.startPrice ? <TrendingDown size={24} /> : <Clock size={24} />}
                  <span className="text-xl font-bold tracking-widest">
                    {currentPrice > roomData.startPrice ? 'PROFITING' : currentPrice < roomData.startPrice ? 'LOSING' : 'BREAK EVEN'}
                  </span>
                </div>
              </div>
            )}

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
            {matchResult === 'win' && (
              <>
                <div className="w-20 h-20 rounded-full bg-up/20 flex items-center justify-center mb-4">
                  <CheckCircle2 size={40} className="text-up" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">VICTORY</h2>
                <p className="text-up font-medium mb-6">Prediction Correct!</p>
                <div className="bg-bg-dark w-full rounded-xl p-4 flex flex-col gap-3 border border-border/50 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted font-medium">RP Reward</span>
                    <span className="text-xl font-bold text-yellow-400">+{matchRewards?.rpChange || 100} RP</span>
                  </div>
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
                <p className="text-down font-medium mb-6">Prediction Incorrect</p>
                <div className="bg-bg-dark w-full rounded-xl p-4 flex flex-col gap-3 border border-border/50 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted font-medium">RP Penalty</span>
                    <span className="text-xl font-bold text-red-500">{matchRewards?.rpChange || -50} RP</span>
                  </div>
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

            <button
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-lg hover:opacity-90 active:scale-95 transition-all"
            >
              Return Home
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
