import { motion } from 'motion/react';
import { TrendingUp } from 'lucide-react';

export default function Splash() {
  return (
    <div className="mobile-container items-center justify-center bg-bg-dark">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(0,229,255,0.4)] mb-6">
          <TrendingUp size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest font-gaming uppercase">Crypto</h1>
        <h2 className="text-xl font-bold text-primary tracking-[0.3em] uppercase mt-1 font-gaming">Rivals</h2>
        
        <div className="mt-12 flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
