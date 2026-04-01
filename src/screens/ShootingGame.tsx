import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Crosshair, Trophy, Timer, Play, RotateCcw, Home, User } from 'lucide-react';
import { auth, db, ref, set, push, serverTimestamp, onValue, query, orderByChild, limitToLast, get, update } from '../firebase/config';

interface TargetObj {
  id: number;
  x: number;
  y: number;
  size: number;
  points: number;
  createdAt: number;
  expiresAt: number;
  type: 'normal' | 'bonus' | 'penalty';
}

interface ScoreEntry {
  uid: string;
  displayName: string;
  score: number;
  timestamp: number;
}

const ShootingGame: React.FC = () => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'ended'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [targets, setTargets] = useState<TargetObj[]>([]);
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [accuracy, setAccuracy] = useState({ hits: 0, total: 0 });
  
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const nextTargetId = useRef(0);

  // Load High Scores
  useEffect(() => {
    const scoresRef = ref(db, 'scores');
    const scoresQuery = query(scoresRef, orderByChild('score'), limitToLast(10));
    
    const unsubscribe = onValue(scoresQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const scoresList: ScoreEntry[] = Object.values(data);
        scoresList.sort((a, b) => b.score - a.score);
        setHighScores(scoresList);
      }
    });

    return () => unsubscribe();
  }, []);

  const spawnTarget = useCallback(() => {
    if (!gameContainerRef.current) return;

    const rect = gameContainerRef.current.getBoundingClientRect();
    const padding = 50;
    const size = Math.random() * (60 - 30) + 30;
    
    const x = Math.random() * (rect.width - size - padding * 2) + padding;
    const y = Math.random() * (rect.height - size - padding * 2) + padding;
    
    const typeRand = Math.random();
    let type: TargetObj['type'] = 'normal';
    let points = 100;
    let duration = 2000;

    if (typeRand > 0.9) {
      type = 'bonus';
      points = 250;
      duration = 1200;
    } else if (typeRand > 0.8) {
      type = 'penalty';
      points = -150;
      duration = 2500;
    }

    const newTarget: TargetObj = {
      id: nextTargetId.current++,
      x,
      y,
      size,
      points,
      type,
      createdAt: Date.now(),
      expiresAt: Date.now() + duration,
    };

    setTargets(prev => [...prev, newTarget]);

    // Auto-remove target after duration
    setTimeout(() => {
      setTargets(prev => prev.filter(t => t.id !== newTarget.id));
    }, duration);
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(60);
    setTargets([]);
    setCombo(0);
    setAccuracy({ hits: 0, total: 0 });
    nextTargetId.current = 0;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawnLoop = () => {
      if (gameState === 'ended') return;
      spawnTarget();
      const nextSpawn = Math.max(400, 1000 - (60 - timeLeft) * 10);
      targetSpawnRef.current = setTimeout(spawnLoop, nextSpawn);
    };
    spawnLoop();
  };

  const endGame = () => {
    setGameState('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    if (targetSpawnRef.current) clearTimeout(targetSpawnRef.current);
    
    setLastScore(score);
    saveScore(score);
  };

  const saveScore = async (finalScore: number) => {
    const user = auth.currentUser;
    if (!user) return;

    const missionData = {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous Sniper',
      score: finalScore,
      accuracy: accuracy.total > 0 ? Math.round((accuracy.hits / accuracy.total) * 100) : 0,
      hits: accuracy.hits,
      totalShots: accuracy.total,
      timestamp: Date.now(),
    };

    try {
      // 1. Save to global high scores
      const scoresRef = ref(db, 'scores');
      const newScoreRef = push(scoresRef);
      await set(newScoreRef, missionData);

      // 2. Save to user's mission history
      const historyRef = ref(db, `missionHistory/${user.uid}`);
      const newHistoryRef = push(historyRef);
      await set(newHistoryRef, missionData);

      // 3. Update aggregate user stats
      const userRef = ref(db, `users/${user.uid}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.val();
        const currentHighScore = userData.highScore || 0;
        const currentTotalMissions = userData.totalMissions || 0;
        const currentTotalHits = userData.totalHits || 0;
        const currentTotalShots = userData.totalShots || 0;
        
        const newTotalMissions = currentTotalMissions + 1;
        const newTotalHits = currentTotalHits + accuracy.hits;
        const newTotalShots = currentTotalShots + accuracy.total;
        const newAvgAccuracy = newTotalShots > 0 ? Math.round((newTotalHits / newTotalShots) * 100) : 0;

        await update(userRef, {
          highScore: Math.max(currentHighScore, finalScore),
          totalMissions: newTotalMissions,
          totalHits: newTotalHits,
          totalShots: newTotalShots,
          avgAccuracy: newAvgAccuracy,
          rp: (userData.rp || 0) + Math.floor(finalScore / 10), // Award RP based on score
          coins: (userData.coins || 0) + Math.floor(finalScore / 5), // Award coins based on score
        });
      }
    } catch (error) {
      console.error('Error saving score and updating stats:', error);
    }
  };

  const handleShoot = (e: React.MouseEvent | React.TouchEvent, targetId?: number) => {
    if (gameState !== 'playing') return;

    setAccuracy(prev => ({ ...prev, total: prev.total + 1 }));

    if (targetId !== undefined) {
      const target = targets.find(t => t.id === targetId);
      if (target) {
        if (target.type === 'penalty') {
          setCombo(0);
          setScore(prev => Math.max(0, prev + target.points));
        } else {
          setCombo(prev => prev + 1);
          const comboBonus = Math.floor(combo / 5) * 20;
          setScore(prev => prev + target.points + comboBonus);
          setAccuracy(prev => ({ ...prev, hits: prev.hits + 1 }));
        }
        setTargets(prev => prev.filter(t => t.id !== targetId));
      }
    } else {
      // Missed shot
      setCombo(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-500/30">
      {/* HUD */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-1">Score</span>
            <span className="text-3xl font-black tracking-tighter tabular-nums">{score.toLocaleString()}</span>
          </div>
          <div className="h-10 w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-blue-500 font-bold mb-1">Combo</span>
            <span className="text-3xl font-black tracking-tighter tabular-nums">x{combo}</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-1">Time Left</span>
            <div className="flex items-center gap-2">
              <Timer className={`w-5 h-5 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white/50'}`} />
              <span className={`text-3xl font-black tracking-tighter tabular-nums ${timeLeft < 10 ? 'text-red-500' : ''}`}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={gameContainerRef}
        className="relative w-full h-screen overflow-hidden cursor-crosshair"
        onClick={(e) => handleShoot(e)}
      >
        <AnimatePresence>
          {gameState === 'playing' && targets.map(target => (
            <motion.div
              key={target.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute flex items-center justify-center"
              style={{
                left: target.x,
                top: target.y,
                width: target.size,
                height: target.size,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleShoot(e, target.id);
              }}
            >
              <div className={`relative w-full h-full rounded-full border-2 flex items-center justify-center
                ${target.type === 'bonus' ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 
                  target.type === 'penalty' ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 
                  'bg-white/10 border-white/40'}`}
              >
                <div className={`w-1/2 h-1/2 rounded-full border 
                  ${target.type === 'bonus' ? 'border-blue-400' : 
                    target.type === 'penalty' ? 'border-red-400' : 
                    'border-white/20'}`} 
                />
                <div className={`absolute w-1 h-1 rounded-full 
                  ${target.type === 'bonus' ? 'bg-blue-300' : 
                    target.type === 'penalty' ? 'bg-red-300' : 
                    'bg-white'}`} 
                />
                
                {/* Points indicator */}
                <span className="absolute -top-6 text-[10px] font-bold tracking-widest uppercase opacity-50">
                  {target.points > 0 ? `+${target.points}` : target.points}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Start Overlay */}
        {gameState === 'start' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[100]">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-md w-full p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                <Crosshair className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter mb-4 uppercase">Target Sniper</h1>
              <p className="text-white/60 mb-8 leading-relaxed">
                Test your reflexes. Hit the white and blue targets. Avoid the red ones. 
                Build your combo for massive score multipliers.
              </p>
              <button 
                onClick={startGame}
                className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Mission
              </button>
            </motion.div>
          </div>
        )}

        {/* End Overlay */}
        {gameState === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-[100] overflow-y-auto py-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl w-full px-6"
            >
              <div className="text-center mb-12">
                <span className="text-[10px] uppercase tracking-[0.4em] text-red-500 font-bold mb-4 block">Mission Complete</span>
                <h2 className="text-7xl font-black tracking-tighter mb-2">{score.toLocaleString()}</h2>
                <div className="flex justify-center gap-8 text-white/40 uppercase text-[10px] tracking-widest font-bold">
                  <span>Accuracy: {accuracy.total > 0 ? Math.round((accuracy.hits / accuracy.total) * 100) : 0}%</span>
                  <span>Hits: {accuracy.hits}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Global Leaderboard</h3>
                  </div>
                  <div className="space-y-3">
                    {highScores.map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 text-[10px] font-bold ${i < 3 ? 'text-yellow-500' : 'text-white/20'}`}>
                            {i + 1}
                          </span>
                          <span className="font-medium truncate max-w-[120px]">{s.displayName}</span>
                        </div>
                        <span className="font-black tracking-tight">{s.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={startGame}
                    className="flex-1 py-6 bg-white text-black font-bold uppercase tracking-widest rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-300 flex flex-col items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-6 h-6" />
                    Retry Mission
                  </button>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="py-4 bg-white/5 text-white/60 font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2">
                      <Home className="w-4 h-4" />
                      Home
                    </button>
                    <button className="py-4 bg-white/5 text-white/60 font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Visual Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>
    </div>
  );
};

export default ShootingGame;
