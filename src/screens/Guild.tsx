import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Users, Trophy, MessageSquare, Plus, Search, ChevronRight, Check, X, Crown, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db, ref, get, set, update, push, onValue, off, serverTimestamp } from '../firebase/config';
import { motion, AnimatePresence } from 'motion/react';

interface GuildMember {
  uid: string;
  username: string;
  avatar: string;
  role: 'leader' | 'member';
  joinedAt: number;
}

interface GuildData {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  members: Record<string, GuildMember>;
  memberCount: number;
  trophies: number;
  level: number;
  minLevel: number;
  createdAt: number;
}

interface Guild {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  members: { [uid: string]: { username: string; avatar: string; role: 'leader' | 'member' } };
  trophies: number;
  level: number;
  createdAt: number;
  minLevel: number;
}

interface GuildMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export default function Guild() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [guildList, setGuildList] = useState<Guild[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'members'>('info');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [messages, setMessages] = useState<GuildMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchGuilds = async () => {
      setLoading(true);
      try {
        // Fetch all guilds
        const guildsSnap = await get(ref(db, 'guilds'));
        if (guildsSnap.exists()) {
          const data = guildsSnap.val();
          const list = Object.keys(data).map(id => ({ id, ...data[id] }));
          setGuildList(list);
        }

        // If user has guildId, fetch their guild
        if (user.guildId) {
          const myGuildSnap = await get(ref(db, `guilds/${user.guildId}`));
          if (myGuildSnap.exists()) {
            setMyGuild({ id: user.guildId, ...myGuildSnap.val() });
          } else {
            // Guild might have been deleted
            await update(ref(db, `users/${user.uid}`), { guildId: null });
            setUser({ ...user, guildId: undefined });
          }
        }
      } catch (error) {
        console.error("Error fetching guilds:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuilds();
  }, [user?.guildId]);

  // Listen for chat messages
  useEffect(() => {
    if (myGuild && activeTab === 'chat') {
      const chatRef = ref(db, `guildChats/${myGuild.id}`);
      const listener = onValue(chatRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.keys(data).map(id => ({ id, ...data[id] }));
          setMessages(list.sort((a, b) => a.timestamp - b.timestamp));
        }
      });
      return () => off(chatRef, 'value', listener);
    }
  }, [myGuild, activeTab]);

  const handleCreateGuild = async () => {
    if (!user || newGuildName.length < 3 || user.rp < 5000) return;

    const guildId = `guild_${Date.now()}`;
    const guildData = {
      name: newGuildName,
      description: newGuildDesc || "Welcome to our guild!",
      leaderId: user.uid,
      leaderName: user.username,
      members: {
        [user.uid]: {
          username: user.username,
          avatar: user.avatar,
          role: 'leader'
        }
      },
      trophies: user.trophies,
      level: 1,
      createdAt: Date.now(),
      minLevel: 1
    };

    try {
      await set(ref(db, `guilds/${guildId}`), guildData);
      await update(ref(db, `users/${user.uid}`), { 
        guildId,
        rp: user.rp - 5000 
      });
      setUser({ ...user, guildId, rp: user.rp - 5000 });
      setMyGuild({ id: guildId, ...guildData });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating guild:", error);
    }
  };

  const handleJoinGuild = async (guild: Guild) => {
    if (!user || user.guildId) return;

    try {
      const updates: any = {};
      updates[`guilds/${guild.id}/members/${user.uid}`] = {
        username: user.username,
        avatar: user.avatar,
        role: 'member'
      };
      updates[`users/${user.uid}/guildId`] = guild.id;

      await update(ref(db), updates);
      setUser({ ...user, guildId: guild.id });
      setMyGuild({ 
        ...guild, 
        members: { 
          ...guild.members, 
          [user.uid]: { username: user.username, avatar: user.avatar, role: 'member' } 
        } 
      });
    } catch (error) {
      console.error("Error joining guild:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !myGuild || !user) return;

    const messageData = {
      senderId: user.uid,
      senderName: user.username,
      text: chatInput,
      timestamp: Date.now()
    };

    try {
      await push(ref(db, `guildChats/${myGuild.id}`), messageData);
      setChatInput('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) {
    return (
      <div className="mobile-container bg-[#0a0f16] flex items-center justify-center min-h-screen">
        <div className="text-primary font-black italic animate-pulse">LOADING GUILD...</div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-[#0a0f16] flex flex-col overflow-hidden min-h-screen font-sans text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-bg-card border-b border-white/5 sticky top-0 z-20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col ml-2">
            <span className="ff-header">GUILD</span>
          </div>
        </div>
        {myGuild && (
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-sm border border-primary/20">
            <Shield size={16} className="text-primary" />
            <span className="text-[10px] font-black italic text-primary uppercase tracking-widest">{myGuild.name}</span>
          </div>
        )}
      </div>

      {!myGuild ? (
        <div className="flex-1 overflow-y-auto no-scrollbar p-5">
          {/* Guild Search/List */}
          <div className="mb-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="SEARCH GUILD NAME..."
                className="w-full bg-white/5 border border-white/10 rounded-sm py-4 pl-12 pr-4 text-xs font-black italic outline-none focus:border-primary transition-all uppercase tracking-widest placeholder:text-gray-700"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase italic">
                <span className="text-primary opacity-50 mr-2">\\\\</span> Recommended Guilds
              </h3>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="text-[10px] font-black text-primary border border-primary/30 px-4 py-2 rounded-sm hover:bg-primary/10 italic tracking-widest transition-all active:scale-95"
              >
                CREATE GUILD
              </button>
            </div>

            {guildList.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-sm border border-white/5">
                <Shield size={48} className="text-gray-800 mx-auto mb-4 opacity-20" />
                <p className="text-gray-600 font-black italic uppercase tracking-widest text-xs">No guilds found. Be the first to create one!</p>
              </div>
            ) : (
              guildList.map(guild => (
                <div key={guild.id} className="ff-card p-5 flex items-center justify-between group hover:border-primary/50 transition-all duration-300">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary/10 rounded-sm flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors rotate-3">
                      <Shield size={28} className="text-primary drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                    </div>
                    <div>
                      <h4 className="font-black italic text-white text-lg uppercase tracking-tighter group-hover:text-primary transition-colors">{guild.name}</h4>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-[9px] text-gray-500 font-black italic uppercase tracking-widest flex items-center gap-1.5">
                          <Users size={12} className="text-primary/50" /> {Object.keys(guild.members).length}/50
                        </span>
                        <span className="text-[9px] text-gray-500 font-black italic uppercase tracking-widest flex items-center gap-1.5">
                          <Trophy size={12} className="text-primary/50" /> {guild.trophies}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleJoinGuild(guild)}
                    className="ff-button text-[10px] px-6 py-2 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                  >
                    JOIN
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Guild Tabs */}
          <div className="flex border-b border-white/5 bg-bg-card shadow-xl">
            <button 
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-4 text-[11px] font-black italic tracking-[0.2em] relative transition-colors ${activeTab === 'info' ? 'text-primary' : 'text-gray-500'}`}
            >
              INFO
              {activeTab === 'info' && <motion.div layoutId="guildTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_15px_rgba(250,204,21,0.6)]" />}
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-4 text-[11px] font-black italic tracking-[0.2em] relative transition-colors ${activeTab === 'chat' ? 'text-primary' : 'text-gray-500'}`}
            >
              CHAT
              {activeTab === 'chat' && <motion.div layoutId="guildTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_15px_rgba(250,204,21,0.6)]" />}
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-4 text-[11px] font-black italic tracking-[0.2em] relative transition-colors ${activeTab === 'members' ? 'text-primary' : 'text-gray-500'}`}
            >
              MEMBERS
              {activeTab === 'members' && <motion.div layoutId="guildTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_15px_rgba(250,204,21,0.6)]" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-5">
            {activeTab === 'info' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="ff-card p-8 text-center relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                  <div className="w-24 h-24 bg-primary/10 rounded-sm flex items-center justify-center border border-primary/20 mx-auto mb-6 rotate-3 shadow-[0_0_30px_rgba(250,204,21,0.1)]">
                    <Shield size={48} className="text-primary drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                  </div>
                  <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter drop-shadow-lg">{myGuild.name}</h2>
                  <div className="bg-white/5 py-2 px-4 rounded-sm border border-white/5 inline-block mt-4">
                    <p className="text-[10px] text-gray-400 font-black italic uppercase tracking-widest">"{myGuild.description}"</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-10">
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 relative group overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/20 group-hover:bg-primary transition-colors"></div>
                      <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest italic mb-2">Level</div>
                      <div className="text-2xl font-black text-primary italic tracking-tighter">{myGuild.level}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 relative group overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/20 group-hover:bg-primary transition-colors"></div>
                      <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest italic mb-2">Members</div>
                      <div className="text-2xl font-black text-primary italic tracking-tighter">{Object.keys(myGuild.members).length}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 relative group overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/20 group-hover:bg-primary transition-colors"></div>
                      <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest italic mb-2">Trophies</div>
                      <div className="text-2xl font-black text-primary italic tracking-tighter">{myGuild.trophies}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase italic">
                    <span className="text-primary opacity-50 mr-2">\\\\</span> Guild Leader
                  </h3>
                  <div className="ff-card p-5 flex items-center justify-between group hover:border-primary/40 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={myGuild.members[myGuild.leaderId]?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${myGuild.leaderId}`} 
                          className="w-12 h-12 rounded-sm border-2 border-primary/30 group-hover:border-primary transition-colors" 
                          alt="leader" 
                        />
                        <div className="absolute -top-2 -left-2 bg-primary text-black p-1 rounded-sm shadow-lg">
                          <Crown size={10} />
                        </div>
                      </div>
                      <div>
                        <div className="font-black italic text-white text-lg uppercase tracking-tighter group-hover:text-primary transition-colors">{myGuild.leaderName}</div>
                        <div className="text-[9px] text-primary font-black italic uppercase tracking-widest mt-0.5">Supreme Leader</div>
                      </div>
                    </div>
                    <ChevronRight size={24} className="text-gray-800 group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && myGuild && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {Object.entries(myGuild.members).map(([uid, member]: [string, any]) => (
                  <div key={uid} className="ff-card p-4 flex items-center justify-between group hover:border-primary/40 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <img src={member.avatar || null} className="w-12 h-12 rounded-sm border border-white/10 group-hover:border-primary/30 transition-colors" alt="avatar" />
                      <div>
                        <div className="font-black italic text-white text-lg uppercase tracking-tighter group-hover:text-primary transition-colors">{member.username}</div>
                        <div className={`text-[9px] font-black italic uppercase tracking-widest mt-0.5 ${member.role === 'leader' ? 'text-primary' : 'text-gray-500'}`}>
                          {member.role === 'leader' ? 'LEADER' : 'MEMBER'}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/profile/${uid}`)} className="text-gray-800 group-hover:text-primary transition-all group-hover:translate-x-1">
                      <ChevronRight size={24} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'chat' && myGuild && (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar pb-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-sm border border-white/5">
                      <MessageSquare size={48} className="text-gray-800 mx-auto mb-4 opacity-20" />
                      <p className="text-gray-600 font-black italic uppercase tracking-widest text-xs">No messages yet. Say hi to your guild!</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-2 mb-1.5 ${msg.senderId === user?.uid ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[9px] font-black text-gray-500 uppercase italic tracking-widest">{msg.senderName}</span>
                          <span className="text-[8px] text-gray-800 font-black">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className={`px-4 py-3 rounded-sm text-xs font-black italic tracking-widest max-w-[85%] shadow-lg uppercase ${
                          msg.senderId === user?.uid 
                            ? 'bg-primary text-black rounded-tr-none' 
                            : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-6 flex gap-3">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="TYPE GUILD MESSAGE..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-sm px-5 py-3 text-xs font-black italic outline-none focus:border-primary uppercase tracking-widest placeholder:text-gray-700"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="bg-primary text-black px-4 rounded-sm hover:bg-yellow-300 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-90"
                  >
                    <MessageSquare size={24} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Guild Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-bg-card border border-primary/30 rounded-sm p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="ff-header">CREATE GUILD</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block italic">Guild Name</label>
                  <input 
                    type="text" 
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    placeholder="ENTER NAME..."
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-xs font-black italic outline-none focus:border-primary uppercase tracking-widest"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block italic">Description</label>
                  <textarea 
                    value={newGuildDesc}
                    onChange={(e) => setNewGuildDesc(e.target.value)}
                    placeholder="ENTER DESCRIPTION..."
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-xs font-black italic outline-none focus:border-primary h-24 resize-none uppercase tracking-widest"
                  />
                </div>

                <div className="bg-primary/10 p-3 rounded-sm border border-primary/20 flex items-center justify-between">
                  <span className="text-[10px] font-black text-primary italic uppercase tracking-widest">COST: 5,000 RP</span>
                  <span className={`text-[10px] font-black italic uppercase tracking-widest ${user?.rp >= 5000 ? 'text-green-400' : 'text-red-400'}`}>
                    YOURS: {user?.rp?.toLocaleString() ?? '0'}
                  </span>
                </div>

                <button 
                  onClick={handleCreateGuild}
                  disabled={newGuildName.length < 3 || user?.rp < 5000}
                  className="w-full ff-button py-3 disabled:opacity-50 disabled:grayscale"
                >
                  CONFIRM CREATE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
