"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGovAuth } from "../lib/gov-auth-context";

export default function GovProtectedRoute({ children }: { children: React.ReactNode }) {
  const { govUser, department, loading } = useGovAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!govUser || !department)) {
      router.push("/");
    }
  }, [govUser, department, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-8 h-8 border-4 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!govUser || !department) {
    return null; // useEffect will redirect
  }

  return <>{children}</>;
}
