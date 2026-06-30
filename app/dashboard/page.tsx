"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../lib/auth-context";
import Link from "next/link";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, getCountFromServer, Timestamp } from "firebase/firestore";
import { FileText, Activity, CheckCircle2, AlertTriangle, Plus, Map as MapIcon, Award, Clock } from "lucide-react";

interface Issue {
  id: string;
  status: string;
  autoEscalated?: boolean;
  resolvedAt?: Timestamp;
  category?: string;
  citizenId?: string;
}

interface UserData {
  id: string;
  displayName: string;
  photoURL: string;
  civicPoints: number;
}

interface ActivityItem {
  id: string;
  category: string;
  resolvedAt: Date;
  displayName: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, escalated: 0 });
  const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 1. Stat cards (Real-time)
    const myIssuesQuery = query(collection(db, "issues"), where("voterIds", "array-contains", user.uid));
    const unsubIssues = onSnapshot(myIssuesQuery, (snapshot) => {
      let active = 0, resolved = 0, escalated = 0;
      snapshot.forEach(doc => {
        const data = doc.data() as Issue;
        if (data.status === "resolved") resolved++;
        else active++;
        if (data.autoEscalated) escalated++;
      });
      setStats({ total: snapshot.size, active, resolved, escalated });
    });

    return () => unsubIssues();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 2. Leaderboard
        const topUsersQuery = query(collection(db, "users"), orderBy("civicPoints", "desc"), limit(10));
        const topUsersSnap = await getDocs(topUsersQuery);
        
        const topUsers: UserData[] = [];
        let foundSelf = false;
        let myPoints = 0;

        topUsersSnap.forEach((doc) => {
          const data = doc.data() as UserData;
          topUsers.push({ ...data, id: doc.id });
          if (doc.id === user.uid) {
            foundSelf = true;
            setUserRank(topUsers.length);
            myPoints = data.civicPoints;
          }
        });
        
        setLeaderboard(topUsers);

        if (!foundSelf) {
          const myDocSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", user.uid)));
          if (!myDocSnap.empty) {
            myPoints = myDocSnap.docs[0].data().civicPoints || 0;
            setUserPoints(myPoints);
            
            const betterUsersQuery = query(collection(db, "users"), where("civicPoints", ">", myPoints));
            const countSnap = await getCountFromServer(betterUsersQuery);
            setUserRank(countSnap.data().count + 1);
          }
        } else {
          setUserPoints(myPoints);
        }

        // 3. Activity Feed
        const feedQuery = query(collection(db, "issues"), where("status", "==", "resolved"), orderBy("resolvedAt", "desc"), limit(5));
        const feedSnap = await getDocs(feedQuery);
        
        const activityItems: ActivityItem[] = [];
        for (const docSnapshot of feedSnap.docs) {
          const data = docSnapshot.data() as Issue;
          if (!data.resolvedAt || !data.citizenId) continue;
          
          let displayName = "A citizen";
          const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", data.citizenId)));
          if (!userDoc.empty) {
             displayName = userDoc.docs[0].data().displayName || displayName;
          }
          
          activityItems.push({
            id: docSnapshot.id,
            category: data.category || 'issue',
            resolvedAt: data.resolvedAt.toDate(),
            displayName: displayName.split(' ')[0]
          });
        }
        
        setActivity(activityItems);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <ProtectedRoute>
      <div
        className="min-h-screen pb-24"
        style={{
          backgroundColor: "#080808",
          fontFamily: "var(--font-inter)",
        }}
      >
        {/* Subtle ambient glow — barely visible, purely atmospheric */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(221,180,99,0.04) 0%, transparent 60%)",
          }}
        />

        <main className="relative max-w-6xl mx-auto px-6 pt-28">

          {/* Hero header */}
          <div className="mb-12 pt-6">
            <p
              className="text-xs uppercase tracking-[0.25em] mb-4 font-medium"
              style={{ color: "rgba(221,180,99,0.6)", fontFamily: "var(--font-inter)" }}
            >
              Citizen Dashboard
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold text-white leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Your City,{" "}
              <span style={{ color: "var(--accent-gold)" }}>Your Voice</span>
            </h1>
            <p
              className="mt-3 text-base max-w-lg"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-inter)" }}
            >
              Track, report, and resolve civic issues in your community.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-14">
            <Link
              href="/report"
              className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #e8e8e8 100%)",
                color: "#080808",
                boxShadow: "0 4px 15px rgba(255,255,255,0.1)",
                fontFamily: "var(--font-inter)",
              }}
            >
              <Plus className="w-4 h-4" />
              Report New Issue
            </Link>
            <Link
              href="/map"
              className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "var(--font-inter)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <MapIcon className="w-4 h-4" />
              City Health Map
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Column */}
            <div className="flex-1 flex flex-col gap-8">

              {/* Stat Cards */}
              <div>
                <h2
                  className="text-xs uppercase tracking-[0.2em] font-semibold mb-5"
                  style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-inter)" }}
                >
                  Your Impact
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Reports", val: stats.total, icon: FileText, accent: "rgba(255,255,255,0.5)" },
                    { label: "Active", val: stats.active, icon: Activity, accent: "rgba(221,180,99,0.8)" },
                    { label: "Resolved", val: stats.resolved, icon: CheckCircle2, accent: "rgba(74,222,128,0.8)" },
                    { label: "Escalated", val: stats.escalated, icon: AlertTriangle, accent: "rgba(248,113,113,0.8)" },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={i}
                        className="p-5 rounded-2xl flex flex-col gap-3 transition-all duration-300 hover:-translate-y-0.5"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: stat.accent }} />
                        <div>
                          <div className="text-2xl font-bold text-white">{stat.val}</div>
                          <div
                            className="text-[10px] uppercase tracking-widest mt-0.5"
                            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-inter)" }}
                          >
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2
                  className="text-xs uppercase tracking-[0.2em] font-semibold mb-5"
                  style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-inter)" }}
                >
                  Recent Community Activity
                </h2>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {loading ? (
                    <div className="p-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                      Loading activity...
                    </div>
                  ) : activity.length === 0 ? (
                    <div className="p-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                      No recent activity yet.
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {activity.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "rgba(74,222,128,0.1)" }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "rgba(74,222,128,0.9)" }} />
                          </div>
                          <p className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                            <span className="font-semibold text-white">{item.displayName}</span>{" "}
                            got a{" "}
                            <span style={{ color: "rgba(255,255,255,0.75)" }}>
                              {item.category.replace(/_/g, " ")}
                            </span>{" "}
                            issue fixed
                          </p>
                          <span
                            className="text-[10px] uppercase tracking-wider shrink-0"
                            style={{ color: "rgba(255,255,255,0.2)" }}
                          >
                            {getTimeAgo(item.resolvedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar: Civic Heroes */}
            <div className="w-full lg:w-72 shrink-0">
              <h2
                className="text-xs uppercase tracking-[0.2em] font-semibold mb-5"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-inter)" }}
              >
                Civic Heroes
              </h2>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {loading ? (
                  <div className="p-6 text-center text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Loading...
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    {leaderboard.map((hero, index) => {
                      const isMe = hero.id === user?.uid;
                      const rankColors = ["var(--accent-gold)", "rgba(200,200,210,0.9)", "rgba(205,127,50,0.9)"];
                      return (
                        <div
                          key={hero.id}
                          className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                          style={{
                            backgroundColor: isMe ? "rgba(221,180,99,0.05)" : "transparent",
                          }}
                        >
                          <span
                            className="w-5 text-center text-xs font-bold shrink-0"
                            style={{ color: index < 3 ? rankColors[index] : "rgba(255,255,255,0.2)" }}
                          >
                            {index + 1}
                          </span>
                          <div
                            className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.6)",
                            }}
                          >
                            {hero.photoURL ? (
                              <img src={hero.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              hero.displayName?.charAt(0)
                            )}
                          </div>
                          <span
                            className="flex-1 text-sm font-medium truncate"
                            style={{ color: isMe ? "var(--accent-gold)" : "rgba(255,255,255,0.75)" }}
                          >
                            {isMe ? "You" : hero.displayName?.split(" ")[0]}
                          </span>
                          <span
                            className="text-sm font-bold shrink-0"
                            style={{ color: index < 3 ? rankColors[index] : "rgba(255,255,255,0.5)" }}
                          >
                            {hero.civicPoints}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!loading && userRank && userRank > 10 && (
                  <div
                    className="px-4 py-3 border-t flex items-center justify-between text-sm"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Your rank</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">#{userRank}</span>
                      <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>{userPoints} pts</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
