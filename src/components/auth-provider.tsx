"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import { E2E_MODE } from "@/lib/e2e-mode";

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

const E2E_USER: AuthUser = {
  uid: "e2e-user",
  displayName: "Home Cook",
  email: "cook@example.com",
  photoURL: null,
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(E2E_MODE ? E2E_USER : null);
  const [loading, setLoading] = useState(!E2E_MODE);

  useEffect(() => {
    if (E2E_MODE) return;
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(
        u
          ? {
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
              photoURL: u.photoURL,
            }
          : null
      );
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (E2E_MODE) return;
    await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  };

  const signOut = async () => {
    if (E2E_MODE) return;
    await firebaseSignOut(getFirebaseAuth());
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
