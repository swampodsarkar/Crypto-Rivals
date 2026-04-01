import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, Shield, Trophy, Plus, Search, ChevronRight, Crown, LogOut, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db, ref, get, set, update, push, query, orderByChild, limitToLast } from '../firebase/config';
import { motion, AnimatePresence } from 'motion/react';

interface Guild {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  leaderName: string;
  description: string;
  level: number;
  exp: number;
  members: { [uid: string]: { username: string; role: 'leader' | 'member'; joinedAt: number } };
  memberCount: number;
  maxMembers: number;
  trophies: number;
  avatar: string;
}

export default function Guilds() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildTag, setNewGuildTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGuilds();
  }, []);

  const fetchGuilds = async () => {
    setLoading(true);
    try {
      const guildsRef = ref(db, 'guilds');
      const snap = await get(guildsRef);
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(id => ({ id, ...data[id] }));
        setGuilds(list);
        
        // Find my guild
        if (user) {
          const userGuild = list.find(g => g.members && g.members[user.uid]);
          setMyGuild(userGuild || null);
        }
      }
    } catch (error) {
      console.error("Error fetching guilds:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuild = async () => {
    if (!user || !newGuildName || !newGuildTag) return;
    if (user.rp < 5000) {
      alert("You need 5,000 RP to create a guild!");
      return;
    }

    const guildId = push(ref(db, 'guilds')).key!;
    const newGuild: Partial<Guild> = {
      name: newGuildName,
      tag: newGuildTag.toUpperCase(),
      leaderId: user.uid,
      leaderName: user.username,
      description: "Welcome to our new guild!",
      level: 1,
      exp: 0,
      members: {
        [user.uid]: { username: user.username, role: 'leader', joinedAt: Date.now() }
      },
      memberCount: 1,
      maxMembers: 20,
      trophies: 0,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newGuildName}`
    };

    await set(ref(db, `guilds/${guildId}`), newGuild);
    await update(ref(db, `users/${user.uid}`), { rp: user.rp - 5000 });
    
    setShowCreateModal(false);
    fetchGuilds();
  };

  const handleJoinGuild = async (guildId: string) => {
    if (!user || myGuild) return;
    
    const guild = guilds.find(g => g.id === guildId);
    if (!guild || guild.memberCount >= guild.maxMembers) return;

    const updatedMembers = {
      ...guild.members,
      [user.uid]: { username: user.username, role: 'member', joinedAt: Date.now() }
    };

    await update(ref(db, `guilds/${guildId}`), {
      members: updatedMembers,
      memberCount: guild.memberCount + 1
    });

    fetchGuilds();
  };

  const handleLeaveGuild = async () => {
    if (!user || !myGuild) return;
    
    if (myGuild.leaderId === user.uid && myGuild.memberCount > 1) {
      alert("You must transfer leadership before leaving!");
      return;
    }

    if (myGuild.memberCount === 1) {
      // Delete guild if last member
      await set(ref(db, `guilds/${myGuild.id}`), null);
    } else {
      const updatedMembers = { ...myGuild.members };
      delete updatedMembers[user.uid];
      await update(ref(db, `guilds/${myGuild.id}`), {
        members: updatedMembers,
        memberCount: myGuild.memberCount - 1
      });
    }

    setMyGuild(null);
    fetchGuilds();
  };

  const filteredGuilds = guilds.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mobile-container bg-[#0a0f16] flex flex-col h-screen text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#0a0f16] border-b border-white/5 sticky top-0 z-20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <span className="text-xl font-black text-yellow-400 italic tracking-wider font-gaming ml-2 uppercase">Guild System</span>
        </div>
        {!myGuild && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-2 bg-yellow-400 text-black rounded-full shadow-lg active:scale-90 transition-transform"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {myGuild ? (
          <div className="p-4 space-y-6">
            {/* My Guild Info */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-white/10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-20 h-20 bg-black/40 rounded-2xl border-2 border-yellow-400/50 p-2 flex items-center justify-center">
                  <img src={myGuild.avatar || null} alt="Guild" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black font-gaming tracking-tight">{myGuild.name}</h2>
                    <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded">[{myGuild.tag}]</span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-1 italic">"{myGuild.description}"</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Trophy size={14} className="text-yellow-400" />
                      <span className="text-sm font-bold">{myGuild.trophies}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={14} className="text-blue-400" />
                      <span className="text-sm font-bold">{myGuild.memberCount}/{myGuild.maxMembers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield size={14} className="text-purple-400" />
                      <span className="text-sm font-bold">Lv. {myGuild.level}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-white/5">
                  <MessageSquare size={16} /> GUILD CHAT
                </button>
                <button 
                  onClick={handleLeaveGuild}
                  className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                >
                  <LogOut size={16} /> LEAVE
                </button>
              </div>
            </div>

            {/* Members List */}
            <div>
              <div className="flex items-center gap-2 text-yellow-400 font-black text-[10px] mb-4 tracking-widest font-gaming">
                <span className="opacity-70">\\\\</span> GUILD MEMBERS
              </div>
              <div className="space-y-2">
                {Object.entries(myGuild.members).map(([uid, member]: [string, any]) => (
                  <div key={uid} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border border-white/10">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`} alt="avatar" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{member.username}</span>
                          {member.role === 'leader' && <Crown size={12} className="text-yellow-400" />}
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{member.role}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      JOINED {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search Guilds by Name or Tag..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>

            {/* Guild List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-20 text-yellow-400 font-black animate-pulse">LOADING GUILDS...</div>
              ) : filteredGuilds.length === 0 ? (
                <div className="text-center py-20 text-gray-500 font-bold">NO GUILDS FOUND</div>
              ) : (
                filteredGuilds.map((guild) => (
                  <div key={guild.id} className="bg-gray-800/50 rounded-xl p-4 border border-white/5 flex items-center gap-4 hover:bg-gray-800 transition-colors group">
                    <div className="w-14 h-14 bg-black/40 rounded-xl border border-white/10 p-1 flex items-center justify-center">
                      <img src={guild.avatar || null} alt="Guild" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black font-gaming tracking-tight">{guild.name}</h3>
                        <span className="text-[9px] font-black text-yellow-400">[{guild.tag}]</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-bold">
                        <span className="flex items-center gap-1"><Users size={10} /> {guild.memberCount}/{guild.maxMembers}</span>
                        <span className="flex items-center gap-1"><Trophy size={10} /> {guild.trophies}</span>
                        <span className="flex items-center gap-1"><Shield size={10} /> Lv. {guild.level}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleJoinGuild(guild.id)}
                      className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-xs font-black hover:bg-yellow-300 active:scale-95 transition-all"
                    >
                      JOIN
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Guild Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <h2 className="text-xl font-black text-yellow-400 font-gaming italic tracking-wider mb-6 text-center">CREATE NEW GUILD</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 tracking-widest mb-1 block">GUILD NAME</label>
                  <input 
                    type="text" 
                    placeholder="Enter Guild Name..." 
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-yellow-400/50 transition-colors"
                    maxLength={16}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 tracking-widest mb-1 block">GUILD TAG (3-4 CHARS)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ACE" 
                    value={newGuildTag}
                    onChange={(e) => setNewGuildTag(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-yellow-400/50 transition-colors uppercase"
                    maxLength={4}
                  />
                </div>
                
                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-400">Creation Cost:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-yellow-400">5,000</span>
                    <Shield size={14} className="text-yellow-400" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleCreateGuild}
                    className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-xl shadow-lg shadow-yellow-400/20 transition-all"
                  >
                    CREATE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
