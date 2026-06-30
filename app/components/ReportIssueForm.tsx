"use client";

import { useState, useRef } from "react";
import { useAuth } from "../lib/auth-context";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { categoryToDepartment } from "../lib/departments";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MapPin, Image as ImageIcon, UploadCloud, CheckCircle2, Loader2, AlertCircle, Video, X, Map as MapIcon } from "lucide-react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";

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

export default function ReportIssueForm() {
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.0060 }); // default NYC

  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [classificationResult, setClassificationResult] = useState<{ category: string; department: string; reasoning: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 50 * 1024 * 1024) {
        setErrorMessage("Video file size must be less than 50MB");
        return;
      }
      setVideoFile(selected);
      const url = URL.createObjectURL(selected);
      setVideoPreview(url);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleGetLocation = () => {
    setLocationStatus("loading");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setMapCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("success");
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationStatus("error");
        setErrorMessage("Failed to get your location. Please ensure location permissions are granted.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleOpenMap = () => {
    setShowMap(true);
    // If no location is set, try to grab GPS to center the map nicely
    if (!location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // ignore error, just use default center
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!file) {
      setErrorMessage("Please select an image.");
      return;
    }
    if (!location) {
      setErrorMessage("Please capture your location.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please provide a description.");
      return;
    }

    setSubmitStatus("submitting");
    setErrorMessage("");

    try {
      // 1. Upload image to Firebase Storage
      const timestamp = Date.now();
      const filename = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const storageRef = ref(storage, `issues/${user.uid}/${timestamp}_${filename}`);
      
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      let videoUrl = null;
      if (videoFile) {
        const videoFilename = videoFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const videoStorageRef = ref(storage, `issues/${user.uid}/video_${timestamp}_${videoFilename}`);
        await uploadBytes(videoStorageRef, videoFile);
        videoUrl = await getDownloadURL(videoStorageRef);
      }

      // 2. Create Firestore document
      const docRef = await addDoc(collection(db, "issues"), {
        citizenId: user.uid,
        photoUrl,
        ...(videoUrl ? { videoUrl } : {}),
        description: description.trim(),
        location,
        category: null,
        severity: null,
        department: null,
        status: "pending_classification",
        voterIds: [user.uid],
        createdAt: serverTimestamp(),
      });

      // 3. Call classification API
      try {
        const response = await fetch("/api/classify-issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueId: docRef.id, photoUrl, description: description.trim() }),
        });

        if (!response.ok) {
          throw new Error(`Classification API failed with status ${response.status}`);
        }

        const classification = await response.json();

        setClassificationResult({
          category: classification.category,
          department: classification.department.name,
          reasoning: classification.reasoning
        });

      } catch (classificationError) {
        console.error("Classification failed:", classificationError);
        throw new Error("Gemini AI experiencing high demand right now, try again in a moment");
      }

      setSubmitStatus("success");
      
      // Reset form fields after 5 seconds to give time to read
      setTimeout(() => {
        setSubmitStatus("idle");
        setFile(null);
        setPreview(null);
        setVideoFile(null);
        setVideoPreview(null);
        setDescription("");
        setLocation(null);
        setLocationStatus("idle");
        setClassificationResult(null);
      }, 5000);

    } catch (error: any) {
      console.error("Error submitting issue:", error);
      setSubmitStatus("error");
      setErrorMessage(error.message || "An error occurred while submitting the issue.");
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300 rounded-[20px] shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(221, 180, 99, 0.1)', color: 'var(--accent-gold)' }}>
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>Issue Reported Successfully</h3>
        
        {classificationResult ? (
          <div className="mt-4 p-4 rounded-xl text-left max-w-sm w-full" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Assigned Category:</p>
            <p className="font-medium text-white capitalize mb-3">{classificationResult.category.replace('_', ' ')}</p>
            
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Routed to:</p>
            <p className="font-medium text-white">{classificationResult.department}</p>
          </div>
        ) : (
          <p className="max-w-sm mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Thank you for helping improve the city. Your report has been submitted but is currently pending manual classification.
          </p>
        )}
      </div>
    );
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.85)" }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Image Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white">
            Photo of the Issue <span className="text-red-500">*</span>
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative w-full h-48 sm:h-64 rounded-xl border border-dashed 
              transition-all duration-200 cursor-pointer overflow-hidden
              flex flex-col items-center justify-center gap-2 group
            `}
            style={preview 
              ? { border: '1px solid transparent', backgroundColor: 'var(--bg-base)' }
              : { border: '1px dashed var(--border-subtle)', backgroundColor: 'var(--bg-base)' }
            }
          >
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-medium flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    <UploadCloud className="w-4 h-4" /> Change Photo
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center transition-colors mb-2 shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <ImageIcon className="w-8 h-8 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white group-hover:text-[#DDB463] transition-colors">Click to upload photo</p>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>High quality JPEG or PNG up to 10MB</p>
                </div>
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
        </div>

        {/* Video Upload (Optional) */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white flex items-center justify-between">
            <span>Video Evidence <span style={{ color: 'var(--text-secondary)' }}>(Optional)</span></span>
            {videoPreview && (
              <button 
                type="button" 
                onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                className="text-xs flex items-center gap-1 hover:text-red-400 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-3 h-3" /> Remove
              </button>
            )}
          </label>
          <div 
            onClick={() => !videoPreview && videoInputRef.current?.click()}
            className={`
              relative w-full h-32 sm:h-48 rounded-xl border border-dashed 
              transition-all duration-200 ${!videoPreview ? 'cursor-pointer hover:bg-white/5' : ''} overflow-hidden
              flex flex-col items-center justify-center gap-2 group
            `}
            style={videoPreview 
              ? { border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-base)' }
              : { border: '1px dashed var(--border-subtle)', backgroundColor: 'var(--bg-base)' }
            }
          >
            {videoPreview ? (
              <video src={videoPreview} controls className="w-full h-full object-contain bg-black" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors mb-1 shadow-sm" style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <Video className="w-5 h-5 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-white group-hover:text-[#DDB463] transition-colors">Click to upload video</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>MP4, WebM up to 50MB</p>
                </div>
              </>
            )}
            <input 
              ref={videoInputRef}
              type="file" 
              accept="video/*" 
              onChange={handleVideoChange} 
              className="hidden" 
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label htmlFor="description" className="block text-sm font-medium text-white">
            Description <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Describe the issue clearly (e.g., deep pothole on main street)..."
              className="w-full rounded-xl border px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent-gold)'; e.target.style.boxShadow = '0 0 0 1px var(--accent-gold)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
            />
            <div className="absolute bottom-3 right-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {description.length}/500
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white">
            Location <span className="text-red-500">*</span>
          </label>
          
          {showMap ? (
            <div className="w-full rounded-xl overflow-hidden border flex flex-col" style={{ borderColor: 'var(--border-subtle)', height: '350px' }}>
              <div className="flex-1 relative">
                <Map
                  zoom={15}
                  center={mapCenter}
                  onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
                  onClick={(ev) => {
                    if (ev.detail.latLng) {
                      setLocation(ev.detail.latLng);
                      setLocationStatus("success");
                    }
                  }}
                  styles={darkMapStyle}
                  disableDefaultUI={true}
                  clickableIcons={false}
                >
                  {location && <Marker position={location} />}
                </Map>
              </div>
              <div className="bg-zinc-900/90 backdrop-blur-md p-3 flex items-center justify-between border-t shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs text-white">
                  {location ? "Location selected." : "Click map to drop a pin."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMap(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMap(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg"
                    style={{ backgroundColor: 'var(--accent-gold)', color: '#000' }}
                  >
                    Confirm Location
                  </button>
                </div>
              </div>
            </div>
          ) : locationStatus === "success" ? (
            <div className="w-full flex items-center justify-between p-4 rounded-xl border" style={{ backgroundColor: 'rgba(221, 180, 99, 0.05)', borderColor: 'rgba(221, 180, 99, 0.2)' }}>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                <div>
                  <p className="text-sm font-medium text-white">Location captured</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="text-xs font-medium hover:underline px-2 py-1 rounded-md transition-colors"
                  style={{ color: 'var(--accent-gold)' }}
                >
                  Update GPS
                </button>
                <span className="text-xs" style={{ color: 'var(--border-subtle)' }}>|</span>
                <button
                  type="button"
                  onClick={handleOpenMap}
                  className="text-xs font-medium hover:underline px-2 py-1 rounded-md transition-colors"
                  style={{ color: 'var(--accent-gold)' }}
                >
                  Map
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationStatus === "loading"}
                className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300 text-sm font-medium text-white disabled:opacity-70 disabled:cursor-not-allowed group"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.backgroundColor = 'var(--bg-base)'; }}
              >
                {locationStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-gold)' }} />
                    Fetching location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 group-hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }} />
                    Use my current location
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleOpenMap}
                className="flex-[0.5] flex items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300 text-sm font-medium text-white group"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.backgroundColor = 'var(--bg-base)'; }}
              >
                <MapIcon className="w-4 h-4 group-hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }} />
                Select on Map
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={submitStatus === "submitting"}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-full font-semibold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
            style={{
              backgroundColor: submitStatus === "submitting" ? "rgba(255,255,255,0.08)" : "#ffffff",
              color: submitStatus === "submitting" ? "rgba(255,255,255,0.4)" : "#080808",
            }}
          >
            {submitStatus === "submitting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading & Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      </form>
    </div>
    </APIProvider>
  );
}
