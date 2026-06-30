"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import ReportIssueForm from "../components/ReportIssueForm";

export default function ReportPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen pb-24" style={{ backgroundColor: "#080808", fontFamily: "var(--font-inter)" }}>
        <main className="max-w-2xl mx-auto px-6 pt-28">
          <div className="mb-8 pt-6">
            <p className="text-xs uppercase tracking-[0.25em] mb-3 font-medium" style={{ color: "rgba(221,180,99,0.6)" }}>Report Issue</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
              Spot a <span style={{ color: "var(--accent-gold)" }}>Problem</span>
            </h1>
          </div>
          <ReportIssueForm />
        </main>
      </div>
    </ProtectedRoute>
  );
}
