"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";

interface GovAuthContextType {
  govUser: User | null;
  department: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const GovAuthContext = createContext<GovAuthContextType>({
  govUser: null,
  department: null,
  loading: true,
  logout: async () => {},
});

export const useGovAuth = () => useContext(GovAuthContext);

export const GovAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [govUser, setGovUser] = useState<User | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        try {
          // Check if this user exists in governmentUsers collection
          const q = query(
            collection(db, "governmentUsers"), 
            where("email", "==", currentUser.email.toLowerCase())
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            setGovUser(currentUser);
            setDepartment(querySnapshot.docs[0].data().department);
          } else {
            // They are authenticated but not a government user (e.g. a citizen)
            setGovUser(null);
            setDepartment(null);
          }
        } catch (error) {
          console.error("Error checking government user:", error);
          setGovUser(null);
          setDepartment(null);
        }
      } else {
        setGovUser(null);
        setDepartment(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  return (
    <GovAuthContext.Provider value={{ govUser, department, loading, logout }}>
      {children}
    </GovAuthContext.Provider>
  );
};
