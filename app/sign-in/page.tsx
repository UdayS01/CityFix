"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const { signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Loading state with concentric orbit animation
  if (loading) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#080808' }}>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-fit">
          {/* Concentric Orbits */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-8">
            {/* Outer Indigo Ring */}
            <div className="absolute inset-0 border rounded-full animate-[spin_8s_linear_infinite]" 
                 style={{ borderColor: 'rgba(108, 124, 224, 0.4)' }} />
            
            {/* Inner Gold Ring with orbiting dot */}
            <div className="absolute inset-4 border rounded-full animate-[spin_4s_linear_infinite]"
                 style={{ borderColor: 'rgba(221, 180, 99, 0.4)' }}>
              <div 
                className="absolute top-0 left-1/2 rounded-full" 
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  marginTop: '-5px', 
                  marginLeft: '-5px', 
                  backgroundColor: 'var(--accent-gold)',
                  boxShadow: '0 0 12px var(--accent-gold)' 
                }} 
              />
            </div>
            
            {/* Center Icon */}
            <Shield className="w-8 h-8 text-[var(--accent-gold)]" />
          </div>

          <h2 className="text-2xl text-white mb-2 flex items-center" style={{ fontFamily: 'var(--font-playfair)' }}>
            Scanning the city
          </h2>
          <p className="text-[var(--text-secondary)] text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
            Mapping your neighborhood&apos;s pulse.
          </p>
          
          {/* 3-dot pulse indicator */}
          <div className="mt-5 flex gap-2 justify-center">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-gold)', animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-gold)', animationDelay: '200ms' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-gold)', animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Sign-in card state
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#080808' }}>
      
      {/* Back Button */}
      <Link 
        href="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-white/5 shadow-lg"
        style={{ backgroundColor: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Ambient radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(221,180,99,0.05) 0%, transparent 60%)" }}
      />

      {/* h-fit prevents card from stretching. */}
      <div className="relative z-10 w-full max-w-md mx-auto p-12 flex flex-col items-center text-center h-fit"
           style={{
             backgroundColor: 'rgba(255,255,255,0.02)',
             border: '1px solid rgba(255,255,255,0.07)',
             borderRadius: '24px',
             boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
           }}>
        
        {/* Pill Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
             style={{ 
               backgroundColor: 'rgba(221, 180, 99, 0.1)', 
               border: '1px solid rgba(221, 180, 99, 0.2)' 
             }}>
          <Shield className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-inter)' }}>
            Built for Your City
          </span>
        </div>

        <h1 className="text-4xl font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
          Welcome to CityFix
        </h1>
        <p className="mb-10 leading-relaxed text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-inter)' }}>
          Sign in to report, track, and collaborate on civic issues in your neighborhood.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-full font-medium text-black bg-[#FAFAFA] transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ boxShadow: '0 0 15px rgba(255,255,255,0.2)', fontFamily: 'var(--font-inter)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
