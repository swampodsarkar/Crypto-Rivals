import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, Users, Search, Swords, Check, X, User, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { db, ref, get, set, remove, onValue, push } from '../firebase/config';
import { motion } from 'motion/react';

export default function Friends() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'requests' | 'add'>('list');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to friends list
    const friendsRef = ref(db, `friends/${user.uid}`);
    const unsubFriends = onValue(friendsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const friendUids = Object.keys(data);
        
        // Fetch full user data for each friend to check activeRoomId
        const fetchStatus = async () => {
          const friendsWithStatus = await Promise.all(friendUids.map(async (uid) => {
            const userSnap = await get(ref(db, `users/${uid}`));
            const userData = userSnap.val();
            
            let activeRoom = null;
            if (userData?.activeRoomId) {
              const roomSnap = await get(ref(db, `rooms/${userData.activeRoomId}`));
              activeRoom = roomSnap.val();
            }

            return {
              uid,
              ...data[uid],
              activeRoomId: userData?.activeRoomId,
              activeRoomMode: activeRoom?.mode,
              activeRoomStatus: activeRoom?.status
            };
          }));
          setFriends(friendsWithStatus);
        };
        fetchStatus();
      } else {
        setFriends([]);
      }
    });

    // Listen to friend requests
    const reqRef = ref(db, `friendRequests/${user.uid}`);
    const unsubReqs = onValue(reqRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setRequests(Object.keys(data).map(k => ({ uid: k, ...data[k] })));
      } else {
        setRequests([]);
      }
    });

    return () => {
      unsubFriends();
      unsubReqs();
    };
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    try {
      // Very basic search (in a real app, use a proper index or Cloud Function)
      // For this prototype, we'll just check if the exact UID exists or fetch all and filter
      const usersRef = ref(db, 'users');
      const snap = await get(usersRef);
      if (snap.exists()) {
        const allUsers = snap.val();
        const results = Object.keys(allUsers)
          .filter(k => k !== user.uid && (k === searchQuery || allUsers[k].username.toLowerCase().includes(searchQuery.toLowerCase())))
          .map(k => ({ uid: k, ...allUsers[k] }));
        setSearchResults(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUid: string, targetUsername: string, targetAvatar: string) => {
    if (!user) return;
    await set(ref(db, `friendRequests/${targetUid}/${user.uid}`), {
      timestamp: Date.now(),
      username: user.username,
      avatar: user.avatar
    });
    alert('Friend request sent!');
  };

  const handleAcceptRequest = async (req: any) => {
    if (!user) return;
    // Add to my friends
    await set(ref(db, `friends/${user.uid}/${req.uid}`), {
      username: req.username,
      avatar: req.avatar,
      addedAt: Date.now()
    });
    // Add to their friends
    await set(ref(db, `friends/${req.uid}/${user.uid}`), {
      username: user.username,
      avatar: user.avatar,
      addedAt: Date.now()
    });
    // Remove request
    await remove(ref(db, `friendRequests/${user.uid}/${req.uid}`));
  };

  const handleDeclineRequest = async (reqUid: string) => {
    if (!user) return;
    await remove(ref(db, `friendRequests/${user.uid}/${reqUid}`));
  };

  const handleChallenge = async (friendUid: string) => {
    if (!user) return;
    // Create a custom room
    const roomId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await set(ref(db, `rooms/${roomId}`), {
      status: 'waiting',
      createdAt: Date.now(),
      isCustom: true,
      host: user.uid,
      players: {
        [user.uid]: {
          username: user.username,
          avatar: user.avatar,
          rp: user.rp,
          ready: true
        }
      }
    });

    // Send invite
    await set(ref(db, `gameInvites/${friendUid}/${roomId}`), {
      fromUid: user.uid,
      fromUsername: user.username,
      timestamp: Date.now()
    });

    navigate(`/match/custom/${roomId}`);
  };

  if (!user) return null;

  return (
    <div className="mobile-container bg-bg-dark flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center p-5 border-b border-white/10 bg-bg-card/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-primary to-blue-600" />
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white ml-2 font-gaming tracking-widest uppercase">Friends</h1>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-6 bg-black/40 rounded-2xl p-1 border border-white/10 relative z-10">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 font-black text-[10px] tracking-[0.2em] relative flex items-center justify-center gap-2 rounded-xl transition-all font-gaming uppercase ${activeTab === 'list' ? 'bg-primary text-bg-dark shadow-neon-primary' : 'text-text-muted hover:text-white'}`}
        >
          <Users size={14} /> LIST ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 font-black text-[10px] tracking-[0.2em] relative flex items-center justify-center gap-2 rounded-xl transition-all font-gaming uppercase ${activeTab === 'requests' ? 'bg-primary text-bg-dark shadow-neon-primary' : 'text-text-muted hover:text-white'}`}
        >
          <UserPlus size={14} /> REQUESTS
          {requests.length > 0 && (
            <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1 border border-bg-dark shadow-neon-down">{requests.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 font-black text-[10px] tracking-[0.2em] relative flex items-center justify-center gap-2 rounded-xl transition-all font-gaming uppercase ${activeTab === 'add' ? 'bg-primary text-bg-dark shadow-neon-primary' : 'text-text-muted hover:text-white'}`}
        >
          <Search size={14} /> ADD
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto relative">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {activeTab === 'list' && (
          <div className="space-y-4 relative z-10">
            {friends.length === 0 ? (
              <div className="text-center py-20 text-text-muted font-black font-gaming tracking-widest uppercase opacity-50">No friends yet</div>
            ) : (
              friends.map(f => (
                <motion.div 
                  key={f.uid} 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 p-4 rounded-3xl flex items-center justify-between group hover:border-white/20 transition-all shadow-xl"
                >
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${f.uid}`)}>
                    <div className="relative">
                      <img src={f.avatar || null} alt="" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 object-cover" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-bg-dark" />
                    </div>
                    <span className="font-black text-white font-gaming tracking-tight text-lg">{f.username}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => navigate(`/profile/${f.uid}`)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-text-muted transition-colors">
                      <User size={18} />
                    </button>
                    {f.activeRoomId && (f.activeRoomStatus === 'live' || f.activeRoomStatus === 'sudden_death_live') ? (
                      <button 
                        onClick={() => navigate(`/live/${f.activeRoomId}`)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white rounded-2xl font-black font-gaming tracking-widest uppercase flex items-center gap-2 shadow-neon-primary active:scale-95 transition-all text-xs"
                      >
                        <Eye size={16} /> Spectate
                      </button>
                    ) : (
                      <button onClick={() => handleChallenge(f.uid)} className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-bg-dark rounded-2xl font-black font-gaming tracking-widest uppercase flex items-center gap-2 shadow-neon-up active:scale-95 transition-all text-xs">
                        <Swords size={16} /> Challenge
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4 relative z-10">
            {requests.length === 0 ? (
              <div className="text-center py-20 text-text-muted font-black font-gaming tracking-widest uppercase opacity-50">No pending requests</div>
            ) : (
              requests.map(req => (
                <motion.div 
                  key={req.uid} 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-bg-card/50 backdrop-blur-sm border border-white/10 p-4 rounded-3xl flex items-center justify-between group hover:border-white/20 transition-all shadow-xl"
                >
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${req.uid}`)}>
                    <img src={req.avatar || null} alt="" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 object-cover" />
                    <span className="font-black text-white font-gaming tracking-tight text-lg">{req.username}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleAcceptRequest(req)} className="p-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-2xl font-black shadow-neon-up transition-all active:scale-95">
                      <Check size={20} />
                    </button>
                    <button onClick={() => handleDeclineRequest(req.uid)} className="p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-2xl font-black shadow-neon-down transition-all active:scale-95">
                      <X size={20} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="relative z-10">
            <div className="flex gap-3 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="USERNAME OR UID"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-gaming tracking-widest uppercase text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={searching}
                className="bg-primary text-bg-dark px-6 rounded-2xl font-black font-gaming tracking-widest uppercase shadow-neon-primary disabled:opacity-50 active:scale-95 transition-all text-xs"
              >
                {searching ? '...' : 'SEARCH'}
              </button>
            </div>

            <div className="space-y-4">
              {searchResults.length === 0 && searchQuery && !searching ? (
                <div className="text-center py-20 text-text-muted font-black font-gaming tracking-widest uppercase opacity-50">No users found</div>
              ) : (
                searchResults.map(res => (
                  <motion.div 
                    key={res.uid} 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-bg-card/50 backdrop-blur-sm border border-white/10 p-4 rounded-3xl flex items-center justify-between group hover:border-white/20 transition-all shadow-xl"
                  >
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${res.uid}`)}>
                      <img src={res.avatar || null} alt="" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 object-cover" />
                      <div className="flex flex-col">
                        <span className="font-black text-white font-gaming tracking-tight text-lg">{res.username}</span>
                        <span className="text-[9px] text-text-muted font-mono tracking-widest uppercase opacity-60">UID: {res.uid.substring(0,12)}...</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSendRequest(res.uid, res.username, res.avatar)}
                      className="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-2xl font-black font-gaming tracking-widest uppercase flex items-center gap-2 text-[10px] shadow-neon-primary transition-all active:scale-95"
                    >
                      <UserPlus size={14} /> Add Friend
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
