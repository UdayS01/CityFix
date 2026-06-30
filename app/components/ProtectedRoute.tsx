"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { useGovAuth } from "../lib/gov-auth-context";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { govUser, loading: govLoading } = useGovAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !govLoading) {
      if (govUser) {
        // Government officials should not access citizen routes
        router.push("/government/dashboard");
      } else if (!user) {
        // Unauthenticated users go to landing
        router.push("/");
      }
    }
  }, [user, govUser, authLoading, govLoading, router]);

  if (authLoading || govLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#DDB463] rounded-full animate-spin" />
      </div>
    );
  }

  // Prevent render if not a citizen or if govUser
  if (!user || govUser) {
    return null; 
  }

  return <>{children}</>;
}
