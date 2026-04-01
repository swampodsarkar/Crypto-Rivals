import React, { useEffect, useState } from 'react';
import { ArrowLeft, Swords, Users, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db, ref, onValue, update, remove, get, serverTimestamp } from '../firebase/config';
import { getRandomCoin } from '../services/cryptoService';
import { motion } from 'motion/react';

export default function CustomMatch() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [roomData, setRoomData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !roomId) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    
    // Join room if not already in it
    get(roomRef).then(snap => {
      if (snap.exists()) {
        const data = snap.val();
        if (data.status === 'waiting' && !data.players[user.uid]) {
          // Add self to room
          update(roomRef, {
            [`players/${user.uid}`]: {
              username: user.username,
              avatar: user.avatar,
              rp: user.rp,
              ready: true
            }
          });
        }
      } else {
        setError('Room not found or expired.');
      }
    });

    const unsub = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRoomData(data);

        // If room is full and we are host, start game
        const players = Object.keys(data.players || {});
        if (players.length === 2 && data.status === 'waiting' && data.host === user.uid) {
          setTimeout(async () => {
            const guestId = players.find(id => id !== user.uid)!;
            const guest = data.players[guestId];
            const coin = await getRandomCoin();
            const duration = 3 * 60; // 3 minutes
            const iAmUp = Math.random() > 0.5;

            await update(roomRef, {
              status: 'live',
              mode: 'custom',
              coin: coin.symbol,
              duration: duration,
              startPrice: coin.price,
              startTime: serverTimestamp(),
              endTime: Date.now() + duration * 1000,
              player1: {
                uid: user.uid,
                username: user.username,
                choice: iAmUp ? 'UP' : 'DOWN'
              },
              player2: {
                uid: guestId,
                username: guest.username,
                choice: iAmUp ? 'DOWN' : 'UP'
              }
            });
          }, 2000);
        }

        if (data.status === 'live') {
          navigate(`/live/${roomId}`);
        }
      } else {
        setError('Room closed.');
      }
    });

    return () => {
      unsub();
      // Clean up invite if we joined
      remove(ref(db, `gameInvites/${user.uid}/${roomId}`));
    };
  }, [user, roomId, navigate]);

  const handleLeave = async () => {
    if (!user || !roomId || !roomData) return;
    
    if (roomData.host === user.uid) {
      // Host leaving closes the room
      await remove(ref(db, `rooms/${roomId}`));
    } else {
      // Guest leaving removes them from players
      await remove(ref(db, `rooms/${roomId}/players/${user.uid}`));
    }
    navigate(-1);
  };

  if (error) {
    return (
      <div className="mobile-container bg-bg-dark flex flex-col items-center justify-center min-h-screen p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <ShieldAlert size={64} className="text-red-500 mb-6 drop-shadow-neon-down" />
        <h2 className="text-2xl font-black text-white mb-3 font-gaming tracking-widest uppercase">Error</h2>
        <p className="text-text-muted mb-8 font-gaming tracking-wider uppercase text-sm">{error}</p>
        <button 
          onClick={() => navigate(-1)} 
          className="bg-primary text-bg-dark px-10 py-4 rounded-2xl font-black font-gaming tracking-[0.2em] uppercase shadow-neon-primary active:scale-95 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-bg-dark flex flex-col min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-bg-dark to-bg-dark pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center p-5 relative z-10 border-b border-white/5 bg-bg-card/40 backdrop-blur-md">
        <button onClick={handleLeave} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Custom Room</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-28 h-28 bg-primary/10 rounded-3xl flex items-center justify-center mb-10 border border-primary/30 shadow-neon-primary"
        >
          <Swords size={48} className="text-primary drop-shadow-neon-primary" />
        </motion.div>

        <h2 className="text-2xl font-black text-white mb-3 font-gaming tracking-[0.15em] text-center uppercase">
          {roomData?.players && Object.keys(roomData.players).length === 2 ? 'Match Found!' : 'Waiting for Opponent...'}
        </h2>
        
        <div className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl mb-12">
          <p className="text-text-muted font-mono text-[10px] tracking-widest uppercase">
            Room ID: <span className="text-primary">{roomId?.substring(0, 12)}...</span>
          </p>
        </div>

        {/* Players */}
        <div className="w-full flex items-center justify-between gap-6">
          {/* Player 1 (Host) */}
          {roomData?.host && roomData.players?.[roomData.host] ? (
            <motion.div 
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-bg-card border-2 border-primary mb-4 overflow-hidden shadow-neon-primary relative group">
                <img src={roomData.players[roomData.host].avatar || null} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-bg-dark/60 to-transparent" />
              </div>
              <span className="font-black text-sm text-center line-clamp-1 font-gaming tracking-widest uppercase text-white">{roomData.players[roomData.host].username}</span>
              <span className="text-[10px] text-primary font-black font-gaming tracking-widest mt-1 uppercase">{roomData.players[roomData.host].rp} RP</span>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center opacity-40">
              <div className="w-24 h-24 rounded-3xl bg-bg-card border-2 border-white/10 mb-4 flex items-center justify-center">
                <Users size={32} className="text-text-muted" />
              </div>
              <span className="font-black text-sm text-text-muted font-gaming tracking-widest uppercase">Waiting</span>
            </div>
          )}

          <div className="font-black text-3xl text-white/20 font-gaming italic tracking-tighter">VS</div>

          {/* Player 2 (Guest) */}
          {roomData?.players && Object.keys(roomData.players).find(k => k !== roomData.host) ? (
            <motion.div 
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-bg-card border-2 border-red-500 mb-4 overflow-hidden shadow-neon-down relative group">
                {(() => {
                  const guestId = Object.keys(roomData.players).find(k => k !== roomData.host)!;
                  return <img src={roomData.players[guestId].avatar || null} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />;
                })()}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-bg-dark/60 to-transparent" />
              </div>
              <span className="font-black text-sm text-center line-clamp-1 font-gaming tracking-widest uppercase text-white">
                {(() => {
                  const guestId = Object.keys(roomData.players).find(k => k !== roomData.host)!;
                  return roomData.players[guestId].username;
                })()}
              </span>
              <span className="text-[10px] text-red-500 font-black font-gaming tracking-widest mt-1 uppercase">
                {(() => {
                  const guestId = Object.keys(roomData.players).find(k => k !== roomData.host)!;
                  return roomData.players[guestId].rp;
                })()} RP
              </span>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center opacity-40">
              <div className="w-24 h-24 rounded-3xl bg-bg-card border-2 border-white/10 mb-4 flex items-center justify-center">
                <Users size={32} className="text-text-muted" />
              </div>
              <span className="font-black text-sm text-text-muted font-gaming tracking-widest uppercase">Waiting</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-8 relative z-10">
        <button 
          onClick={handleLeave}
          className="w-full py-5 bg-red-500/10 text-red-500 border border-red-500/30 font-black font-gaming tracking-[0.3em] uppercase rounded-2xl hover:bg-red-500/20 active:scale-95 transition-all shadow-neon-down"
        >
          Cancel Match
        </button>
      </div>
    </div>
  );
}
