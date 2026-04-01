import React, { useEffect, useState } from 'react';
import { ArrowLeft, Settings, Copy, ThumbsUp, Edit2, Calendar, Clock, Crosshair, Gift, Shield, Crown, Swords, Target, Zap, Coins, Trophy, Activity, ChevronRight, UserPlus, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore, UserProfile } from '../store/useAppStore';
import { db, ref, get, query, limitToLast, update, set } from '../firebase/config';
import { motion } from 'motion/react';

export default function Profile() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const { uid } = useParams<{ uid?: string }>();
  const isOwnProfile = !uid || uid === user?.uid;
  
  const [profileUser, setProfileUser] = useState<UserProfile | null>(isOwnProfile ? user : null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [myGuild, setMyGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [copied, setCopied] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [signatureInput, setSignatureInput] = useState('');
  const [showDailyReward, setShowDailyReward] = useState(false);

  useEffect(() => {
    if (isOwnProfile && user) {
      const today = new Date().toDateString();
      const lastClaimedDate = user.lastClaimed ? new Date(user.lastClaimed).toDateString() : '';
      if (today !== lastClaimedDate) {
        setShowDailyReward(true);
      }
    }
  }, [isOwnProfile, user]);

  useEffect(() => {
    if (profileUser) {
      setSignatureInput(profileUser.signature || `Don't Worry Baby " ${profileUser.username} Is Here !`);
      
      // Fetch user's guild
      const fetchGuild = async () => {
        const guildsRef = ref(db, 'guilds');
        const snap = await get(guildsRef);
        if (snap.exists()) {
          const guildsData = snap.val();
          const userGuild = Object.keys(guildsData).find(id => 
            guildsData[id].members && guildsData[id].members[profileUser.uid]
          );
          if (userGuild) {
            setMyGuild({ id: userGuild, ...guildsData[userGuild] });
          } else {
            setMyGuild(null);
          }
        }
      };
      fetchGuild();
    }
  }, [profileUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (isOwnProfile) {
        setProfileUser(user);
      } else if (uid) {
        const snap = await get(ref(db, `users/${uid}`));
        if (snap.exists()) {
          setProfileUser({ ...snap.val(), uid });
        }
      }
    };
    fetchProfile();
  }, [uid, user, isOwnProfile]);

  useEffect(() => {
    if (!profileUser) return;
    const fetchHistory = async () => {
      try {
        const historyRef = query(ref(db, `missionHistory/${profileUser.uid}`), limitToLast(10));
        const snap = await get(historyRef);
        if (snap.exists()) {
          const data = snap.val();
          const formatted = Object.keys(data)
            .map(k => ({ id: k, ...data[k] }))
            .sort((a, b) => b.timestamp - a.timestamp);
          setRecentMatches(formatted);
        }
      } catch (error) {
        console.error("Error fetching mission history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
    
    // Check friend status if not own profile
    if (!isOwnProfile && user && profileUser) {
      get(ref(db, `friends/${user.uid}/${profileUser.uid}`)).then(snap => {
        if (snap.exists()) setFriendStatus('friends');
        else {
          get(ref(db, `friendRequests/${profileUser.uid}/${user.uid}`)).then(reqSnap => {
            if (reqSnap.exists()) setFriendStatus('pending');
          });
        }
      });
    }
  }, [profileUser, isOwnProfile, user]);

  if (!profileUser) return (
    <div className="mobile-container bg-[#0a0f16] flex items-center justify-center min-h-screen">
      <div className="text-yellow-400 font-bold">LOADING...</div>
    </div>
  );

  const level = Math.floor((profileUser.rp || 0) / 1000) + 1;
  const avgAccuracy = profileUser.avgAccuracy || 0;
  const uidShort = profileUser.uid.substring(0, 10).toUpperCase();
  const likes = profileUser.likes || 0;

  const achievements = [
    { id: 1, name: 'First Blood', unlocked: (profileUser.totalHits || 0) > 0, icon: <Target size={16} /> },
    { id: 2, name: 'Sniper', unlocked: (profileUser.avgAccuracy || 0) >= 80, icon: <Zap size={16} /> },
    { id: 3, name: 'Elite', unlocked: (profileUser.highScore || 0) >= 10000, icon: <Coins size={16} /> },
    { id: 4, name: 'Veteran', unlocked: (profileUser.totalMissions || 0) >= 50, icon: <Swords size={16} /> },
  ];

  const handleLike = async () => {
    if (isOwnProfile || !user || !profileUser) return;
    // Simple like (no prevention of multiple likes for this prototype)
    const newLikes = likes + 1;
    setProfileUser({ ...profileUser, likes: newLikes });
    await update(ref(db, `users/${profileUser.uid}`), { likes: newLikes });
  };

  const handleSendFriendRequest = async () => {
    if (!user || !profileUser || friendStatus !== 'none') return;
    await set(ref(db, `friendRequests/${profileUser.uid}/${user.uid}`), {
      timestamp: Date.now(),
      username: user.username,
      avatar: user.avatar
    });
    setFriendStatus('pending');
  };

  const handleEquipTitle = async (title: string) => {
    if (!isOwnProfile || !user) return;
    await update(ref(db, `users/${user.uid}`), { equippedTitle: title });
    setShowTitleModal(false);
  };

  const handleCopyUid = () => {
    if (profileUser) {
      navigator.clipboard.writeText(profileUser.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveSignature = async () => {
    if (!isOwnProfile || !user) return;
    await update(ref(db, `users/${user.uid}`), { signature: signatureInput });
    setProfileUser(prev => prev ? { ...prev, signature: signatureInput } : null);
    setIsEditingSignature(false);
  };

  const handleClaimDaily = async () => {
    if (!user) return;
    const today = Date.now();
    await update(ref(db, `users/${user.uid}`), {
      rp: user.rp + 100,
      lastClaimed: today
    });
    setShowDailyReward(false);
  };

  return (
    <div className="mobile-container bg-[#0a0f16] flex flex-col h-screen overflow-hidden font-sans text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#0a0f16] sticky top-0 z-20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col ml-2">
            <span className="text-xl font-black text-yellow-400 italic tracking-wider font-gaming">PROFILE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/guilds')}
            className="bg-white/10 px-3 py-1 rounded flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-colors"
          >
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=guild" className="w-5 h-5" alt="guild" />
            <span className="text-xs font-bold font-gaming">GUILD INFO.</span>
          </button>
          <Settings 
            size={24} 
            className="text-gray-300 cursor-pointer hover:text-white" 
            onClick={() => navigate('/settings')}
          />
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* Profile Card */}
        <div className="mx-4 mt-2 bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-xl relative shadow-2xl overflow-hidden border border-white/10 group">
          {/* Animated Background Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px] group-hover:bg-primary/30 transition-all duration-700"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-[60px] group-hover:bg-purple-600/30 transition-all duration-700"></div>
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
          
          {/* Neon Accents */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-neon-primary rounded-l-xl"></div>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary shadow-neon-primary"></div>

          <div className="flex p-4 pl-6 pb-8 relative z-10">
            {/* Avatar & Level */}
            <div className="flex flex-col items-center relative">
              <div className="w-24 h-24 rounded-2xl p-1 bg-gradient-to-br from-primary via-purple-500 to-blue-600 shadow-neon-primary">
                <div className="w-full h-full rounded-[14px] bg-gray-900 overflow-hidden border border-white/10">
                  <img src={profileUser.avatar || null} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="absolute -bottom-3 bg-primary text-black text-[10px] font-black px-4 py-1 flex items-center gap-1 shadow-neon-primary border border-white/20 font-gaming rounded-full">
                LV. {level}
              </div>
            </div>

            {/* Info */}
            <div className="ml-5 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-2xl tracking-tight font-gaming uppercase text-white text-glow-primary">{profileUser.username}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">♂</div>
                    <div className="text-xs text-text-muted font-bold font-rajdhani uppercase tracking-widest">Region: English</div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                      <Calendar size={14} className="text-primary" />
                      <span className="text-[10px] font-bold text-text-muted font-gaming">JOINED</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                      <Clock size={14} className="text-primary" />
                      <span className="text-[10px] font-bold text-text-muted font-gaming">ACTIVE</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 font-black text-2xl font-gaming ${isOwnProfile ? 'text-white' : 'text-white hover:text-primary active:scale-95 transition-all'}`}
                  >
                    <ThumbsUp size={24} className={isOwnProfile ? "text-primary" : "text-primary shadow-neon-primary"} /> 
                    <span className="text-glow-primary">{likes}</span>
                  </button>
                  {!isOwnProfile && (
                    <button 
                      onClick={handleSendFriendRequest}
                      disabled={friendStatus !== 'none'}
                      className={`text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-2 font-gaming transition-all ${friendStatus === 'none' ? 'bg-primary text-black shadow-neon-primary hover:scale-105' : 'bg-gray-700 text-gray-400'}`}
                    >
                      {friendStatus === 'none' ? <><UserPlus size={14}/> ADD FRIEND</> : friendStatus === 'pending' ? 'REQUEST SENT' : 'FRIENDS'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* UID Box */}
          <div className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-md text-primary text-[10px] px-4 py-2 flex items-center gap-2 rounded-tl-2xl font-mono border-t border-l border-white/10">
            <span className="opacity-60">UID:</span> {uidShort} 
            {copied ? (
              <span className="text-up font-bold text-[10px] font-gaming">COPIED!</span>
            ) : (
              <Copy size={12} className="text-white cursor-pointer hover:text-primary transition-colors" onClick={handleCopyUid} />
            )}
          </div>
        </div>

        {/* Guild Card */}
        {myGuild && (
          <div className="mx-4 mt-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-xl p-4 border border-white/10 relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-all" onClick={() => navigate('/guilds')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-all"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black/40 rounded-lg border border-white/10 p-1 flex items-center justify-center">
                <img src={myGuild.avatar || null} alt="Guild" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-primary font-gaming tracking-widest uppercase">Guild Member</span>
                  <span className="bg-primary text-black text-[9px] font-black px-1.5 py-0.5 rounded">[{myGuild.tag}]</span>
                </div>
                <h3 className="text-lg font-black font-gaming tracking-tight text-white">{myGuild.name}</h3>
              </div>
              <ChevronRight size={20} className="text-text-muted group-hover:text-primary transition-colors" />
            </div>
          </div>
        )}

        {/* Tabs - Sticky */}
        <div className="sticky top-0 z-10 bg-[#0a0f16] pt-4">
          <div className="flex mx-4 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 font-black text-xs tracking-widest relative font-gaming ${activeTab === 'stats' ? 'text-white' : 'text-gray-500'}`}
            >
              STATS
              {activeTab === 'stats' && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.2) 5px, rgba(0,0,0,0.2) 10px)' }}></motion.div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 font-black text-xs tracking-widest relative font-gaming ${activeTab === 'history' ? 'text-white' : 'text-gray-500'}`}
            >
              HISTORY
              {activeTab === 'history' && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.2) 5px, rgba(0,0,0,0.2) 10px)' }}></motion.div>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' ? (
        <div className="p-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-bg-dark/50 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1 font-gaming">RP</span>
              <span className="text-lg font-black text-white font-mono">{(profileUser.rp || 0).toLocaleString()}</span>
            </div>
            <div className="bg-bg-dark/50 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1 font-gaming">COINS</span>
              <span className="text-lg font-black text-primary font-mono">{(profileUser.coins || 0).toLocaleString()}</span>
            </div>
            <div className="bg-bg-dark/50 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1 font-gaming">TROPHIES</span>
              <span className="text-lg font-black text-purple-400 font-mono">{profileUser.trophies}</span>
            </div>
            <div className="bg-bg-dark/50 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1 font-gaming">BOXES</span>
              <span className="text-lg font-black text-orange-400 font-mono">{profileUser.mysteryBoxes || 0}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="grid grid-cols-4 gap-2 text-center mt-2">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-2 relative flex items-center justify-center">
                <Crown size={36} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              </div>
              <div className="text-[8px] text-gray-400 font-bold tracking-widest font-gaming uppercase">HIGH SCORE</div>
              <div className="font-mono text-[10px] uppercase font-black text-white">{(profileUser.highScore || 0).toLocaleString()}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-2 relative flex items-center justify-center">
                <Shield size={36} className="text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-white text-xs mt-1">{avgAccuracy}%</div>
              </div>
              <div className="text-[8px] text-gray-400 font-bold tracking-widest font-gaming uppercase">ACCURACY</div>
              <div className="font-mono text-[10px] uppercase font-black text-white">ELITE</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-2 relative flex items-center justify-center">
                <Swords size={36} className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-white text-xs mt-2">{profileUser.totalMissions || 0}</div>
              </div>
              <div className="text-[8px] text-gray-400 font-bold tracking-widest font-gaming uppercase">MISSIONS</div>
              <div className="font-mono text-[10px] uppercase font-black text-white">SNIPER</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 mb-2 relative flex items-center justify-center">
                <Activity size={36} className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-white text-xs mt-2">{profileUser.totalHits || 0}</div>
              </div>
              <div className="text-[8px] text-gray-400 font-bold tracking-widest font-gaming uppercase">TOTAL HITS</div>
              <div className="font-mono text-[10px] uppercase font-black text-white">DEADLY</div>
            </div>
          </div>

          {/* Title */}
          <div className="mt-8">
            <div className="flex items-center gap-2 text-yellow-400 font-black text-[10px] mb-3 tracking-widest font-gaming">
              <span className="opacity-70">\\\\</span> TITLE
            </div>
            <div className="flex justify-center">
              <div 
                onClick={() => isOwnProfile && setShowTitleModal(true)}
                className={`relative px-12 py-2 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black font-black text-lg tracking-widest font-gaming ${isOwnProfile ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`} 
                style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}
              >
                <div className="absolute inset-[2px] bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 flex items-center justify-center" style={{ clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)' }}>
                  {profileUser.equippedTitle || 'BEGINNER'}
                </div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="mt-8">
            <div className="flex items-center gap-2 text-yellow-400 font-black text-[10px] mb-4 tracking-widest font-gaming">
              <span className="opacity-70">\\\\</span> ACHIEVEMENTS
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              {achievements.map((ach) => (
                <div key={ach.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 mb-2 flex items-center justify-center transform rotate-45 border-2 ${ach.unlocked ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_10px_rgba(250,204,21,0.3)] text-yellow-400' : 'border-gray-700 bg-gray-800/50 text-gray-600'}`}>
                    <div className="transform -rotate-45">
                      {ach.icon}
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold tracking-widest font-gaming ${ach.unlocked ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {ach.name.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signature */}
          <div className="mt-10 bg-black/40 p-3 text-xs text-gray-300 border border-gray-800 font-rajdhani flex items-start gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400/50"></div>
            <span className="text-yellow-500 font-black">[{profileUser.rankTier[0]}]</span>
            {isEditingSignature ? (
              <div className="flex-1 flex items-center gap-2">
                <input 
                  type="text" 
                  value={signatureInput}
                  onChange={(e) => setSignatureInput(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 text-white px-2 py-1 text-xs outline-none focus:border-yellow-500 font-sans"
                  maxLength={60}
                  autoFocus
                />
                <button onClick={handleSaveSignature} className="p-1 bg-yellow-500 text-black rounded hover:bg-yellow-400">
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <>
                <p className="flex-1 break-words tracking-wider font-medium">{profileUser.signature || `Don't Worry Baby " ${profileUser.username} Is Here !`}</p>
                {isOwnProfile && <Edit2 size={14} className="text-gray-600 ml-auto mt-1 cursor-pointer hover:text-white" onClick={() => setIsEditingSignature(true)} />}
              </>
            )}
          </div>
        </div>

        ) : (
          <div className="p-4">
            {/* History Tab Content */}
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm font-bold">LOADING...</div>
            ) : recentMatches.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm font-bold bg-white/5 rounded-sm border border-white/10">NO MATCHES PLAYED YET</div>
            ) : (
              <div className="space-y-3">
                {recentMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-l-4 border-red-500 rounded-sm shadow-md">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-sm flex items-center justify-center bg-red-500/20 text-red-400 border border-red-500/30">
                        <Target size={24} />
                      </div>
                      <div>
                        <span className="text-sm font-black text-white uppercase tracking-wider">MISSION</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(match.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-primary font-bold">{match.accuracy}% ACC</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-black text-yellow-400">
                      {match.score.toLocaleString()}
                    </div>
                  </div>
                ))}
                {isOwnProfile && (
                  <button onClick={() => navigate('/history')} className="w-full py-3 mt-4 bg-white/5 hover:bg-white/10 text-white font-bold text-sm tracking-widest transition-colors rounded-sm border border-white/10">
                    VIEW FULL HISTORY
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title Selection Modal */}
      {showTitleModal && isOwnProfile && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a202c] border border-gray-700 rounded-lg w-full max-w-sm p-5">
            <h3 className="text-yellow-400 font-black text-lg mb-4 tracking-widest text-center">EQUIP TITLE</h3>
            <div className="space-y-3">
              {(user?.unlockedTitles || ['BEGINNER', 'DOMINATOR']).map(title => (
                <button
                  key={title}
                  onClick={() => handleEquipTitle(title)}
                  className={`w-full py-3 px-4 flex items-center justify-between rounded border ${user?.equippedTitle === title ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'bg-black/50 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                >
                  <span className="font-black tracking-widest">{title}</span>
                  {user?.equippedTitle === title && <Check size={18} />}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowTitleModal(false)}
              className="w-full mt-6 py-3 bg-gray-800 text-white font-bold rounded"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Daily Reward Modal */}
      {showDailyReward && isOwnProfile && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-b from-gray-900 to-black border border-yellow-400/30 rounded-3xl w-full max-w-sm p-8 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-400/20">
                <Gift size={40} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2 font-gaming tracking-tight uppercase">Daily Reward</h3>
              <p className="text-gray-400 text-sm font-bold font-rajdhani tracking-widest uppercase mb-8">Claim your daily login bonus to boost your RP!</p>
              
              <div className="bg-black/40 rounded-2xl p-6 border border-white/5 mb-8 flex items-center justify-center gap-3">
                <Coins size={32} className="text-yellow-400" />
                <span className="text-4xl font-black text-white font-gaming tracking-tighter">100 <span className="text-lg text-yellow-400">RP</span></span>
              </div>
              
              <button 
                onClick={handleClaimDaily}
                className="w-full py-4 bg-yellow-400 text-black font-black text-lg rounded-xl shadow-neon-primary hover:scale-105 transition-transform font-gaming tracking-widest uppercase"
              >
                CLAIM NOW
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
