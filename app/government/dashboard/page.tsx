"use client";

import { useEffect, useState, useRef } from "react";
import GovProtectedRoute from "../../components/GovProtectedRoute";
import { useGovAuth } from "../../lib/gov-auth-context";
import { Shield, LogOut, MapPin, Clock, AlertTriangle, ExternalLink, UploadCloud, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { db, storage } from "../../lib/firebase";
import { collection, query, where, onSnapshot, Timestamp, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { processVerification } from "../../actions/verifyAction";

interface Issue {
  id: string;
  photoUrl: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  autoEscalated?: boolean;
  createdAt: Timestamp | null;
  location: { lat: number; lng: number };
  videoUrl?: string;
  voteCount?: number;
}

const severityValue: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const WorkDoneAction = ({ issueId, department, status, govUser }: { issueId: string, department: string, status: string, govUser: any }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === "pending_citizen_confirmation") {
    return (
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(147,197,253,0.06)", border: "1px solid rgba(147,197,253,0.15)", color: "rgba(147,197,253,0.8)" }}>
          <Clock className="w-4 h-4" />
          Waiting for citizen verification...
        </div>
      </div>
    );
  }

  if (status === "resolved") {
    return (
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", color: "rgba(74,222,128,0.8)" }}>
          <CheckCircle2 className="w-4 h-4" />
          Resolved
        </div>
      </div>
    );
  }

  if (status === "pending_verification") {
    return (
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(221,180,99,0.06)", border: "1px solid rgba(221,180,99,0.15)", color: "rgba(221,180,99,0.8)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          AI verifying repair...
        </div>
      </div>
    );
  }

  if (status === "verification_failed") {
    return (
      <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.8)" }}>
          <AlertTriangle className="w-4 h-4" />
          Verification failed. Please try again.
        </div>
        <button
          onClick={async () => {
            try {
              const token = await govUser.getIdToken();
              await fetch("/api/reopen-issue", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ issueId })
              });
            } catch (err) {
              console.error("Failed to reopen issue", err);
              alert("Failed to retry upload. Please try again.");
            }
          }}
          className="w-full py-2.5 text-sm font-medium rounded-xl transition-all duration-200"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"}
        >
          Retry Upload
        </button>
      </div>
    );
  }

  // Not pending_verification, so it's classified or reopened
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const filename = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const storageRef = ref(storage, `issues/${govUser.uid}/after_${issueId}_${timestamp}_${filename}`);
      
      await uploadBytes(storageRef, file);
      const afterPhotoUrl = await getDownloadURL(storageRef);

      const token = await govUser.getIdToken();
      const res = await fetch("/api/mark-work-done", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ issueId, afterPhotoUrl })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to mark work done");
      }

      // Immediately kick off the server verification process
      await processVerification(issueId);
      
    } catch (error) {
      console.error("Error marking work done:", error);
      alert("Failed to mark work as done. Please try again.");
      setIsUploading(false);
    }
  };

  if (!showUpload) {
    return (
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.09)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
        >
          <UploadCloud className="w-4 h-4" />
          Upload after-photo &amp; mark done
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`group relative w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 overflow-hidden ${
          preview
            ? "border-transparent"
            : "hover:border-white/20"
        }`}
        style={{
          borderColor: preview ? "transparent" : "rgba(255,255,255,0.08)",
          backgroundColor: preview ? "transparent" : "rgba(255,255,255,0.02)"
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="After preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                Change Photo
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Click to upload completed work</p>
          </>
        )}
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setShowUpload(false); setFile(null); setPreview(null); }}
          disabled={isUploading}
          className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!file || isUploading}
          className="flex-[2] flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: !file || isUploading ? "rgba(255,255,255,0.08)" : "#ffffff", color: !file || isUploading ? "rgba(255,255,255,0.4)" : "#080808" }}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Submit for Verification"
          )}
        </button>
      </div>
    </div>
  );
};

export default function GovernmentDashboard() {
  const { department, logout, govUser } = useGovAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");

  const filteredIssues = issues.filter(issue => 
    activeTab === "active" ? issue.status !== "resolved" : issue.status === "resolved"
  );

  useEffect(() => {
    if (!department) return;

    // Fetch issues for this department. Note we added "pending_verification" 
    // so the card stays on the screen after marking done, just with a different status.
    const q = query(
      collection(db, "issues"),
      where("department.name", "==", department),
      where("status", "in", ["classified", "reopened", "pending_verification", "verification_failed", "pending_citizen_confirmation", "resolved"]),
      where("isPrimary", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        fetchedIssues.push({ id: doc.id, ...doc.data() } as Issue);
      });

      fetchedIssues.sort((a, b) => {
        const sevA = severityValue[a.severity?.toLowerCase()] || 0;
        const sevB = severityValue[b.severity?.toLowerCase()] || 0;
        
        if (sevA !== sevB) {
          return sevB - sevA; 
        }
        
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB; 
      });

      setIssues(fetchedIssues);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching department issues:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [department]);

  const getSeverityStyle = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === "high") return "bg-red-900/20 text-red-400 border-red-900/30";
    if (s === "medium") return "bg-yellow-900/20 text-yellow-500 border-yellow-900/30";
    if (s === "low") return "bg-green-900/20 text-green-500 border-green-900/30";
    return "bg-zinc-800/50 text-zinc-400 border-zinc-700/50";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <GovProtectedRoute>
      <div className="min-h-screen pb-20" style={{ backgroundColor: "#080808", fontFamily: "var(--font-inter)" }}>
        <header className="border-b sticky top-0 z-10" style={{ backgroundColor: "rgba(8,8,8,0.92)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" style={{ color: "var(--accent-gold)" }} />
              <div>
                <h1 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>CityFix Gov</h1>
                {!loading && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {department} — {filteredIssues.length} {activeTab === "active" ? "open" : "resolved"} {filteredIssues.length === 1 ? "issue" : "issues"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 self-end sm:self-auto">
              <span className="text-xs font-medium hidden sm:block uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>Authorized Official</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", backgroundColor: "transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex gap-6 mb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <button 
              onClick={() => setActiveTab("active")}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'active' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white/70'}`}
            >
              Active Issues
            </button>
            <button 
              onClick={() => setActiveTab("resolved")}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'resolved' ? 'text-white border-white' : 'text-white/40 border-transparent hover:text-white/70'}`}
            >
              Resolved Issues
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-[400px] rounded-2xl animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.03)" }} />
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-32 px-4">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-4" style={{ color: "rgba(74,222,128,0.5)" }} />
              <h2 className="text-xl font-semibold text-white mb-2">No {activeTab === "active" ? "Open" : "Resolved"} Issues</h2>
              <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
                {activeTab === "active" 
                  ? "Your department's active queue is completely clear." 
                  : "No issues have been fully resolved and verified yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <div className="h-48 relative bg-zinc-800">
                    <img 
                      src={issue.photoUrl} 
                      alt="Issue report" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border shadow-sm ${getSeverityStyle(issue.severity)} capitalize`}>
                        {issue.severity || 'Unknown'} Priority
                      </span>
                      {issue.autoEscalated && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}>
                          <AlertCircle className="w-3 h-3" /> Escalated by community demand
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-md uppercase tracking-wider truncate text-white" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        {issue.category ? issue.category.replace('_', ' ') : "Uncategorized"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0 border
                        ${issue.status === 'pending_verification' 
                          ? 'bg-amber-900/30 text-amber-400 border-amber-900/50' 
                          : 'bg-blue-900/10 text-blue-400 border-blue-900/50'}
                      `}>
                        {formatStatus(issue.status)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white mb-4 line-clamp-3">
                      {issue.description}
                    </p>

                    {issue.videoUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                        <video 
                          src={issue.videoUrl} 
                          controls 
                          className="w-full h-auto bg-black max-h-48"
                        />
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <span className="font-medium text-white/50 flex items-center gap-1.5">
                          {issue.voteCount && issue.voteCount > 1 ? (
                            <>
                              <Users className="w-3.5 h-3.5 text-amber-500" /> 
                              Reported by {issue.voteCount} citizens
                            </>
                          ) : (
                            "Citizen Report"
                          )}
                        </span>
                        {issue.createdAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {issue.createdAt.toDate().toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {issue.location && (
                        <a
                          href={`https://www.google.com/maps?q=${issue.location.lat},${issue.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium transition-all duration-200"
                          style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)", backgroundColor: "transparent" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Open in Maps
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      )}
                    </div>

                    <WorkDoneAction issueId={issue.id} department={department!} status={issue.status} govUser={govUser} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </GovProtectedRoute>
  );
}
