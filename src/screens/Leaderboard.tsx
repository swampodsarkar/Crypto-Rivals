import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, get, query, orderByChild, limitToLast } from '../firebase/config';
import { motion } from 'motion/react';
import NativeAdBanner from '../components/NativeAdBanner';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const scoresRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(50));
        const snapshot = await get(scoresRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const leaderArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => b.score - a.score);
          
          setLeaders(leaderArray);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="mobile-container bg-bg-dark flex flex-col">
      {/* Header */}
      <div className="flex items-center p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-primary to-blue-600" />
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Global Leaderboard</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-neon-primary" />
          </div>
        ) : (
          leaders.map((leader, index) => (
            <Fragment key={leader.uid}>
              <motion.div 
                initial={{ x: index % 2 === 0 ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-bg-card/50 backdrop-blur-sm border rounded-3xl p-5 flex items-center justify-between relative overflow-hidden group transition-all shadow-xl ${
                  leader.uid === user?.uid 
                    ? 'border-primary shadow-neon-primary z-10' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {leader.uid === user?.uid && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                )}
                
                <div className="flex items-center space-x-4">
                  <div className="w-10 flex justify-center items-center">
                    {index === 0 ? <Trophy size={32} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" /> :
                     index === 1 ? <Medal size={28} className="text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]" /> :
                     index === 2 ? <Medal size={28} className="text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" /> :
                     <span className="text-lg font-black text-text-muted font-gaming tracking-tighter opacity-50">{index + 1}</span>}
                  </div>
                  <div>
                    <div className="font-black text-white font-gaming text-lg tracking-tight flex items-center space-x-2">
                      <span>{leader.displayName}</span>
                      {leader.uid === user?.uid && (
                        <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-black font-gaming tracking-widest uppercase">You</span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted font-black font-gaming tracking-widest uppercase mt-1 opacity-60">
                      {new Date(leader.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-lg font-black text-yellow-400 font-gaming tracking-tighter text-glow-up">{(leader.score || 0).toLocaleString()} <span className="text-xs">SCORE</span></span>
                </div>
              </motion.div>
              {index === 2 && <NativeAdBanner />}
            </Fragment>
          ))
        )}
      </div>
    </div>
  );
}
