import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Coins, Star, Shield, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, update } from '../firebase/config';
import { useState } from 'react';
import AdBanner from '../components/AdBanner';

export default function Shop() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleBuy = async (id: string, type: 'coins' | 'premium', value: number | string, price: string) => {
    if (!user || isBuying) return;
    
    setIsBuying(id);
    
    try {
      // Simulate payment processing for real money items
      if (price.startsWith('$')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const updates: any = {};
      if (type === 'coins') {
        if ((user.gems || 0) < (value as number)) {
          alert("Not enough Gems!");
          setIsBuying(null);
          return;
        }
        updates.gems = (user.gems || 0) - (value as number);
        updates.coins = (user.coins || 0) + (value as number);
      } else if (id === 'rank-protection') {
        if ((user.gems || 0) < (value as number)) {
          alert("Not enough Gems!");
          setIsBuying(null);
          return;
        }
        updates.gems = (user.gems || 0) - (value as number);
        // Add rank protection logic here if needed
      }

      await update(ref(db, `users/${user.uid}`), updates);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Purchase error:", error);
    } finally {
      setIsBuying(null);
    }
  };

  return (
    <div className="mobile-container bg-bg-dark flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-primary to-blue-600" />
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Store</h1>
        
        <div className="ml-auto flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
          <Coins size={16} className="text-yellow-400" />
          <span className="text-sm font-black text-white font-gaming">{(user?.rp || 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center text-center py-6 relative z-10">
          <h2 className="text-2xl font-black text-white mb-3 font-gaming tracking-tight uppercase">Premium Store</h2>
          <p className="text-text-muted font-bold font-rajdhani uppercase tracking-widest text-sm max-w-[280px]">Get more RP or unlock exclusive premium features.</p>
        </div>

        <section className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.3em] font-gaming">\\\\ Coin Packs</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ShopItem 
              id="starter"
              icon={<Coins size={32} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
              title="Starter Pack"
              amount="500 Coins"
              price="100 Gems"
              color="from-yellow-400 to-orange-500"
              onBuy={() => handleBuy('starter', 'coins', 500, '100 Gems')}
              loading={isBuying === 'starter'}
            />
            <ShopItem 
              id="pro"
              icon={<Coins size={32} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
              title="Pro Pack"
              amount="2,000 Coins"
              price="300 Gems"
              color="from-orange-400 to-red-500"
              popular
              onBuy={() => handleBuy('pro', 'coins', 2000, '300 Gems')}
              loading={isBuying === 'pro'}
            />
            <ShopItem 
              id="whale"
              icon={<Coins size={32} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
              title="Whale Pack"
              amount="10,000 Coins"
              price="1000 Gems"
              color="from-purple-400 to-pink-500"
              onBuy={() => handleBuy('whale', 'coins', 10000, '1000 Gems')}
              loading={isBuying === 'whale'}
            />
            <ShopItem 
              id="mega"
              icon={<Coins size={32} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
              title="Mega Pack"
              amount="50,000 Coins"
              price="4000 Gems"
              color="from-blue-400 to-indigo-500"
              onBuy={() => handleBuy('mega', 'coins', 50000, '4000 Gems')}
              loading={isBuying === 'mega'}
            />
          </div>
        </section>

        <section className="pt-4 relative z-10 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.3em] font-gaming">\\\\ Premium</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </div>
          <div className="space-y-4">
            <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-neon-up">
                  <Star size={28} className="text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-black text-white font-gaming tracking-widest uppercase text-sm">VIP Pass</h4>
                  <p className="text-[10px] text-text-muted font-bold font-rajdhani uppercase tracking-widest mt-1">Ad-free + 2x Daily Rewards</p>
                </div>
              </div>
              <button 
                onClick={() => handleBuy('vip', 'premium', 'VIP', '$4.99/mo')}
                disabled={!!isBuying}
                className="bg-black/40 border border-white/10 text-white px-5 py-2.5 rounded-xl font-black font-gaming tracking-widest uppercase text-xs hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isBuying === 'vip' ? '...' : '$4.99/mo'}
              </button>
            </div>

            <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-neon-primary">
                  <Shield size={28} className="text-blue-500" />
                </div>
                <div>
                  <h4 className="font-black text-white font-gaming tracking-widest uppercase text-sm">Rank Protection</h4>
                  <p className="text-[10px] text-text-muted font-bold font-rajdhani uppercase tracking-widest mt-1">Prevent rank loss for 3 matches</p>
                </div>
              </div>
              <button 
                onClick={() => handleBuy('rank-protection', 'premium', 500, '500 Gems')}
                disabled={!!isBuying}
                className="bg-black/40 border border-white/10 text-white px-5 py-2.5 rounded-xl font-black font-gaming tracking-widest uppercase text-xs hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isBuying === 'rank-protection' ? '...' : '500 Gems'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-green-500 text-black px-8 py-4 rounded-2xl font-black font-gaming tracking-[0.2em] uppercase flex items-center gap-3 shadow-neon-up">
              <Check size={24} />
              PURCHASE SUCCESSFUL
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed bottom-0 left-0 w-full z-50">
        <AdBanner />
      </div>
    </div>
  );
}

function ShopItem({ id, icon, title, amount, price, color, popular, onBuy, loading }: any) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onBuy}
      disabled={loading}
      className={`bg-bg-card/50 backdrop-blur-sm border rounded-3xl p-6 flex flex-col items-center relative overflow-hidden group transition-all shadow-xl ${
        popular ? 'border-primary shadow-neon-primary' : 'border-white/10 hover:border-white/20'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {popular && (
        <div className="absolute top-0 right-0 bg-primary text-bg-dark text-[9px] font-black font-gaming px-3 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-lg">
          Best Value
        </div>
      )}
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${color} flex items-center justify-center mb-6 shadow-2xl opacity-10 group-hover:opacity-20 transition-opacity absolute top-4`} />
      <div className="relative z-10 mb-3 mt-2">{icon}</div>
      <h4 className="text-[10px] text-text-muted font-black font-gaming tracking-[0.2em] uppercase mb-1 relative z-10 opacity-60">{title}</h4>
      <span className="text-xl font-black text-white mb-6 relative z-10 font-gaming tracking-tighter">{amount}</span>
      <div className="w-full bg-black/40 py-3 rounded-2xl text-xs font-black text-white border border-white/10 relative z-10 font-gaming tracking-widest uppercase group-hover:bg-white/5 transition-colors">
        {loading ? 'PROCESSING...' : price}
      </div>
    </motion.button>
  );
}
