"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [civicPoints, setCivicPoints] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setCivicPoints(snap.data().civicPoints || 0);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerStyle = {
    backgroundColor: scrolled ? "rgba(8, 8, 8, 0.95)" : "rgba(8, 8, 8, 0.7)",
    backdropFilter: "blur(20px) saturate(180%)",
    borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
  };

  // Always hide on these pages (they have their own header/nav)
  if (pathname?.startsWith("/government") || pathname === "/sign-in" || pathname === "/") {
    return null;
  }

  // For unauthenticated users on public pages (e.g. /map), show a minimal brand + sign-in bar
  if (!user) {
    return (
      <header className="w-full fixed top-0 left-0 z-50 transition-all duration-300" style={headerStyle}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Shield className="w-5 h-5" style={{ color: "var(--accent-gold)" }} />
              <span className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-playfair)" }}>
                CityFix
              </span>
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium px-4 py-2 rounded-full transition-all duration-200"
              style={{ color: "var(--accent-gold)", border: "1px solid rgba(221,180,99,0.3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(221,180,99,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Full nav for authenticated citizens
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Report Issue", href: "/report" },
    { label: "My Complaints", href: "/my-complaints" },
    { label: "City Map", href: "/map" },
  ];

  return (
    <header className="w-full fixed top-0 left-0 z-50 transition-all duration-300" style={headerStyle}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Shield className="w-5 h-5" style={{ color: "var(--accent-gold)" }} />
            <span className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-playfair)" }}>
              CityFix
            </span>
          </Link>

          {/* Center: Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap rounded-lg"
                  style={{
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.45)",
                    backgroundColor: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                    fontFamily: "var(--font-inter)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                    if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: User Info */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Civic Points Pill */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: "rgba(221,180,99,0.12)",
                border: "1px solid rgba(221,180,99,0.25)",
                color: "var(--accent-gold)",
                fontFamily: "var(--font-inter)",
              }}
            >
              <span>{civicPoints}</span>
              <span className="uppercase tracking-widest opacity-70">pts</span>
            </div>

            {/* Avatar */}
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Sign Out */}
            <button
              onClick={async () => { await logout(); router.push("/"); }}
              className="hidden sm:block text-xs font-medium transition-colors duration-200"
              style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-inter)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
