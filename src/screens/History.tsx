import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, get } from '../firebase/config';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export default function History() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const historyRef = ref(db, `matchHistory/${user.uid}`);
        const snapshot = await get(historyRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const historyArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => b.playedAt - a.playedAt);
          setHistory(historyArray);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  return (
    <div className="mobile-container bg-bg-dark flex flex-col">
      {/* Header */}
      <div className="flex items-center p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-primary to-blue-600" />
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Match History</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-neon-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-10">
            <div className="p-6 bg-white/5 rounded-full border border-white/10 mb-6">
              <Clock size={48} className="text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted font-black font-gaming tracking-widest uppercase">No matches played yet.</p>
          </div>
        ) : (
          history.map((match) => (
            <motion.div 
              key={match.id} 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${
                match.result === 'win' ? 'bg-up' : 
                match.result === 'lose' ? 'bg-down' : 
                'bg-gray-500'
              }`} />
              
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${
                  match.result === 'win' ? 'bg-up/10 border-up/30 text-up shadow-neon-up' : 
                  match.result === 'lose' ? 'bg-down/10 border-down/30 text-down shadow-neon-down' : 
                  'bg-gray-500/10 border-gray-500/30 text-gray-400'
                }`}>
                  {match.result === 'win' ? <TrendingUp size={28} /> : 
                   match.result === 'lose' ? <TrendingDown size={28} /> : 
                   <Minus size={28} />}
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-black text-white font-gaming text-lg tracking-tight">{match.coin}</span>
                    <span className="text-[10px] bg-black/40 border border-white/10 px-3 py-1 rounded-full text-text-muted font-black font-gaming tracking-widest uppercase">{match.mode}</span>
                  </div>
                  <div className="text-[10px] text-text-muted font-black font-gaming tracking-widest uppercase mt-2 opacity-60">
                    {match.playedAt ? format(new Date(match.playedAt), 'MMM d, h:mm a') : 'Unknown Date'}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span className={`text-lg font-black font-gaming tracking-tighter ${
                  match.result === 'win' ? 'text-up text-glow-up' : 
                  match.result === 'lose' ? 'text-down text-glow-down' : 
                  'text-gray-400'
                }`}>
                  {match.result === 'win' ? '+' : ''}{match.rpChange || 0} <span className="text-xs">PTS</span>
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${match.choice === 'UP' ? 'bg-up' : 'bg-down'}`} />
                  <span className="text-[10px] text-text-muted font-black font-gaming tracking-widest uppercase">
                    {match.choice}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
