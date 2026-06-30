"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useGovAuth } from "../../lib/gov-auth-context";
import { Shield, AlertCircle, Loader2, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GovernmentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.email) throw new Error("No email associated with this account");

      const q = query(
        collection(db, "governmentUsers"),
        where("email", "==", user.email.toLowerCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await signOut(auth);
        setError("This account isn't registered as a government account.");
        setLoading(false);
      } else {
        router.push("/government/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  // shared input style
  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
    fontFamily: "var(--font-inter)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(221,180,99,0.5)";
    e.target.style.boxShadow = "0 0 0 3px rgba(221,180,99,0.08)";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.08)";
    e.target.style.boxShadow = "none";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-6"
      style={{ backgroundColor: "#080808", fontFamily: "var(--font-inter)" }}
    >
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
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(221,180,99,0.05) 0%, transparent 60%)",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center"
        style={{
          backgroundColor: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "24px",
          padding: "48px 40px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Top badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
          style={{
            backgroundColor: "rgba(221,180,99,0.07)",
            border: "1px solid rgba(221,180,99,0.18)",
          }}
        >
          <Shield className="w-3.5 h-3.5" style={{ color: "var(--accent-gold)" }} />
          <span
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-inter)" }}
          >
            Government Portal
          </span>
        </div>

        {/* Lock icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{
            backgroundColor: "rgba(221,180,99,0.07)",
            border: "1px solid rgba(221,180,99,0.15)",
          }}
        >
          <Lock className="w-6 h-6" style={{ color: "var(--accent-gold)" }} />
        </div>

        <h1
          className="text-3xl font-bold text-white mb-3"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Secure Access
        </h1>
        <p
          className="text-sm mb-10 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Authorized city officials only. Your credentials are verified against the government registry.
        </p>

        {/* Error */}
        {error && (
          <div
            className="w-full p-4 mb-6 rounded-xl flex items-start gap-3 text-left"
            style={{
              backgroundColor: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "rgba(239,68,68,0.85)",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
          {/* Email */}
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="official@city.gov"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
              style={{
                backgroundColor: loading ? "rgba(255,255,255,0.08)" : "#ffffff",
                color: loading ? "rgba(255,255,255,0.4)" : "#080808",
                boxShadow: loading ? "none" : "0 4px 15px rgba(255,255,255,0.1)",
                fontFamily: "var(--font-inter)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Sign In Securely"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
