import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, onValue, update, serverTimestamp, get } from '../firebase/config';
import { getMockPriceUpdate } from '../services/cryptoService';

export default function LiveMatch() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [roomData, setRoomData] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  
  const timerInitialized = useRef(false);
  const isEndingRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoomData(data);
        
        if (data.startPrice) {
          setCurrentPrice(prev => prev === 0 ? data.startPrice : prev);
        }
        
        if (data.status === 'live' && data.endTime) {
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
  }, [roomId]);

  useEffect(() => {
    // Mock price update interval
    if (roomData?.status === 'live') {
      const interval = setInterval(() => {
        setCurrentPrice(prev => getMockPriceUpdate(prev));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [roomData?.status]);

  useEffect(() => {
    // Timer countdown
    if (roomData?.status === 'live') {
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
    // Trigger match end when timer reaches 0
    if (timeLeft === 0 && roomData?.status === 'live' && !isEndingRef.current) {
      isEndingRef.current = true;
      const endMatch = async () => {
        try {
          await update(ref(db, `rooms/${roomId}`), {
            status: 'completed',
            endPrice: currentPrice,
            endTime: Date.now()
          });
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
    } else if (data.mode === 'pvp' || data.mode === 'custom') {
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
    
    // Check if we already processed this match to prevent double counting
    const historyRef = ref(db, `matchHistory/${user.uid}/${roomId}`);
    const historySnap = await get(historyRef);
    if (historySnap.exists()) return;

    const rpChange = result === 'win' ? 100 : result === 'lose' ? -50 : 0;
    const coinReward = data.mode === 'classic' && result === 'win' ? (500 + Math.floor(Math.random() * 100)) : 0;
    const rankChange = data.mode === 'ranked' ? (result === 'win' ? 25 : result === 'lose' ? -15 : 0) : 0;
    
    const updates: any = {
      [`users/${user.uid}/rp`]: Math.max(0, (user.rp || 0) + rpChange),
      [`users/${user.uid}/coins`]: (user.coins || 0) + coinReward,
      [`users/${user.uid}/matches`]: (user.matches || 0) + 1,
    };

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

    if (data.mode === 'ranked') {
      updates[`users/${user.uid}/rankPoints`] = Math.max(0, user.rankPoints + rankChange);
      // Simple rank tier logic could go here
    }

    // Save history
    updates[`matchHistory/${user.uid}/${roomId}`] = {
      mode: data.mode,
      coin: data.coin,
      choice: (data.mode === 'pvp' || data.mode === 'custom') ? (data.player1?.uid === user.uid ? data.player1?.choice : data.player2?.choice) : 'UP',
      result,
      rpChange,
      rankChange,
      playedAt: serverTimestamp()
    };

    await update(ref(db), updates);
  };

  if (!roomData) {
    return (
      <div className="mobile-container bg-bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPlayer1 = roomData.player1?.uid === user?.uid;
  const playerChoice = isPlayer1 ? roomData.player1?.choice : roomData.player2?.choice;
  const isUp = playerChoice === 'UP';

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mobile-container bg-bg-dark flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border bg-bg-card z-10">
        <button 
          onClick={() => navigate('/')} 
          disabled={roomData.status === 'live'}
          className={`p-2 -ml-2 ${roomData.status === 'live' ? 'text-border cursor-not-allowed' : 'text-text-muted hover:text-white'}`}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{roomData.mode} MATCH</span>
          <span className="text-lg font-bold text-white">{roomData.coin}/USD</span>
        </div>
        <div className="w-8" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        
        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 text-text-muted mb-2">
            <Clock size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Time Remaining</span>
          </div>
          <div className={`text-5xl font-mono font-bold ${timeLeft <= 10 && roomData.status === 'live' ? 'text-down animate-pulse' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Price Display */}
        <div className="w-full bg-bg-card border border-border rounded-3xl p-6 flex flex-col items-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-border via-primary to-border opacity-50" />
          
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

        {/* Trade Status / Player Choice Indicator */}
        {roomData.mode === 'pvp' ? (
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
                    <span className="text-xl font-bold text-yellow-400">+100 RP</span>
                  </div>
                  {roomData.mode === 'classic' && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted font-medium">Coins</span>
                      <span className="text-xl font-bold text-primary">+500-600 COINS</span>
                    </div>
                  )}
                  {roomData.mode === 'ranked' && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted font-medium">Rank Points</span>
                      <span className="text-xl font-bold text-up">+25 PTS</span>
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
                    <span className="text-xl font-bold text-red-500">-50 RP</span>
                  </div>
                  {roomData.mode === 'ranked' && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted font-medium">Rank Points</span>
                      <span className="text-xl font-bold text-down">-15 PTS</span>
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
