"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import ProtectedRoute from "../components/ProtectedRoute";
import Link from "next/link";
import { ChevronDown, ChevronUp, Clock, AlertTriangle, ArrowRight, PlusCircle, CheckCircle2, Loader2 } from "lucide-react";

interface Issue {
  id: string;
  citizenId: string;
  photoUrl: string;
  afterPhotoUrl?: string | null;
  description: string;
  category: string | null;
  severity: string | null;
  department: { name: string; email: string } | null;
  status: string;
  aiReasoning?: string;
  aiVerificationReasoning?: string;
  videoUrl?: string;
  createdAt: Timestamp | null;
  isPrimary?: boolean;
  voteCount?: number;
  clusterId?: string;
}

export default function MyComplaints() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // We query by voterIds so the user sees updates for primary clustered issues they reported or voted on
    const q = query(
      collection(db, "issues"),
      where("voterIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });

      // Sort by createdAt descending
      fetchedIssues.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || Date.now();
        const timeB = b.createdAt?.toMillis() || Date.now();
        return timeB - timeA;
      });

      setIssues(fetchedIssues);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching issues:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleResolveAction = async (issueId: string, action: "confirm" | "reject") => {
    if (!user) return;
    setResolvingId(issueId);
    
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/resolve-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ issueId, action })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve issue");
      }
      
    } catch (error) {
      console.error(`Error resolving issue (${action}):`, error);
      alert(`Failed to ${action} the issue. Please try again.`);
    } finally {
      setResolvingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_classification":
        return "bg-yellow-900/20 text-yellow-500 border-yellow-900/30";
      case "classified":
        return "bg-blue-900/20 text-blue-400 border-blue-900/30";
      case "classification_failed":
      case "verification_failed":
        return "bg-red-900/20 text-red-400 border-red-900/30";
      case "pending_citizen_confirmation":
        return "bg-purple-900/20 text-purple-400 border-purple-900/30";
      case "resolved":
        return "bg-green-900/20 text-green-400 border-green-900/30";
      default:
        return "bg-zinc-800/50 text-zinc-300 border-zinc-700/50";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen pb-24" style={{ backgroundColor: "#080808", fontFamily: "var(--font-inter)" }}>
        <main className="max-w-3xl mx-auto px-6 pt-28">

          {/* Page header */}
          <div className="mb-10 pt-6">
            <p className="text-xs uppercase tracking-[0.25em] mb-3 font-medium" style={{ color: "rgba(221,180,99,0.6)" }}>
              My Complaints
            </p>
            <div className="flex items-end justify-between">
              <h1 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
                Your <span style={{ color: "var(--accent-gold)" }}>Reports</span>
              </h1>
              <Link
                href="/report"
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
              >
                <PlusCircle className="w-4 h-4" />
                New Report
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-28 rounded-2xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.03)" }} />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-24 px-4 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Clock className="w-8 h-8 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.15)" }} />
              <h2 className="text-lg font-semibold text-white mb-2">No reports yet</h2>
              <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
                When you spot an issue in the city, report it here to track its progress.
              </p>
              <Link
                href="/report"
                className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#080808",
                }}
              >
                <PlusCircle className="w-4 h-4" />
                Report an Issue
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="p-5 flex flex-col sm:flex-row gap-5 cursor-pointer transition-colors duration-200"
                    style={{ backgroundColor: expandedId === issue.id ? "rgba(255,255,255,0.02)" : "transparent" }}
                    onClick={() => toggleExpand(issue.id)}
                    onMouseEnter={(e) => { if (expandedId !== issue.id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.015)"; }}
                    onMouseLeave={(e) => { if (expandedId !== issue.id) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {/* Thumbnail */}
                    <div className="w-full sm:w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-zinc-900">
                      <img src={issue.photoUrl} alt="Issue" className="w-full h-full object-cover" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className="text-base font-semibold text-white truncate capitalize">
                            {issue.category ? issue.category.replace(/_/g, " ") : "Uncategorized"}
                          </h3>
                          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(issue.status)}`}>
                            {formatStatus(issue.status)}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {issue.description}
                        </p>

                        {/* Clustering badges */}
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {issue.isPrimary && (issue.voteCount || 1) > 1 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ backgroundColor: "rgba(221,180,99,0.08)", color: "rgba(221,180,99,0.7)", border: "1px solid rgba(221,180,99,0.15)" }}>
                              {(issue.voteCount || 1) - 1} others reported this
                            </span>
                          )}
                          {issue.isPrimary === false && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              Merged with existing report
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {issue.createdAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {issue.createdAt.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                          {issue.severity && (
                            <span className="flex items-center gap-1 capitalize">
                              <AlertTriangle className="w-3 h-3" />
                              {issue.severity}
                            </span>
                          )}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.2)" }}>
                          {expandedId === issue.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable section */}
                  {expandedId === issue.id && (
                    <div className="px-5 py-5 border-t" style={{ borderColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(0,0,0,0.2)" }}>

                      {issue.videoUrl && (
                        <div className="mb-5">
                          <p className="text-[10px] uppercase tracking-widest mb-2 font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Video Evidence</p>
                          <div className="w-full rounded-xl overflow-hidden bg-black border" style={{ borderColor: 'var(--border-subtle)' }}>
                            <video src={issue.videoUrl} controls className="w-full h-auto max-h-64 object-contain" />
                          </div>
                        </div>
                      )}

                      <div className="mb-5">
                        <p className="text-[10px] uppercase tracking-widest mb-2 font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Original Photo</p>
                        <div className="w-full rounded-xl overflow-hidden bg-black border flex items-center justify-center" style={{ borderColor: 'var(--border-subtle)', minHeight: '200px' }}>
                          <img src={issue.photoUrl} alt="Original report" className="w-full h-auto max-h-80 object-contain" />
                        </div>
                      </div>

                      {issue.aiReasoning && (
                        <div className="flex items-start gap-3 mb-5">
                          <div className="w-5 h-5 shrink-0 rounded flex items-center justify-center mt-0.5 text-[9px] font-black" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>
                            AI
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-widest">Classification Reasoning</p>
                            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{issue.aiReasoning}</p>
                          </div>
                        </div>
                      )}

                      {issue.status === "pending_citizen_confirmation" && (
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                          <h4 className="text-sm font-semibold text-white mb-4">Repair Verification</h4>

                          {issue.afterPhotoUrl && (
                            <div className="mb-4">
                              <p className="text-[10px] uppercase tracking-widest mb-2 font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>After Photo</p>
                              <div className="w-full rounded-xl overflow-hidden bg-black border flex items-center justify-center" style={{ borderColor: 'var(--border-subtle)', minHeight: '200px' }}>
                                <img src={issue.afterPhotoUrl} alt="After repair" className="w-full h-auto max-h-80 object-contain" />
                              </div>
                            </div>
                          )}

                          {issue.aiVerificationReasoning && (
                            <div className="flex items-start gap-3 mb-5">
                              <div className="w-5 h-5 shrink-0 rounded flex items-center justify-center mt-0.5 text-[9px] font-black" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                                AI
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-widest">Verification Reasoning</p>
                                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{issue.aiVerificationReasoning}</p>
                              </div>
                            </div>
                          )}

                          {issue.citizenId === user?.uid ? (
                            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                              <button
                                onClick={() => handleResolveAction(issue.id, "reject")}
                                disabled={resolvingId === issue.id}
                                className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                                style={{ border: "1px solid rgba(239,68,68,0.3)", color: "rgba(239,68,68,0.8)", backgroundColor: "transparent" }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.06)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                Not fixed — reopen
                              </button>
                              <button
                                onClick={() => handleResolveAction(issue.id, "confirm")}
                                disabled={resolvingId === issue.id}
                                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: "var(--accent-gold)", color: "#080808" }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                {resolvingId === issue.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Confirm Fix
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 p-3 rounded-xl border text-sm font-medium text-center" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)' }}>
                              Waiting for the original reporter to verify this fix.
                            </div>
                          )}
                        </div>
                      )}

                      {issue.department && issue.status !== "pending_citizen_confirmation" && (
                        <div className="mt-4 pt-4 border-t flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                          <div>
                            <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Routed to</p>
                            <p className="text-sm text-white">{issue.department.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
