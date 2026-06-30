"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  AnimatePresence,
  useInView
} from "framer-motion";
import {
  Camera,
  Shield,
  ThumbsUp,
  Building2,
  ScanLine,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Lightbulb,
  Droplets,
  Trash2,
  Construction,
  TreePine,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useAuth } from "./lib/auth-context";
import { useGovAuth } from "./lib/gov-auth-context";

// ─── Interactive Glow Card Component ───────────────────────────────────────────
function GlowCard({
  children,
  className = "",
  glowColor = "rgba(221,180,99,0.06)"
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rafRef = useRef<number | null>(null);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
      rafRef.current = null;
    });
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01] shadow-2xl ${className}`}
      onMouseMove={handleMouseMove}
      style={{ willChange: 'transform' }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              ${glowColor},
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

// ─── Typewriter Effect ─────────────────────────────────────────────────────────
function Typewriter({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  // phase: "reveal" → animate width 0→auto (1.5s)
  //        "wait"   → hold (4s)
  //        "vanish" → animate width auto→0 (1.5s), then advance word
  const [phase, setPhase] = useState<"reveal" | "wait" | "vanish">("reveal");

  const REVEAL_MS = 1500;
  const WAIT_MS = 4000;
  const VANISH_MS = 1500;

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (phase === "reveal") {
      t = setTimeout(() => setPhase("wait"), REVEAL_MS);
    } else if (phase === "wait") {
      t = setTimeout(() => setPhase("vanish"), WAIT_MS);
    } else {
      // vanish complete → advance to next word and start fresh
      t = setTimeout(() => {
        setIndex(prev => (prev + 1) % words.length);
        setPhase("reveal");
      }, VANISH_MS);
    }
    return () => clearTimeout(t);
  }, [phase, words.length]);

  return (
    <span className="inline-grid text-left whitespace-nowrap align-bottom">
      {/* Invisible spacers reserve max width so "Every" never shifts */}
      {words.map(w => (
        <span key={w} className="invisible col-start-1 row-start-1 pr-1">{w}</span>
      ))}
      <span className="col-start-1 row-start-1 flex items-center justify-start">
        <motion.div
          animate={{ width: phase === "vanish" ? 0 : "auto" }}
          initial={{ width: 0 }}
          transition={{
            duration: phase === "reveal" ? REVEAL_MS / 1000 : phase === "vanish" ? VANISH_MS / 1000 : 0,
            ease: "easeInOut",
          }}
          className="overflow-hidden whitespace-nowrap flex items-center pr-2 py-2 -my-2"
          style={{ color: "var(--accent-gold)" }}
        >
          <span>{words[index]}</span>
        </motion.div>
        <motion.span
          animate={{ opacity: [1, 0.2] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="inline-block w-[3px] md:w-[4px] h-[0.9em] bg-[var(--accent-gold)] rounded-full shrink-0 ml-1 md:ml-2"
          style={{ boxShadow: "0 0 12px var(--accent-gold)" }}
        />
      </span>
    </span>
  );
}

// ─── Beat definitions ──────────────────────────────────────────────────────────
const BEATS = [
  {
    id: "report",
    icon: Camera,
    heading: "Reported in seconds.",
    sub: "One photo, one tap — the system takes it from there. Your location is pinned automatically.",
    visual: "camera",
  },
  {
    id: "ai",
    icon: Shield,
    heading: "AI reads it instantly.",
    sub: "Category, severity, and context — classified before you even look up.",
    visual: "badge",
  },
  {
    id: "community",
    icon: ThumbsUp,
    heading: "Community Escalation",
    sub: "Every duplicate vote adds weight. The city can't ignore a chorus of citizens.",
    visual: "votes",
  },
  {
    id: "route",
    icon: Building2,
    heading: "Perfectly routed.",
    sub: "No forwarding chains or lost emails. It lands in the right department's inbox on the first try.",
    visual: "dept",
  },
  {
    id: "verify",
    icon: ScanLine,
    heading: "AI checks the proof.",
    sub: "The department uploads an after photo. Our vision models verify the fix is real.",
    visual: "beforeafter",
  },
  {
    id: "credit",
    icon: CheckCircle2,
    heading: "You approve the fix & earn the credit.",
    sub: "Civic points, real rank. The city remembers exactly who showed up to fix it.",
    visual: "points",
  },
];

// ─── Small visual components ────────────────────────────────────────────────────
function CategoryBadge({ animate }: { animate: boolean }) {
  return (
    <GlowCard className="p-8 w-full max-w-sm mx-auto backdrop-blur-md flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={animate ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.15 }}
        className="flex flex-col items-center gap-4 w-full"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={animate ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          className="text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest w-full"
          style={{ backgroundColor: "rgba(221,180,99,0.1)", color: "var(--accent-gold)", border: "1px solid rgba(221,180,99,0.2)" }}
        >
          Road Infrastructure
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={animate ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          className="text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest w-full"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.9)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          High Priority
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={animate ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm mt-2"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Vision classification: 0.8s
        </motion.p>
      </motion.div>
    </GlowCard>
  );
}

function VoteCounter({ animate }: { animate: boolean }) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (!animate) { setCount(1); return; }
    let n = 1;
    const iv = setInterval(() => {
      n++;
      setCount(n);
      if (n >= 12) clearInterval(iv);
    }, 150);
    return () => clearInterval(iv);
  }, [animate]);

  return (
    <GlowCard className="p-8 w-full max-w-sm mx-auto backdrop-blur-md flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={animate ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div
          className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full text-sm font-semibold shadow-lg"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          <ThumbsUp className="w-4 h-4" />
          I have this too
        </div>
        <div>
          <div
            className="text-7xl font-bold tabular-nums mb-1"
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-playfair)" }}
          >
            {count}
          </div>
          <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            {count === 1 ? "Citizen reported this" : "Citizens escalated this"}
          </div>
        </div>
      </motion.div>
    </GlowCard>
  );
}

function DeptBadge({ animate }: { animate: boolean }) {
  return (
    <GlowCard className="p-8 w-full max-w-sm mx-auto backdrop-blur-md flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={animate ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      >
        <p className="text-xs uppercase tracking-widest mb-4 font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
          Routed directly to
        </p>
        <div
          className="inline-flex items-center gap-4 px-6 py-5 rounded-3xl w-full text-left"
          style={{ backgroundColor: "rgba(221,180,99,0.05)", border: "1px solid rgba(221,180,99,0.15)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(221,180,99,0.1)" }}>
            <Building2 className="w-6 h-6" style={{ color: "var(--accent-gold)" }} />
          </div>
          <div>
            <p className="text-base font-bold text-white mb-0.5">Public Works Dept.</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Road Maintenance Division</p>
          </div>
        </div>
      </motion.div>
    </GlowCard>
  );
}

function BeforeAfter({ animate }: { animate: boolean }) {
  return (
    <GlowCard className="p-6 w-full max-w-lg mx-auto backdrop-blur-md">
      <div className="flex gap-4">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={animate ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] mb-3 text-center font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>Before</p>
          <div
            className="w-full aspect-[4/3] rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}
          >
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
                <ScanLine className="w-6 h-6" style={{ color: "rgba(239,68,68,0.8)" }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: "rgba(239,68,68,0.8)" }}>Government Report</p>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center justify-center">
          <ArrowRight className="w-5 h-5" style={{ color: "rgba(255,255,255,0.2)" }} />
        </div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={animate ? { x: 0, opacity: 1 } : { x: 20, opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-1"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] mb-3 text-center font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>After</p>
          <div
            className="w-full aspect-[4/3] rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)" }}
          >
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg" style={{ backgroundColor: "rgba(74,222,128,0.1)" }}>
                <CheckCircle2 className="w-6 h-6" style={{ color: "rgba(74,222,128,0.9)" }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: "rgba(74,222,128,0.9)" }}>AI Verified</p>
            </div>
          </div>
        </motion.div>
      </div>
    </GlowCard>
  );
}

function PointsTicker({ animate }: { animate: boolean }) {
  const [pts, setPts] = useState(0);

  useEffect(() => {
    if (!animate) { setPts(0); return; }
    let n = 0;
    const target = 150;
    const step = Math.ceil(target / 30);
    const iv = setInterval(() => {
      n = Math.min(n + step, target);
      setPts(n);
      if (n >= target) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [animate]);

  return (
    <GlowCard className="p-10 w-full max-w-sm mx-auto backdrop-blur-md flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={animate ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.7, type: "spring" }}
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 tracking-wide shadow-sm"
          style={{ backgroundColor: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "rgba(74,222,128,1)" }}
        >
          <CheckCircle2 className="w-4 h-4" />
          Issue Resolved
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span
            className="text-8xl font-bold tabular-nums"
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-playfair)", textShadow: "0 0 40px rgba(221,180,99,0.3)" }}
          >
            +{pts}
          </span>
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "rgba(221,180,99,0.8)" }}>Civic Points Earned</p>
      </motion.div>
    </GlowCard>
  );
}

function CameraVisual({ animate }: { animate: boolean }) {
  return (
    <GlowCard className="p-6 w-full max-w-sm mx-auto backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={animate ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center"
      >
        <div
          className="w-full aspect-square rounded-2xl relative overflow-hidden flex items-center justify-center mb-5"
          style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-4 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
          />
          <Camera className="w-12 h-12 relative z-10" style={{ color: "rgba(255,255,255,0.4)" }} />
          {/* Corner viewfinder marks */}
          {[["top-4 left-4", "border-t-2 border-l-2"], ["top-4 right-4", "border-t-2 border-r-2"], ["bottom-4 left-4", "border-b-2 border-l-2"], ["bottom-4 right-4", "border-b-2 border-r-2"]].map(([pos, border], i) => (
            <div key={i} className={`absolute ${pos} w-6 h-6 ${border}`} style={{ borderColor: "var(--accent-gold)", opacity: 0.7 }} />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: "200ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: "400ms" }} />
        </div>
      </motion.div>
    </GlowCard>
  );
}

// ─── Beat visual router ────────────────────────────────────────────────────────
function InViewVisual({ visual }: { visual: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-20% 0px -20% 0px", once: false });
  return (
    <div ref={ref} className="w-full max-w-lg">
      <BeatVisual visual={visual} animate={isInView} />
    </div>
  );
}

function BeatVisual({ visual, animate }: { visual: string; animate: boolean }) {
  switch (visual) {
    case "camera": return <CameraVisual animate={animate} />;
    case "badge": return <CategoryBadge animate={animate} />;
    case "votes": return <VoteCounter animate={animate} />;
    case "dept": return <DeptBadge animate={animate} />;
    case "beforeafter": return <BeforeAfter animate={animate} />;
    case "points": return <PointsTicker animate={animate} />;
    default: return null;
  }
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <GlowCard className="p-8 h-full flex flex-col justify-between hover:-translate-y-1 transition-transform duration-500">
      <div>
        <div className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
          {value}
        </div>
        <div className="text-base font-semibold text-white mb-3 tracking-wide">{label}</div>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</div>
    </GlowCard>
  );
}

// ─── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const { govUser, loading: govLoading } = useGovAuth();
  const loading = authLoading || govLoading;

  // Smooth scroll down
  const scrollDown = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <div
      className="min-h-screen selection:bg-white/20 relative"
      style={{ backgroundColor: "#080808", fontFamily: "var(--font-inter)" }}
    >
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      {/* ── Minimal landing header ── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex items-center justify-between backdrop-blur-md bg-[#080808]/50 border-b border-white/5"
      >
        <a href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
            <Shield className="w-4 h-4" style={{ color: "var(--accent-gold)" }} />
          </div>
          <span className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-playfair)" }}>CityFix</span>
        </a>
        <div className="flex items-center gap-6">
          <Link
            href="/map"
            className="text-sm font-medium transition-colors duration-200 hidden sm:block"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-gold)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
          >
            Live Issues
          </Link>
          {!user && !govUser && (
            <Link
              href="/government/login"
              className="text-sm font-medium transition-colors duration-200 hidden sm:block"
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-gold)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
            >
              Gov Portal
            </Link>
          )}
          {loading ? null : user ? (
            <Link
              href="/dashboard"
              className="text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
              style={{
                backgroundColor: "var(--accent-gold)",
                color: "#080808",
              }}
            >
              My Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
              style={{
                backgroundColor: "#ffffff",
                color: "#080808",
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </motion.header>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        {/* Ambient glow — CSS animation to keep off JS thread */}
        <div
          className="absolute inset-0 pointer-events-none hero-ambient-glow"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(221,180,99,0.08) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 shadow-sm"
            style={{
              backgroundColor: "rgba(221,180,99,0.05)",
              border: "1px solid rgba(221,180,99,0.15)",
            }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: "var(--accent-gold)" }} />
            <span className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "var(--accent-gold)" }}>
              Civic Infrastructure Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-8"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Every <Typewriter words={["Streetlight", "City Pothole", "Dirty Street", "City Issue"]} /> <br className="hidden sm:block" />
            <span className="text-white/40 italic">Has a</span> <span style={{ color: "white" }}>Story.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Report an issue in seconds. Watch AI triage it, your community escalate it,
            and government fix it — tracked completely in public.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-16 flex items-center justify-center gap-4"
          >
            <Link
              href={govUser ? "/government/dashboard" : (user ? "/report" : "/sign-in")}
              className="text-sm font-semibold px-8 py-3.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center gap-2"
              style={{
                backgroundColor: "#ffffff",
                color: "#080808",
              }}
            >
              {govUser ? (
                <>
                  <Shield className="w-4 h-4" />
                  Government Dashboard
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Report Issue
                </>
              )}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <button
              onClick={scrollDown}
              className="inline-flex flex-col items-center gap-3 text-sm font-semibold transition-all duration-300 group"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <span className="group-hover:text-white transition-colors uppercase tracking-widest text-[10px]">See the lifecycle</span>
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:border-white/30 group-hover:bg-white/10 transition-all">
                <ArrowRight
                  className="w-4 h-4 rotate-90"
                  style={{ color: "var(--accent-gold)" }}
                />
              </div>
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── ISSUE CARD STRIP ── */}
      {(() => {
        const ISSUES = [
          { icon: Construction, label: "Fix Pothole", color: "rgba(221,180,99,0.85)" },
          { icon: Lightbulb, label: "Broken Streetlight", color: "rgba(147,197,253,0.85)" },
          { icon: Droplets, label: "Water Leakage", color: "rgba(110,231,183,0.85)" },
          { icon: Trash2, label: "Garbage Overflow", color: "rgba(252,165,165,0.85)" },
          { icon: TreePine, label: "Fallen Tree", color: "rgba(134,239,172,0.85)" },
        ];
        return (
          <section className="w-full overflow-x-auto no-scrollbar py-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="flex gap-5 px-6 lg:px-12 max-w-7xl mx-auto justify-center flex-wrap"
            >
              {ISSUES.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.07 }}
                    whileHover={{ y: -6, scale: 1.03 }}
                    className="group relative flex flex-col items-center gap-5 p-8 rounded-3xl cursor-pointer shrink-0 w-[195px]"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      transition: "border-color 0.3s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = item.color.replace("0.85", "0.3"))}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                  >
                    {/* Icon circle */}
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
                      style={{
                        background: item.color.replace("0.85", "0.08"),
                        boxShadow: `0 0 0 1px ${item.color.replace("0.85", "0.15")}`
                      }}
                    >
                      <Icon className="w-9 h-9" style={{ color: item.color }} />
                      {/* glow pulse on hover */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ boxShadow: `0 0 24px 4px ${item.color.replace("0.85", "0.25")}`, borderRadius: "1rem" }}
                      />
                    </div>
                    {/* Label */}
                    <span
                      className="text-[13px] font-semibold text-center leading-snug tracking-wide"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        );
      })()}

      {/* ── SCROLLY SECTION (Inline Flow) ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-32 flex flex-col gap-32">
        {BEATS.map((beat, i) => {
          const Icon = beat.icon;
          const isEven = i % 2 === 0;
          return (
            <div key={beat.id} className={`flex flex-col md:flex-row items-center gap-16 lg:gap-24 ${isEven ? "" : "md:flex-row-reverse"}`}>
              {/* Text Side */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.4, once: true }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex-1 w-full"
              >
                <GlowCard className="p-10 md:p-12 backdrop-blur-md hover:-translate-y-2 transition-transform duration-300">
                  {/* Step indicator */}
                  <div className="flex items-center gap-4 mb-8">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                      style={{
                        backgroundColor: "rgba(221,180,99,0.1)",
                        border: "1px solid rgba(221,180,99,0.25)",
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: "var(--accent-gold)" }} />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    <span
                      className="text-xs font-bold uppercase tracking-[0.2em]"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      0{i + 1}
                    </span>
                  </div>

                  <h2
                    className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-[1.15]"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {beat.heading}
                  </h2>
                  <p className="text-lg leading-relaxed font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {beat.sub}
                  </p>
                </GlowCard>
              </motion.div>

              {/* Visual Side */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: isEven ? 40 : -40 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ amount: 0.4, once: true }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
                className="flex-1 w-full flex justify-center"
              >
                <InViewVisual visual={beat.visual} />
              </motion.div>
            </div>
          );
        })}
      </section>

      {/* ── CLOSING CTA ── */}
      <section
        className="py-40 px-6 text-center relative overflow-hidden bg-[#080808] z-20"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(221,180,99,0.06) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] mb-6 font-bold" style={{ color: "rgba(221,180,99,0.8)" }}>
              The Future of Civic Action
            </p>
            <h2
              className="text-5xl sm:text-7xl font-bold text-white mb-8 leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Built for <span style={{ color: "var(--accent-gold)" }}>Your City.</span>
            </h2>
            <p
              className="text-xl mx-auto max-w-2xl mb-16 leading-relaxed font-medium"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Join the citizens who are already holding their city accountable.
              Every report builds your civic reputation.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center mb-32">
              {!user && !govUser && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#080808",
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </Link>
              )}
              <Link
                href="/map"
                className="inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-full font-bold text-base transition-all duration-300 hover:bg-white/5 active:scale-95"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(221,180,99,0.4)",
                  color: "var(--accent-gold)",
                }}
              >
                See Live Issues
              </Link>
            </div>
          </motion.div>

          {/* Stat cards */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          >
            <StatCard
              label="AI Triage"
              value="Instant"
              sub="One photo is all it takes. Our AI classifies the issue, assigns severity, and routes it to the right department automatically."
            />
            <StatCard
              label="Community Power"
              value="Amplified"
              sub="Every upvote strengthens the report. When citizens vote together, the city can't ignore the problem."
            />
            <StatCard
              label="Government Action"
              value="Verified"
              sub="Authorities mark issues done — and our AI checks the proof photo to confirm the fix is real before closing."
            />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-12 px-6 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <Shield className="w-4 h-4" style={{ color: "var(--accent-gold)" }} />
          <span className="font-bold text-white tracking-widest uppercase text-xs">CityFix</span>
        </div>
        <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
          Civic infrastructure built in public.
        </p>
      </footer>
    </div>
  );
}
