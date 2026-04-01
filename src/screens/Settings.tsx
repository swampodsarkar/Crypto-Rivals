import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Volume2, Music, Shield, LogOut, ChevronRight, HelpCircle, Info, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { logout } from '../firebase/authService';
import { auth } from '../firebase/config';
import { useAppStore } from '../store/useAppStore';
import { useState } from 'react';
import ConnectAccountModal from '../components/ConnectAccountModal';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState(auth.currentUser?.email || '');

  const isConnected = auth.currentUser?.providerData.some(p => p.providerId === 'password');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="mobile-container bg-bg-dark flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-600" />
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar pb-10">
        {/* Account Section */}
        <section>
          <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] font-gaming mb-4">\\\\ Account</h3>
          <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
            {isConnected ? (
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle size={24} />
                <span className="font-bold">Account Connected: {connectedEmail}</span>
              </div>
            ) : (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full p-3 rounded-lg bg-primary text-black font-bold hover:bg-primary/90 transition-all"
              >
                Connect Account
              </button>
            )}
          </div>
        </section>

        <ConnectAccountModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={(email) => {
            setConnectedEmail(email);
          }}
        />


        {/* Game Settings */}
        <section>
          <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] font-gaming mb-4">\\\\ Game Settings</h3>
          <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
            <ToggleItem 
              icon={<Volume2 size={18} className="text-yellow-400" />}
              title="Sound Effects"
              enabled={sound}
              onToggle={() => setSound(!sound)}
            />
            <ToggleItem 
              icon={<Music size={18} className="text-pink-400" />}
              title="Background Music"
              enabled={music}
              onToggle={() => setMusic(!music)}
            />
            <ToggleItem 
              icon={<Bell size={18} className="text-purple-400" />}
              title="Notifications"
              enabled={notifications}
              onToggle={() => setNotifications(!notifications)}
            />
          </div>
        </section>

        {/* Support & Legal */}
        <section>
          <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] font-gaming mb-4">\\\\ Support</h3>
          <div className="bg-bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
            <SettingItem 
              icon={<HelpCircle size={18} className="text-cyan-400" />}
              title="Help Center"
            />
            <SettingItem 
              icon={<Shield size={18} className="text-red-400" />}
              title="Privacy Policy"
            />
            <SettingItem 
              icon={<Info size={18} className="text-gray-400" />}
              title="Version"
              value="1.0.4-BETA"
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-red-500 font-black font-gaming tracking-widest uppercase text-sm transition-all active:scale-95"
          >
            <LogOut size={20} />
            Logout Account
          </button>
        </section>
      </div>
    </div>
  );
}

function SettingItem({ icon, title, value, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-bold text-gray-300 uppercase tracking-wider font-rajdhani">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-black text-text-muted font-gaming uppercase tracking-tighter">{value}</span>}
        <ChevronRight size={16} className="text-gray-600" />
      </div>
    </button>
  );
}

function ToggleItem({ icon, title, enabled, onToggle }: any) {
  return (
    <div className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-bold text-gray-300 uppercase tracking-wider font-rajdhani">{title}</span>
      </div>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full relative transition-colors ${enabled ? 'bg-primary shadow-neon-primary' : 'bg-gray-700'}`}
      >
        <motion.div 
          animate={{ x: enabled ? 24 : 4 }}
          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-lg"
        />
      </button>
    </div>
  );
}
