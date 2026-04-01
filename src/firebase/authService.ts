import { auth, db, signInAnonymously, onAuthStateChanged, ref, get, set, onValue, createUserWithEmailAndPassword, signInWithEmailAndPassword, linkWithCredential, EmailAuthProvider } from './config';
import { useAppStore, UserProfile } from '../store/useAppStore';

let userListenerUnsubscribe: (() => void) | null = null;

export const initAuth = () => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    const { setUser, setAuthReady } = useAppStore.getState();

    if (userListenerUnsubscribe) {
      userListenerUnsubscribe();
      userListenerUnsubscribe = null;
    }

    if (firebaseUser) {
      const userRef = ref(db, `users/${firebaseUser.uid}`);
      
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUser({ ...userData, uid: firebaseUser.uid });
        } else {
          setUser(null);
        }
        setAuthReady(true);
      });
      
      userListenerUnsubscribe = () => unsubscribe();
    } else {
      setUser(null);
      setAuthReady(true);
    }
  });
};

export const createAndLinkAccount = async (email: string, password: string) => {
  try {
    // 1. Create the new account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 2. Link the current anonymous account to the new account
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(auth.currentUser!, credential);
    
    return userCredential.user;
  } catch (error) {
    console.error("Create and link error:", error);
    throw error;
  }
};

export const linkAccount = async (email: string, password: string) => {
  try {
    // Try to sign in first to see if account exists
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser!, credential);
      return userCredential.user;
    } catch (signInError: any) {
      // If account doesn't exist, create it
      if (signInError.code === 'auth/user-not-found') {
        return await createAndLinkAccount(email, password);
      }
      throw signInError;
    }
  } catch (error) {
    console.error("Link error:", error);
    throw error;
  }
};

export const loginWithUsername = async (username: string) => {
  try {
    console.log("Calling signInAnonymously");
    const cred = await signInAnonymously(auth);
    console.log("signInAnonymously successful, uid:", cred.user.uid);
    const userRef = ref(db, `users/${cred.user.uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      console.log("Creating new user profile");
      // Create new user profile
      const newUser: Omit<UserProfile, 'uid'> = {
        username: username.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cred.user.uid}`,
        rp: 0,
        rankPoints: 0,
        rankTier: 'Bronze',
        trophies: 0,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0,
        bestStreak: 0,
        coins: 5000,
        gems: 100,
        energy: 5,
        lastEnergyUpdate: Date.now(),
        createdAt: Date.now(),
        lastLogin: Date.now(),
        likes: 0,
        equippedTitle: 'BEGINNER',
        unlockedTitles: ['BEGINNER'],
        honorScore: 100,
      };
      await set(userRef, newUser);
      console.log("New user profile created");
    } else {
      console.log("Updating existing user profile");
      // Update username if they log in again
      await set(ref(db, `users/${cred.user.uid}/username`), username.trim());
      await set(ref(db, `users/${cred.user.uid}/lastLogin`), Date.now());
      console.log("Existing user profile updated");
    }
  } catch (error) {
    console.error("Auth error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Logout error:", error);
  }
};
