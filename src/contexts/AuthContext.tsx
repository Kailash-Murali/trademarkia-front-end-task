"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { pickColor } from "@/lib/colors";

interface AuthCtx {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnon: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInAnon: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(toProfile(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInAnon = async (displayName: string) => {
    const cred = await signInAnonymously(auth);
    await updateProfile(cred.user, { displayName });
    // Force update state with new display name
    setUser(toProfile({ ...cred.user, displayName } as User));
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signInAnon, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function toProfile(u: User): UserProfile {
  return {
    uid: u.uid,
    displayName: u.displayName || "Anonymous",
    color: pickColor(u.uid),
    isAnonymous: u.isAnonymous,
  };
}
