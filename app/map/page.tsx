"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../lib/auth-context";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertTriangle, MapPin, CheckCircle2, ThumbsUp, AlertCircle } from "lucide-react";

interface Issue {
  id: string;
  photoUrl: string;
  category: string;
  severity: string;
  status: string;
  location: { lat: number; lng: number };
  voteCount?: number;
  voterIds?: string[];
  autoEscalated?: boolean;
  isPrimary?: boolean;
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64779e" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#334e87" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#023e58" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
  { featureType: "poi", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#023e58" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3C7680" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b0d5ce" }] },
  { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#023e58" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "transit", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
  { featureType: "transit.line", elementType: "geometry.fill", stylers: [{ color: "#283d6a" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#3a4762" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] }
];

export default function CityHealthMap() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [votingIssueId, setVotingIssueId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Default center (San Francisco roughly)
  const defaultCenter = { lat: 37.7749, lng: -122.4194 };
  const [center, setCenter] = useState(defaultCenter);

  useEffect(() => {
    const q = query(
      collection(db, "issues"),
      where("isPrimary", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedIssues: Issue[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.location?.lat && data.location?.lng) {
          fetchedIssues.push({ id: doc.id, ...data } as Issue);
        }
      });
      setIssues(fetchedIssues);
      
      // Center map on the first issue if we just loaded
      if (fetchedIssues.length > 0 && loading) {
        setCenter({ lat: fetchedIssues[0].location.lat, lng: fetchedIssues[0].location.lng });
      }
      
      setLoading(false);
      setErrorMsg(null);
    }, (error: any) => {
      console.error("Error fetching map issues:", error);
      if (error.code === 'permission-denied') {
        setErrorMsg("Permission Denied: You need to sign in, or update Firestore rules to allow public reads.");
      } else {
        setErrorMsg("Failed to load map data.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loading]);

  const getMarkerIcon = (severity: string, status: string) => {
    if (status === 'resolved') {
      return {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: '#9CA3AF',
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: '#4B5563',
        scale: 1.5,
        anchor: { x: 12, y: 22 } as any,
      };
    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
        <style>
          @keyframes pulse {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          .glow {
            fill: #EF4444;
            animation: pulse 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: 40px 60px;
          }
          .pin {
            fill: #EF4444;
            stroke: #FFFFFF;
            stroke-width: 1;
          }
        </style>
        <circle cx="40" cy="60" r="10" class="glow" />
        <path class="pin" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" transform="translate(40, 60) scale(2.5) translate(-12, -22)"/>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`,
      scaledSize: { width: 80, height: 80 } as any,
      anchor: { x: 40, y: 60 } as any,
    };
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleVote = async (issue: Issue) => {
    if (!user) return;

    try {
      setVotingIssueId(issue.id);
      const token = await user.getIdToken();
      const res = await fetch('/api/vote-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ issueId: issue.id })
      });

      if (!res.ok) throw new Error('Failed to vote');
      const data = await res.json();
      
      setIssues(current => current.map(i => {
        if (i.id === issue.id) {
          return {
            ...i,
            voteCount: data.voteCount,
            voterIds: [...(i.voterIds || []), user.uid],
            ...(data.escalatedSeverity ? { severity: data.escalatedSeverity, autoEscalated: true } : {})
          };
        }
        return i;
      }));
      
      if (selectedIssue && selectedIssue.id === issue.id) {
        setSelectedIssue(prev => prev ? {
          ...prev,
          voteCount: data.voteCount,
          voterIds: [...(prev.voterIds || []), user.uid],
          ...(data.escalatedSeverity ? { severity: data.escalatedSeverity, autoEscalated: true } : {})
        } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVotingIssueId(null);
    }
  };

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Google Maps API Key Missing</h2>
        <p className="text-zinc-400 max-w-md">
          Please add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code>.env.local</code> file to enable the map view. Ensure the Maps JavaScript API is enabled in your Google Cloud project.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative" style={{ backgroundColor: "#080808" }}>
      {/* Header Overlay */}
      <div className="absolute top-0 inset-x-0 z-10 p-4 sm:p-6 pointer-events-none" style={{ fontFamily: 'var(--font-inter)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <Link 
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-white/5 shadow-lg"
            style={{ backgroundColor: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="px-4 py-1.5 rounded-full" style={{ backgroundColor: "rgba(8,8,8,0.85)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h1 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2" style={{ color: "var(--accent-gold)" }}>
              <MapPin className="w-3.5 h-3.5" />
              City Health Map
            </h1>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .gm-style-iw-c {
          background-color: var(--bg-surface) !important;
          border: 1px solid var(--border-subtle) !important;
          border-radius: 20px !important;
          padding: 16px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5) !important;
        }
        .gm-style-iw-tc::after {
          background: var(--bg-surface) !important;
          border-bottom: 1px solid var(--border-subtle) !important;
          border-right: 1px solid var(--border-subtle) !important;
        }
        .gm-style-iw-d {
          overflow: hidden !important;
        }
        .gm-ui-hover-effect {
          top: 8px !important;
          right: 8px !important;
          background: rgba(255,255,255,0.1) !important;
          border-radius: 50% !important;
        }
        .gm-ui-hover-effect > span {
          background-color: var(--text-secondary) !important;
        }
      `}} />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-sm font-medium">Loading civic data...</p>
        </div>
      ) : (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultZoom={13}
            center={center}
            onCenterChanged={(ev) => setCenter(ev.detail.center)}
            disableDefaultUI={true}
            zoomControl={true}
            styles={darkMapStyle}
            gestureHandling="greedy"
          >
            {issues.map((issue) => (
              <Marker
                key={issue.id}
                position={issue.location}
                icon={getMarkerIcon(issue.severity, issue.status)}
                onClick={() => setSelectedIssue(issue)}
              />
            ))}

            {selectedIssue && (
              <InfoWindow
                position={selectedIssue.location}
                onCloseClick={() => setSelectedIssue(null)}
              >
                <div className="p-1 max-w-[240px] text-white" style={{ fontFamily: 'var(--font-inter)' }}>
                  <div className="w-full h-32 rounded-xl overflow-hidden bg-zinc-800 mb-3 relative border" style={{ borderColor: 'var(--border-subtle)' }}>
                    <img 
                      src={selectedIssue.photoUrl} 
                      alt="Issue" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/80 text-white rounded-full backdrop-blur-sm border" style={{ borderColor: 'var(--border-subtle)' }}>
                        {selectedIssue.severity} priority
                      </span>
                      {selectedIssue.autoEscalated && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}>
                          <AlertCircle className="w-3 h-3" /> Escalated
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg capitalize mb-1" style={{ fontFamily: 'var(--font-playfair)' }}>
                    {selectedIssue.category.replace('_', ' ')}
                  </h3>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-gold)' }}></div>
                      {formatStatus(selectedIssue.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--text-secondary)' }}></div>
                      <span className="text-white font-bold">{selectedIssue.voteCount || 1}</span> {((selectedIssue.voteCount || 1) === 1) ? 'person' : 'people'} reported this
                    </div>
                  </div>

                  {selectedIssue.status !== 'resolved' && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      {!user ? (
                        <Link 
                          href="/" 
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-colors hover:brightness-110 text-zinc-900"
                          style={{ backgroundColor: 'var(--accent-gold)' }}
                        >
                          Sign in to report this too
                        </Link>
                      ) : (selectedIssue.voterIds || []).includes(user.uid) ? (
                        <button 
                          disabled
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl cursor-not-allowed"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          You reported this too
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleVote(selectedIssue)}
                          disabled={votingIssueId === selectedIssue.id}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-colors disabled:opacity-50 hover:brightness-110 text-zinc-900"
                          style={{ backgroundColor: 'var(--accent-gold)' }}
                        >
                          {votingIssueId === selectedIssue.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ThumbsUp className="w-3.5 h-3.5" />
                          )}
                          I have this too
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      )}
      
      {/* Empty State / Error Overlay */}
      {!loading && errorMsg ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="backdrop-blur-sm p-6 rounded-2xl text-center max-w-sm pointer-events-auto" style={{ backgroundColor: "rgba(8,8,8,0.9)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(239,68,68,0.8)" }} />
            <h3 className="text-base font-bold text-white mb-2">Error Loading Map</h3>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {errorMsg}
            </p>
          </div>
        </div>
      ) : !loading && issues.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="backdrop-blur-sm p-6 rounded-2xl text-center max-w-sm pointer-events-auto" style={{ backgroundColor: "rgba(8,8,8,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(74,222,128,0.6)" }} />
            <h3 className="text-base font-bold text-white mb-2">No Open Issues</h3>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              The map is clear. All reported issues have been resolved.
            </p>
          </div>
        </div>
      )}
      </div>
  );
}
