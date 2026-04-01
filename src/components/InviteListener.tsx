import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, onValue, remove } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { Swords, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InviteListener() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const invitesRef = ref(db, `gameInvites/${user.uid}`);
    const unsub = onValue(invitesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const inviteList = Object.keys(data).map(roomId => ({
          roomId,
          ...data[roomId]
        })).filter(inv => Date.now() - inv.timestamp < 60000); // Only show invites less than 1 min old
        
        setInvites(inviteList);
      } else {
        setInvites([]);
      }
    });

    return () => unsub();
  }, [user]);

  const handleAccept = async (roomId: string) => {
    if (!user) return;
    await remove(ref(db, `gameInvites/${user.uid}/${roomId}`));
    navigate(`/match/custom/${roomId}`);
  };

  const handleDecline = async (roomId: string) => {
    if (!user) return;
    await remove(ref(db, `gameInvites/${user.uid}/${roomId}`));
  };

  if (invites.length === 0) return null;

  return (
    <div className="fixed top-6 left-0 right-0 z-[100] flex flex-col items-center gap-3 pointer-events-none px-6">
      <AnimatePresence>
        {invites.map(inv => (
          <motion.div 
            key={inv.roomId}
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="bg-bg-card/90 backdrop-blur-xl border-2 border-primary/50 rounded-3xl shadow-[0_0_30px_rgba(0,255,153,0.2)] p-5 flex items-center gap-5 pointer-events-auto w-full max-w-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-neon-primary" />
            <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner">
              <Swords size={28} className="text-primary drop-shadow-neon-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black text-xs font-gaming tracking-[0.2em] uppercase mb-1">Match Invite</h3>
              <p className="text-text-muted text-[10px] font-gaming tracking-widest uppercase leading-tight">
                <span className="text-primary font-black">{inv.fromUsername}</span> challenged you!
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleAccept(inv.roomId)} 
                className="p-3 bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 text-green-400 rounded-2xl font-black shadow-neon-up transition-all active:scale-90"
              >
                <Check size={20} />
              </button>
              <button 
                onClick={() => handleDecline(inv.roomId)} 
                className="p-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 rounded-2xl font-black shadow-neon-down transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
