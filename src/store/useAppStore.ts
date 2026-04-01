import { create } from 'zustand';

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

export interface Quest {
  id: string;
  description: string;
  target: number;
  progress: number;
  rewardType: 'coins' | 'gems' | 'rp' | 'mysteryBox';
  rewardAmount: number;
  completed: boolean;
  claimed: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  avatar: string;
  rp: number;
  coins: number;
  gems: number;
  rankPoints: number;
  rankTier: RankTier;
  trophies: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  energy: number;
  lastEnergyUpdate: number;
  createdAt: number;
  lastLogin: number;
  likes: number;
  equippedTitle: string;
  unlockedTitles: string[];
  honorScore: number;
  signature?: string;
  lastClaimed?: number;
  guildId?: string;
  mysteryBoxes?: number;
  quests?: Quest[];
  lastQuestReset?: number;
  xp?: number;
  level?: number;
}

interface AppState {
  user: UserProfile | null;
  isAuthReady: boolean;
  setUser: (user: UserProfile | null) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
}));
